import { createStore } from 'zustand/vanilla'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { storeHydration, createAppState } from './index'
import { attachPersistence } from './persistence'
import type { AppStorage } from './indexeddb-storage'
import { model, result, session } from '@/test/fixtures'

interface MemoryHarness {
    storage: AppStorage
    records: () => Record<string, string>
    commits: () => Array<{ puts: string[]; deletes: string[] }>
    failCommit: (message: string) => void
    failRead: (message: string) => void
}

function memoryStorage(initial: Record<string, string> = {}): MemoryHarness {
    let records: Record<string, string> = { ...initial }
    const commits: Array<{ puts: string[]; deletes: string[] }> = []
    let commitError: string | null = null
    let readError: string | null = null
    const storage: AppStorage = {
        getItem: async (name) => records[name] ?? null,
        setItem: async (name, value) => {
            records[name] = value
        },
        removeItem: async (name) => {
            delete records[name]
        },
        readMany: async (keys) => {
            if (readError) throw new Error(readError)
            return Object.fromEntries(
                keys.map((key) => [key, records[key] ?? null])
            )
        },
        commit: async (puts, deletes) => {
            if (commitError) throw new Error(commitError)
            commits.push({ puts: Object.keys(puts), deletes: [...deletes] })
            records = { ...records, ...puts }
            for (const key of deletes) delete records[key]
        },
        dump: async () => ({ ...records })
    }
    return {
        storage,
        records: () => records,
        commits: () => commits,
        failCommit: (message) => {
            commitError = message
        },
        failRead: (message) => {
            readError = message
        }
    }
}

afterEach(() => vi.useRealTimers())

async function freshStore(harness: MemoryHarness) {
    await storeHydration
    const store = createStore(createAppState)
    const persistence = attachPersistence(store, harness.storage)
    await persistence.hydrated
    return { store, persistence, harness }
}

describe('durable storage', () => {
    it('does not write during streaming-only updates', async () => {
        const harness = memoryStorage()
        const { store, persistence, harness: h } = await freshStore(harness)
        store.setState({ streamingData: { r: { response: 'live' } } })
        store.setState({ isProcessing: true })
        store.setState({
            messageQueue: [{ id: 'q', prompt: 'Hi' }]
        })
        await persistence.flush()
        expect(h.commits()).toHaveLength(0)
        persistence.dispose()
    })

    it('writes per-session records plus meta, not one giant blob', async () => {
        vi.useFakeTimers()
        const harness = memoryStorage()
        const { store, persistence, harness: h } = await freshStore(harness)
        store.setState({ models: [model()] })
        const first = session({ a: [result()] })
        const second = session({ b: [result('r2')] }, { id: 's2' })
        store.setState({ sessions: [first, second] })
        await vi.advanceTimersByTimeAsync(200)
        await persistence.flush()
        expect(h.commits()).toHaveLength(1)
        const keys = h.commits()[0].puts
        expect(keys).toContain('nillm-meta')
        expect(keys).toContain('nillm-session:s')
        expect(keys).toContain('nillm-session:s2')
        const meta = JSON.parse(h.records()['nillm-meta'])
        expect(meta.schemaVersion).toBe(1)
        expect(meta.sessionIds.sort()).toEqual(['s', 's2'])
        expect(JSON.parse(h.records()['nillm-session:s']).id).toBe('s')
        persistence.dispose()
    })

    it('only rewrites the session that changed', async () => {
        vi.useFakeTimers()
        const harness = memoryStorage()
        const { store, persistence, harness: h } = await freshStore(harness)
        const first = session({ a: [result()] })
        const second = session({ b: [result('r2')] }, { id: 's2' })
        store.setState({ sessions: [first, second] })
        await vi.advanceTimersByTimeAsync(200)
        await persistence.flush()
        expect(h.commits()).toHaveLength(1)

        // Only the second session record changes; the first keeps its ref.
        store.setState({
            sessions: [first, { ...second, title: 'Renamed' }]
        })
        await vi.advanceTimersByTimeAsync(200)
        await persistence.flush()
        expect(h.commits()).toHaveLength(2)
        expect(h.commits()[1].puts).toEqual(['nillm-session:s2'])
        persistence.dispose()
    })

    it('migrates legacy snapshots atomically and removes the old key', async () => {
        const legacy = JSON.stringify({
            state: {
                models: [model()],
                activeModelIds: ['a', 'missing'],
                activeSessionId: 'missing-session',
                sessions: [session({ a: [result()] })],
                isProcessing: true,
                messageQueue: [{ id: 'old', prompt: 'old' }]
            },
            version: 0
        })
        const harness = memoryStorage({ 'nillm-storage': legacy })
        const { store, persistence, harness: h } = await freshStore(harness)
        expect(store.getState().models[0].id).toBe('a')
        expect(store.getState().activeModelIds).toEqual(['a'])
        expect(store.getState().activeSessionId).toBeNull()
        expect(store.getState().isProcessing).toBe(false)
        expect(store.getState().messageQueue).toEqual([])
        expect(h.records()['nillm-storage']).toBeUndefined()
        expect(h.records()['nillm-meta']).toBeDefined()
        expect(store.getState().persistenceState).toBe('ready')
        persistence.dispose()
    })

    it('keeps the legacy key when migration data is invalid', async () => {
        const legacy = JSON.stringify({
            state: { models: ['invalid'] },
            version: 0
        })
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const harness = memoryStorage({ 'nillm-storage': legacy })
        const { store, persistence, harness: h } = await freshStore(harness)
        expect(store.getState().persistenceState).toBe('error')
        expect(h.records()['nillm-storage']).toBe(legacy)
        persistence.dispose()
    })

    it('rejects torn workspaces with missing task records', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const meta = JSON.stringify({
            schemaVersion: 1,
            state: { models: [model()] },
            sessionIds: [],
            runIds: ['r1']
        })
        const manifest = JSON.stringify({
            id: 'r1',
            name: 'Run',
            testSet: {
                id: 'ts',
                name: 'T',
                cases: [{ id: 'c1', prompt: 'p' }],
                createdAt: 1
            },
            models: [
                {
                    id: 'a',
                    name: 'A',
                    provider: 'openai',
                    mode: 'chat',
                    endpointFingerprint: 'f'
                }
            ],
            variants: [{ id: 'default', name: 'Default', overrides: {} }],
            configByModelVariant: {
                a: {
                    default: {
                        requested: {
                            temperature: 0.7,
                            maxTokens: 10,
                            topP: 0.9
                        },
                        effective: {},
                        sources: {},
                        excludedParameters: []
                    }
                }
            },
            repetitions: 1,
            maxConcurrent: 1,
            createdAt: 1,
            taskIds: ['t1']
        })
        const harness = memoryStorage({
            'nillm-meta': meta,
            'nillm-run:r1': manifest
            // nillm-run-state:r1 and nillm-task:r1:t1 are missing.
        })
        const { store, persistence } = await freshStore(harness)
        expect(store.getState().persistenceState).toBe('error')
        expect(store.getState().models).toHaveLength(2) // defaults untouched
        persistence.dispose()
    })

    it('surfaces read failures and disables saving', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const harness = memoryStorage()
        harness.failRead('IndexedDB is gone')
        const { store, persistence, harness: h } = await freshStore(harness)
        expect(store.getState().persistenceState).toBe('error')
        expect(store.getState().persistenceError).toMatchObject({
            operation: 'read'
        })
        store.setState({ models: [model()] })
        await persistence.flush()
        expect(h.commits()).toHaveLength(0)
        persistence.dispose()
    })

    it('keeps dirty data after a failed write and persists the latest on retry', async () => {
        vi.useFakeTimers()
        const harness = memoryStorage()
        const { store, persistence, harness: h } = await freshStore(harness)
        h.failCommit('disk full')
        store.setState({ models: [model()] })
        await vi.advanceTimersByTimeAsync(200)
        await persistence.flush()
        expect(store.getState().persistenceError).toMatchObject({
            operation: 'write'
        })
        // Further durable change while broken.
        store.setState({ language: 'zh' })
        // Storage recovers; the next flush writes the latest state.
        h.failCommit('')
        h.commits().length = 0
        await persistence.flush()
        expect(h.commits()).toHaveLength(1)
        const meta = JSON.parse(h.records()['nillm-meta'])
        expect(meta.state.language).toBe('zh')
        expect(store.getState().persistenceState).toBe('ready')
        persistence.dispose()
    })

    it('encodes record keys so colons in IDs cannot collide', async () => {
        vi.useFakeTimers()
        const harness = memoryStorage()
        const { store, persistence, harness: h } = await freshStore(harness)
        const tricky = session({ a: [result()] }, { id: 'run:1:task' })
        store.setState({ sessions: [tricky] })
        await vi.advanceTimersByTimeAsync(200)
        await persistence.flush()
        const written = h
            .commits()[0]
            .puts.find(
                (key) =>
                    key.startsWith('nillm-session:') && key !== 'nillm-meta'
            )
        expect(written).toBe('nillm-session:run%3A1%3Atask')
        persistence.dispose()
    })
})
