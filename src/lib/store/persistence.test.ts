import { createStore } from 'zustand/vanilla'
import { create } from 'zustand'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { storeHydration, createAppState } from './index'
import { attachPersistence, type PersistenceController } from './persistence'
import { indexedDBStorage } from './indexeddb-storage'
import { model, result, session } from '@/test/fixtures'
import { planExperiment } from '@/features/experiments/domain/plan'
import { parseBackup } from '@/lib/validation'
import type { BenchmarkResult, ExperimentRun } from '@/lib/types'

const controllers: PersistenceController[] = []

beforeEach(async () => {
    await storeHydration
    await indexedDBStorage.commit(
        {},
        Object.keys(await indexedDBStorage.dump())
    )
})

afterEach(async () => {
    for (const controller of controllers) {
        await controller.flush()
        controller.dispose()
    }
    controllers.length = 0
    vi.restoreAllMocks()
})

async function freshStore(bound = false) {
    const store = bound ? create(createAppState) : createStore(createAppState)
    const persistence = attachPersistence(store, indexedDBStorage)
    controllers.push(persistence)
    await persistence.hydrated
    return { store, persistence }
}

/** Abort the real fake-indexeddb transaction after its native requests queue. */
function abortNextWrite() {
    const put = IDBObjectStore.prototype.put
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementationOnce(function (
        this: IDBObjectStore,
        value,
        key
    ) {
        const request = put.call(this, value, key)
        const transaction = this.transaction
        queueMicrotask(() => transaction.abort())
        return request
    })
}

async function plannedRun(id = 'run', taskId?: string): Promise<ExperimentRun> {
    const run = await planExperiment(
        {
            name: 'Run',
            testSet: {
                id: 'tests',
                name: 'Tests',
                createdAt: 1,
                cases: taskId
                    ? [{ id: 'c1', prompt: 'One' }]
                    : [
                          { id: 'c1', prompt: 'One' },
                          { id: 'c2', prompt: 'Two' }
                      ]
            },
            modelIds: ['a'],
            repetitions: 1,
            overrides: {},
            variants: [{ id: 'default', name: 'Default', overrides: {} }]
        },
        [model()],
        { temperature: 0.7, maxTokens: 4096, topP: 0.9 },
        1
    )
    run.id = id
    if (taskId) {
        run.tasks[0].id = taskId
        run.pendingTaskIds = [taskId]
    }
    return run
}

function attempt(run: ExperimentRun, index: number): BenchmarkResult {
    const task = run.tasks[index]
    return {
        id: `result-${index}`,
        modelId: 'a',
        prompt: run.testSet.cases[index].prompt,
        response: '',
        metrics: { ttft: 0, tps: 0, totalDuration: 0, tokenCount: 0 },
        timestamp: 1,
        status: 'pending',
        experiment: { runId: run.id, taskId: task.id, attempt: 1 }
    }
}

describe('durable IndexedDB workspaces', () => {
    it('never persists streaming data, processing locks or the ordinary queue', async () => {
        const { store, persistence } = await freshStore()
        const original = await indexedDBStorage.dump()
        store.setState({
            streamingData: { r: { response: 'live' } },
            isProcessing: true,
            isJudging: true,
            messageQueue: [{ id: 'q', prompt: 'Hi' }]
        })
        await persistence.flush()
        expect(await indexedDBStorage.dump()).toEqual(original)
        const { store: restored } = await freshStore()
        expect(restored.getState().streamingData).toEqual({})
        expect(restored.getState().messageQueue).toEqual([])
        expect(restored.getState().isProcessing).toBe(false)
        expect(restored.getState().isJudging).toBe(false)
    })

    it('roundtrips sessions and updates without dropping untouched records', async () => {
        const { store, persistence } = await freshStore()
        const first = session({ a: [result()] })
        const second = session({ b: [result('r2')] }, { id: 's2' })
        store.setState({
            models: [model()],
            sessions: [first, second],
            activeSessionId: 's2'
        })
        await persistence.flush()
        store.setState({ sessions: [first, { ...second, title: 'Renamed' }] })
        await persistence.flush()
        const { store: restored } = await freshStore()
        expect(restored.getState().sessions).toEqual([
            first,
            { ...second, title: 'Renamed' }
        ])
        expect(restored.getState().activeSessionId).toBe('s2')
    })

    it('migrates legacy data and repairs references without restoring transient jobs', async () => {
        const legacy = JSON.stringify({
            state: {
                models: [
                    { ...model(), config: { temperature: 0, maxConcurrent: 8 } }
                ],
                activeModelIds: ['a', 'missing'],
                activeSessionId: 'missing-session',
                sessions: [session({ a: [result()] })],
                language: 'ja',
                theme: 'dark',
                isProcessing: true,
                messageQueue: [{ id: 'old', prompt: 'old' }]
            },
            version: 0
        })
        await indexedDBStorage.setItem('nillm-storage', legacy)
        const { store } = await freshStore()
        expect(store.getState().models[0].config).toEqual({ temperature: 0 })
        expect(store.getState().activeModelIds).toEqual(['a'])
        expect(store.getState().activeSessionId).toBeNull()
        expect(store.getState().language).toBe('ja')
        expect(store.getState().theme).toBe('dark')
        expect(store.getState().messageQueue).toEqual([])
        expect(store.getState().isProcessing).toBe(false)
        expect(await indexedDBStorage.getItem('nillm-storage')).toBeNull()
        const { store: restored } = await freshStore()
        expect(restored.getState().sessions).toEqual(store.getState().sessions)
        expect(restored.getState().language).toBe('ja')
    })

    it.each(['invalid data', 'aborted migration'])(
        'keeps legacy records on %s',
        async (failure) => {
            const legacy = JSON.stringify({
                state: {
                    models: failure === 'invalid data' ? ['invalid'] : [model()]
                },
                version: 0
            })
            await indexedDBStorage.setItem('nillm-storage', legacy)
            if (failure === 'aborted migration') abortNextWrite()
            const { store, persistence } = await freshStore()
            expect(store.getState().persistenceState).toBe('error')
            await persistence.flush()
            expect(await indexedDBStorage.dump()).toEqual({
                'nillm-storage': legacy
            })
        }
    )

    it('rejects a missing task without loading or overwriting a partial workspace', async () => {
        const { store, persistence } = await freshStore()
        const run = await plannedRun()
        store.setState({ models: [model()], experimentRuns: [run] })
        await persistence.flush()
        await indexedDBStorage.removeItem(
            `nillm-task:${encodeURIComponent(run.id)}:${encodeURIComponent(run.tasks[0].id)}`
        )
        const original = await indexedDBStorage.dump()
        const { store: restored, persistence: recovery } = await freshStore()
        expect(restored.getState().persistenceError?.operation).toBe('read')
        expect(restored.getState().experimentRuns).toEqual([])
        restored.setState({ language: 'zh' })
        await recovery.flush()
        expect(await indexedDBStorage.dump()).toEqual(original)
    })

    it('keeps and persists records created while storage reads were failing', async () => {
        const { store, persistence } = await freshStore()
        store.setState({
            models: [model()],
            sessions: [session({ a: [result()] })]
        })
        await persistence.flush()
        vi.spyOn(indexedDBStorage, 'readMany').mockRejectedValueOnce(
            new Error('Read unavailable')
        )
        const { store: restored, persistence: recovery } = await freshStore()
        expect(restored.getState().persistenceError?.operation).toBe('read')
        const created = restored.getState().createSession('Offline', ['a'])
        await recovery.retry()
        expect(restored.getState().sessions.map((s) => s.id)).toEqual([
            's',
            created
        ])
        await recovery.flush()
        const { store: rebooted } = await freshStore()
        expect(rebooted.getState().sessions.map((s) => s.id)).toEqual([
            's',
            created
        ])
    })

    it('persists edits that land while a restore is in flight', async () => {
        const { store, persistence } = await freshStore()
        store.setState({
            models: [model()],
            sessions: [session({ a: [result()] })],
            theme: 'light'
        })
        await persistence.flush()
        const commit = indexedDBStorage.commit.bind(indexedDBStorage)
        let created = ''
        vi.spyOn(indexedDBStorage, 'commit').mockImplementationOnce(
            async (...args: Parameters<typeof commit>) => {
                await commit(...args)
                store.setState({ theme: 'dark' })
                created = store.getState().createSession('Mid-flight', ['a'])
            }
        )
        await persistence.importValidated(parseBackup({ promptTemplates: [] }))
        expect(store.getState().theme).toBe('dark')
        const { store: restored } = await freshStore()
        expect(restored.getState().promptTemplates).toEqual([])
        expect(restored.getState().theme).toBe('dark')
        expect(restored.getState().sessions.map((s) => s.id)).toEqual([
            created,
            's'
        ])
    })

    it('ignores duplicated ids in the stored workspace index', async () => {
        const { store, persistence } = await freshStore()
        store.setState({ sessions: [session({ a: [result()] })] })
        await persistence.flush()
        const meta = JSON.parse((await indexedDBStorage.getItem('nillm-meta'))!)
        meta.sessionIds = ['s', 's']
        await indexedDBStorage.setItem('nillm-meta', JSON.stringify(meta))
        const { store: restored } = await freshStore()
        expect(restored.getState().sessions.map((s) => s.id)).toEqual(['s'])
        expect(restored.getState().persistenceState).toBe('ready')
    })

    it('rejects an experiment manifest that disagrees with the workspace index', async () => {
        const { store, persistence } = await freshStore()
        const run = await plannedRun()
        store.setState({ experimentRuns: [run] })
        await persistence.flush()
        const key = `nillm-run:${encodeURIComponent(run.id)}`
        const manifest = JSON.parse((await indexedDBStorage.getItem(key))!)
        manifest.id = 'other'
        await indexedDBStorage.setItem(key, JSON.stringify(manifest))
        const original = await indexedDBStorage.dump()
        const { store: restored, persistence: recovery } = await freshStore()
        expect(restored.getState().persistenceError?.operation).toBe('read')
        expect(restored.getState().experimentRuns).toEqual([])
        restored.setState({ language: 'zh' })
        await recovery.flush()
        expect(await indexedDBStorage.dump()).toEqual(original)
    })

    it('rejects unknown metadata versions without overwriting the source', async () => {
        const original = JSON.stringify({
            schemaVersion: 99,
            state: { models: [model()] },
            sessionIds: [],
            runIds: []
        })
        await indexedDBStorage.setItem('nillm-meta', original)
        const { store, persistence } = await freshStore()
        expect(store.getState().persistenceError?.operation).toBe('read')
        store.setState({ language: 'zh' })
        await persistence.flush()
        expect(await indexedDBStorage.getItem('nillm-meta')).toBe(original)
    })

    it('blocks writes after a read error and can retry the real stored workspace', async () => {
        const { store, persistence } = await freshStore()
        store.setState({ models: [model()], language: 'ja' })
        await persistence.flush()
        const original = await indexedDBStorage.dump()
        vi.spyOn(indexedDBStorage, 'readMany').mockRejectedValueOnce(
            new Error('Read unavailable')
        )
        const { store: restored, persistence: recovery } = await freshStore()
        expect(restored.getState().persistenceError?.operation).toBe('read')
        restored.setState({ models: [], language: 'zh' })
        await recovery.flush()
        expect(await indexedDBStorage.dump()).toEqual(original)
        await recovery.retry()
        expect(restored.getState().persistenceState).toBe('ready')
        expect(restored.getState().language).toBe('ja')
        expect(restored.getState().models).toEqual([model()])
    })

    it('retains dirty memory after an aborted write and retries the latest values', async () => {
        const { store, persistence } = await freshStore()
        abortNextWrite()
        store.setState({ models: [model()] })
        await persistence.flush()
        expect(store.getState().persistenceError?.operation).toBe('write')
        expect(await indexedDBStorage.dump()).toEqual({})
        store.setState({ language: 'zh', theme: 'dark' })
        await persistence.retry()
        expect(store.getState().persistenceState).toBe('ready')
        const { store: restored } = await freshStore()
        expect(restored.getState().models).toEqual([model()])
        expect(restored.getState().language).toBe('zh')
        expect(restored.getState().theme).toBe('dark')
    })

    it('roundtrips IDs whose unencoded compound keys would collide', async () => {
        const { store, persistence } = await freshStore()
        const first = await plannedRun('run:part', 'task')
        const second = await plannedRun('run', 'part:task')
        const specialSession = session(
            { a: [result()] },
            { id: 'run:part:task' }
        )
        store.setState({
            sessions: [specialSession],
            experimentRuns: [first, second]
        })
        await persistence.flush()
        const { store: restored } = await freshStore()
        expect(restored.getState().sessions).toEqual([specialSession])
        expect(
            restored
                .getState()
                .experimentRuns.map((run) => [run.id, run.tasks[0].id])
        ).toEqual([
            ['run:part', 'task'],
            ['run', 'part:task']
        ])
    })

    it('recovers pending ordinary and experiment attempts while keeping completed results', async () => {
        const { store, persistence } = await freshStore()
        const run = await plannedRun()
        store.setState({
            experimentRuns: [run],
            sessions: [
                session({
                    a: [
                        result('ordinary', {
                            status: 'pending',
                            response: 'partial'
                        })
                    ]
                })
            ]
        })
        store.getState().beginExperiment(run.id, 10)
        for (let index = 0; index < run.tasks.length; index++)
            store
                .getState()
                .appendExperimentAttempt(
                    run.id,
                    run.tasks[index].id,
                    attempt(run, index)
                )
        store
            .getState()
            .updateExperimentResult(run.id, run.tasks[0].id, 'result-0', {
                status: 'completed',
                response: 'OK'
            })
        store
            .getState()
            .updateExperimentResult(run.id, run.tasks[1].id, 'result-1', {
                response: 'partial'
            })
        await persistence.flush()
        const { store: restored } = await freshStore()
        const recovered = restored.getState().experimentRuns[0]
        expect(recovered.status).toBe('interrupted')
        expect(recovered.startedAt).toBe(10)
        expect(recovered.pendingTaskIds).toEqual([run.tasks[1].id])
        expect(recovered.tasks[0].attempts[0]).toMatchObject({
            status: 'completed',
            response: 'OK'
        })
        expect(recovered.tasks[1].attempts[0]).toMatchObject({
            status: 'cancelled',
            response: 'partial'
        })
        expect(restored.getState().sessions[0].results.a[0]).toMatchObject({
            status: 'cancelled',
            response: 'partial'
        })
        expect(restored.getState().isProcessing).toBe(false)
    })

    it('preserves an explicitly queued failed rerun across recovery', async () => {
        const { store, persistence } = await freshStore()
        const run = await plannedRun()
        store.setState({ experimentRuns: [run] })
        store.getState().beginExperiment(run.id, 10)
        for (let index = 0; index < run.tasks.length; index++) {
            store
                .getState()
                .appendExperimentAttempt(
                    run.id,
                    run.tasks[index].id,
                    attempt(run, index)
                )
            store
                .getState()
                .updateExperimentResult(
                    run.id,
                    run.tasks[index].id,
                    `result-${index}`,
                    {
                        status: index === 0 ? 'error' : 'completed',
                        response: index === 0 ? '' : 'OK',
                        error: index === 0 ? 'Provider failed' : undefined
                    }
                )
        }
        store.getState().settleExperiment(run.id, 20)
        store.getState().retryFailedExperiment(run.id)
        await persistence.flush()
        const { store: restored } = await freshStore()
        const recovered = restored.getState().experimentRuns[0]
        expect(recovered.status).toBe('interrupted')
        expect(recovered.pendingTaskIds).toEqual([run.tasks[0].id])
        expect(recovered.tasks.map((task) => task.attempts[0].status)).toEqual([
            'error',
            'completed'
        ])
    })

    it('keeps a bound-hook workspace and its stored records untouched if restore aborts', async () => {
        const { store, persistence } = await freshStore(true)
        store.setState({ models: [model()], language: 'ja' })
        await persistence.flush()
        const templates = store.getState().promptTemplates
        const original = await indexedDBStorage.dump()
        abortNextWrite()
        await expect(
            store
                .getState()
                .importData(
                    JSON.stringify({ promptTemplates: [], language: 'zh' })
                )
        ).rejects.toBeInstanceOf(Error)
        expect(store.getState().promptTemplates).toBe(templates)
        expect(store.getState().language).toBe('ja')
        expect(await indexedDBStorage.dump()).toEqual(original)
    })

    it('commits included empty domains before a bound-hook restore resolves and honors explicit null selection', async () => {
        const { store } = await freshStore(true)
        store.setState({
            sessions: [session({ a: [result()] })],
            activeSessionId: 's'
        })
        await store.getState().importData(
            JSON.stringify({
                promptTemplates: [],
                activeSessionId: null,
                globalConfig: { temperature: 0, maxTokens: 8192, topP: 0.9 }
            })
        )
        const { store: restored } = await freshStore()
        expect(restored.getState().promptTemplates).toEqual([])
        expect(restored.getState().sessions).toEqual(store.getState().sessions)
        expect(restored.getState().activeSessionId).toBeNull()
        expect(restored.getState().globalConfig.temperature).toBe(0)
    })
})
