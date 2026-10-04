import { createStore } from 'zustand/vanilla'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAppStore, storeHydration } from './index'
import { attachPersistence } from './persistence'
import { model, result, session } from '@/test/fixtures'

afterEach(() => vi.useRealTimers())
describe('durable storage', () => {
    it('does not serialize or write history during streaming-only updates', async () => {
        await storeHydration
        const store = createStore(() => ({ ...useAppStore.getState() }))
        const storage = {
            getItem: vi.fn().mockResolvedValue(null),
            setItem: vi.fn().mockResolvedValue(undefined),
            removeItem: vi.fn()
        }
        const persistence = attachPersistence(store, storage)
        await persistence.hydrated
        const stringify = vi.spyOn(JSON, 'stringify')
        for (let index = 0; index < 500; index++)
            store.setState({
                streamingData: { r: { response: String(index) } }
            })
        await persistence.flush()
        expect(stringify).not.toHaveBeenCalled()
        expect(storage.setItem).not.toHaveBeenCalled()
        persistence.dispose()
    })
    it('coalesces durable changes and excludes queue, actions and live output', async () => {
        await storeHydration
        vi.useFakeTimers()
        const store = createStore(() => ({ ...useAppStore.getState() }))
        const storage = {
            getItem: vi.fn().mockResolvedValue(null),
            setItem: vi.fn().mockResolvedValue(undefined),
            removeItem: vi.fn()
        }
        const persistence = attachPersistence(store, storage)
        await persistence.hydrated
        store.setState({ models: [model()] })
        store.setState({
            sessions: [session({ a: [result()] })],
            streamingData: { r: { response: 'live' } },
            isProcessing: true,
            messageQueue: [{ id: 'q', prompt: 'Hi' }]
        })
        await vi.advanceTimersByTimeAsync(200)
        await persistence.flush()
        expect(storage.setItem).toHaveBeenCalledOnce()
        const saved = JSON.parse(storage.setItem.mock.calls[0][1])
        expect(saved.state.sessions).toHaveLength(1)
        expect(saved.state).not.toHaveProperty('streamingData')
        expect(saved.state).not.toHaveProperty('messageQueue')
        expect(saved.state).not.toHaveProperty('isProcessing')
        expect(saved.state).not.toHaveProperty('addModel')
        persistence.dispose()
    })
    it('restores legacy Zustand snapshots without restoring a stuck processing flag', async () => {
        await storeHydration
        const store = createStore(() => ({ ...useAppStore.getState() }))
        const storage = {
            getItem: vi.fn().mockResolvedValue(
                JSON.stringify({
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
            ),
            setItem: vi.fn(),
            removeItem: vi.fn()
        }
        const persistence = attachPersistence(store, storage)
        await persistence.hydrated
        expect(store.getState().models[0].id).toBe('a')
        expect(store.getState().activeModelIds).toEqual(['a'])
        expect(store.getState().activeSessionId).toBeNull()
        expect(store.getState().isProcessing).toBe(false)
        expect(store.getState().messageQueue).toEqual([])
        persistence.dispose()
    })
    it('rejects malformed snapshots atomically', async () => {
        await storeHydration
        const store = createStore(() => ({ ...useAppStore.getState() }))
        const original = store.getState().models
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const persistence = attachPersistence(store, {
            getItem: async () =>
                JSON.stringify({
                    state: { models: ['invalid'], sessions: [] }
                }),
            setItem: () => {},
            removeItem: () => {}
        })
        await persistence.hydrated
        expect(store.getState().models).toBe(original)
        persistence.dispose()
    })
})
