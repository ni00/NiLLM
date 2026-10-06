import type { StoreApi } from 'zustand'
import type { AppState } from './index'
import type { AppStorage } from './indexeddb-storage'
import {
    parseBackup,
    sessionSchema,
    experimentRunSchema,
    type BackupData
} from '../validation'
import {
    recoverInterruptedExperiment,
    recoverInterruptedSession
} from './recovery'
import type {
    ChatSession,
    ExperimentRun,
    ExperimentStatus,
    ExperimentTask
} from '@/lib/types'

const META_KEY = 'nillm-meta'
const LEGACY_KEY = 'nillm-storage'

export const metaStateKeys = [
    'models',
    'activeModelIds',
    'activeSessionId',
    'testSets',
    'testSetOrder',
    'promptTemplates',
    'globalConfig',
    'language',
    'parameterPresets',
    'benchmarkLanguage',
    'theme',
    'density',
    'arenaColumns',
    'arenaSortBy'
] as const
export type MetaState = Pick<AppState, (typeof metaStateKeys)[number]>

interface MetaRecord {
    schemaVersion: 1
    state: MetaState
    sessionIds: string[]
    runIds: string[]
}

type RunManifest = Omit<
    ExperimentRun,
    'tasks' | 'pendingTaskIds' | 'status' | 'startedAt' | 'finishedAt' | 'error'
> & { taskIds: string[] }

interface RunStateRecord {
    status: ExperimentStatus
    startedAt?: number
    finishedAt?: number
    error?: string
}

interface TaskRecord {
    task: ExperimentTask
    pending: boolean
}

const encodeKey = (id: string) => encodeURIComponent(id)
const sessionKeyOf = (id: string) => `nillm-session:${encodeKey(id)}`
const runKeyOf = (id: string) => `nillm-run:${encodeKey(id)}`
const runStateKeyOf = (id: string) => `nillm-run-state:${encodeKey(id)}`
const taskKeyOf = (runId: string, taskId: string) =>
    `nillm-task:${encodeKey(runId)}:${encodeKey(taskId)}`

interface RunBaseline {
    manifest: RunManifest
    state: RunStateRecord
    tasks: Map<string, { task: ExperimentTask; pending: boolean }>
    taskOrder: string[]
}

interface Baseline {
    meta: MetaState
    sessions: Map<string, ChatSession>
    runs: Map<string, RunBaseline>
}

/** Everything persistence reads back out of the store. */
type WorkspaceState = Pick<
    AppState,
    (typeof metaStateKeys)[number] | 'sessions' | 'experimentRuns'
>

/** The workspace a restore or import just put on disk. */
interface RestoredWorkspace {
    meta?: Partial<MetaState>
    sessions?: ChatSession[]
    runs?: ExperimentRun[]
}
/** The bound hook and vanilla API share getState, but not object identity. */
const persistenceRegistry = new WeakMap<
    StoreApi<AppState>['getState'],
    PersistenceController
>()

/** Imported domains replace supplied values and retain omitted ones;
 * recover interrupted work and repair dangling active IDs. */
export function applyImportedData(
    setState: (partial: Partial<AppState>) => void,
    current: Pick<
        AppState,
        | 'sessions'
        | 'experimentRuns'
        | 'models'
        | 'activeModelIds'
        | 'activeSessionId'
    > &
        Partial<MetaState>,
    data: BackupData
) {
    const sessions =
        data.sessions !== undefined
            ? data.sessions.map(recoverInterruptedSession)
            : current.sessions
    const runs =
        data.experimentRuns !== undefined
            ? data.experimentRuns.map(recoverInterruptedExperiment)
            : current.experimentRuns
    const meta = Object.fromEntries(
        metaStateKeys
            .filter((key) => data[key as keyof BackupData] !== undefined)
            .map((key) => [key, data[key as keyof BackupData]])
    )
    const selectedSessionId =
        data.activeSessionId !== undefined
            ? data.activeSessionId
            : current.activeSessionId
    const activeSessionId = sessions.some(
        (session) => session.id === selectedSessionId
    )
        ? selectedSessionId
        : null
    const activeModelIds = (
        data.activeModelIds ?? current.activeModelIds
    ).filter((id) =>
        (data.models ?? current.models).some(
            (model) => model.id === id && model.enabled
        )
    )
    setState({
        ...meta,
        sessions,
        experimentRuns: runs,
        activeSessionId,
        activeModelIds
    })
}

export interface PersistenceController {
    hydrated: Promise<void>
    flush: () => Promise<void>
    /** Re-runs hydration after a read failure or retries the latest write. */
    retry: () => Promise<void>
    /** Downloads raw storage records as a diagnostic file (contains secrets). */
    downloadDump: () => Promise<void>
    /** Atomically commits an imported workspace before the store updates. */
    importValidated: (data: BackupData) => Promise<void>
    dispose: () => void
}

function manifestOf(run: ExperimentRun): RunManifest {
    return {
        id: run.id,
        name: run.name,
        testSet: run.testSet,
        models: run.models,
        variants: run.variants,
        configByModelVariant: run.configByModelVariant,
        repetitions: run.repetitions,
        maxConcurrent: run.maxConcurrent,
        createdAt: run.createdAt,
        taskIds: run.tasks.map((task) => task.id)
    }
}

function runStateOf(run: ExperimentRun): RunStateRecord {
    return {
        status: run.status,
        ...(run.startedAt !== undefined && { startedAt: run.startedAt }),
        ...(run.finishedAt !== undefined && { finishedAt: run.finishedAt }),
        ...(run.error !== undefined && { error: run.error })
    }
}

function manifestChanged(run: ExperimentRun, prev: RunBaseline | undefined) {
    if (!prev) return true
    const next = manifestOf(run)
    return (
        next.name !== prev.manifest.name ||
        next.testSet !== prev.manifest.testSet ||
        next.models !== prev.manifest.models ||
        next.variants !== prev.manifest.variants ||
        next.configByModelVariant !== prev.manifest.configByModelVariant ||
        next.repetitions !== prev.manifest.repetitions ||
        next.maxConcurrent !== prev.manifest.maxConcurrent ||
        next.createdAt !== prev.manifest.createdAt ||
        next.taskIds.join('\u0000') !== prev.taskOrder.join('\u0000')
    )
}

function runStateChanged(run: ExperimentRun, prev: RunBaseline | undefined) {
    if (!prev) return true
    return (
        run.status !== prev.state.status ||
        run.startedAt !== prev.state.startedAt ||
        run.finishedAt !== prev.state.finishedAt ||
        run.error !== prev.state.error
    )
}

function captureBaseline(state: WorkspaceState): Baseline {
    const runs = new Map<string, RunBaseline>()
    for (const run of state.experimentRuns) {
        const tasks = new Map<
            string,
            { task: ExperimentTask; pending: boolean }
        >()
        const pending = new Set(run.pendingTaskIds)
        for (const task of run.tasks)
            tasks.set(task.id, { task, pending: pending.has(task.id) })
        runs.set(run.id, {
            manifest: manifestOf(run),
            state: runStateOf(run),
            tasks,
            taskOrder: run.tasks.map((task) => task.id)
        })
    }
    return {
        meta: Object.fromEntries(
            metaStateKeys.map((key) => [key, state[key]])
        ) as MetaState,
        sessions: new Map(state.sessions.map((s) => [s.id, s])),
        runs
    }
}

/** Baseline for the workspace now on disk. Restored records replace whatever a
 * merge kept in memory, so anything that only exists in memory stays dirty and
 * the next flush writes it. */
function baselineForDisk(
    state: WorkspaceState,
    restored: RestoredWorkspace
): Baseline {
    return captureBaseline({
        ...state,
        ...restored.meta,
        ...(restored.sessions !== undefined && {
            sessions: restored.sessions
        }),
        ...(restored.runs !== undefined && { experimentRuns: restored.runs })
    })
}

function readError(error: unknown) {
    return error instanceof Error ? error.message : 'Local storage failed.'
}

/** Restored records first, in-memory records last, so entries created or edited
 * while storage was unavailable survive a later successful restore. */
function mergeById<T extends { id: string }>(restored: T[], local: T[]): T[] {
    if (local.length === 0) return restored
    const localIds = new Set(local.map((entry) => entry.id))
    return [...restored.filter((entry) => !localIds.has(entry.id)), ...local]
}

/** Persist sessions and experiment tasks separately. Coalesce writes (200ms),
 * commit atomically, and validate all records before restoring state. */
export function attachPersistence(
    store: StoreApi<AppState>,
    storage: AppStorage
): PersistenceController {
    let baseline: Baseline | null = null
    let writeBlocked = false
    let importing = false
    let changedWhilePaused = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let writeQueue = Promise.resolve()

    const setPersistenceError = (
        operation: 'read' | 'write',
        error: unknown
    ) => {
        store.setState({
            persistenceState: 'error',
            persistenceError: { operation, message: readError(error) }
        })
    }

    function diff(): {
        puts: Record<string, string>
        deletes: string[]
        snapshot: Baseline
    } {
        const state = store.getState()
        const snapshot = captureBaseline(state)
        const puts: Record<string, string> = {}
        const deletes: string[] = []

        const metaChanged =
            metaStateKeys.some(
                (key) => snapshot.meta[key] !== baseline!.meta[key]
            ) ||
            snapshot.sessions.size !== baseline!.sessions.size ||
            snapshot.runs.size !== baseline!.runs.size ||
            [...snapshot.sessions.keys()].some(
                (id) => !baseline!.sessions.has(id)
            ) ||
            [...snapshot.runs.keys()].some((id) => !baseline!.runs.has(id))

        for (const [id, session] of snapshot.sessions) {
            const prev = baseline!.sessions.get(id)
            if (!prev || prev !== session)
                puts[sessionKeyOf(id)] = JSON.stringify(session)
        }
        for (const id of baseline!.sessions.keys())
            if (!snapshot.sessions.has(id)) deletes.push(sessionKeyOf(id))

        for (const run of state.experimentRuns) {
            const prev = baseline!.runs.get(run.id)
            if (manifestChanged(run, prev))
                puts[runKeyOf(run.id)] = JSON.stringify(manifestOf(run))
            if (runStateChanged(run, prev))
                puts[runStateKeyOf(run.id)] = JSON.stringify(runStateOf(run))
            const pending = new Set(run.pendingTaskIds)
            const taskIds = new Set(run.tasks.map((task) => task.id))
            for (const task of run.tasks) {
                const prevTask = prev?.tasks.get(task.id)
                const isPending = pending.has(task.id)
                if (
                    !prevTask ||
                    prevTask.task !== task ||
                    prevTask.pending !== isPending
                )
                    puts[taskKeyOf(run.id, task.id)] = JSON.stringify({
                        task,
                        pending: isPending
                    })
            }
            if (prev)
                for (const taskId of prev.tasks.keys())
                    if (!taskIds.has(taskId))
                        deletes.push(taskKeyOf(run.id, taskId))
        }
        for (const id of baseline!.runs.keys()) {
            if (snapshot.runs.has(id)) continue
            deletes.push(runKeyOf(id), runStateKeyOf(id))
            for (const taskId of baseline!.runs.get(id)!.tasks.keys())
                deletes.push(taskKeyOf(id, taskId))
        }

        if (metaChanged)
            puts[META_KEY] = JSON.stringify({
                schemaVersion: 1,
                state: snapshot.meta,
                sessionIds: [...snapshot.sessions.keys()],
                runIds: [...snapshot.runs.keys()]
            } satisfies MetaRecord)

        return { puts, deletes, snapshot }
    }

    const flush = () => {
        if (timer !== undefined) {
            clearTimeout(timer)
            timer = undefined
        }
        if (!baseline || writeBlocked) return writeQueue
        const { puts, deletes, snapshot } = diff()
        if (Object.keys(puts).length === 0 && deletes.length === 0)
            return writeQueue
        writeQueue = writeQueue
            .then(async () => {
                await storage.commit(puts, deletes)
                baseline = snapshot
                if (store.getState().persistenceState === 'error')
                    store.setState({
                        persistenceState: 'ready',
                        persistenceError: undefined
                    })
            })
            .catch((error) => {
                // Dirty diff stays against the old baseline, so the next
                // flush rewrites the latest state.
                setPersistenceError('write', error)
            })
        return writeQueue
    }

    let lastSessionsRef = store.getState().sessions
    let lastRunsRef = store.getState().experimentRuns
    const unsubscribe = store.subscribe((state) => {
        if (!baseline || writeBlocked) return
        if (importing) {
            // The import rebases the diff on the post-import state, so anything
            // the user changes while it runs has to be diffed afterwards.
            changedWhilePaused = true
            return
        }
        if (
            !metaStateKeys.some((key) => state[key] !== baseline!.meta[key]) &&
            state.sessions === lastSessionsRef &&
            state.experimentRuns === lastRunsRef
        )
            return
        lastSessionsRef = state.sessions
        lastRunsRef = state.experimentRuns
        if (timer === undefined) timer = setTimeout(() => void flush(), 200)
    })

    function applyRestored(input: RestoredWorkspace) {
        store.setState((state) => {
            // Restoring must never discard records created while storage was
            // unavailable: in-memory copies win over the older snapshot.
            const sessions =
                input.sessions !== undefined
                    ? mergeById(input.sessions, state.sessions)
                    : state.sessions
            const runs =
                input.runs !== undefined
                    ? mergeById(input.runs, state.experimentRuns)
                    : state.experimentRuns
            const selectedSessionId =
                input.meta?.activeSessionId !== undefined
                    ? input.meta.activeSessionId
                    : state.activeSessionId
            return {
                ...input.meta,
                sessions,
                experimentRuns: runs,
                activeSessionId: sessions.some(
                    (session) => session.id === selectedSessionId
                )
                    ? selectedSessionId
                    : null,
                activeModelIds: (
                    input.meta?.activeModelIds ?? state.activeModelIds
                ).filter((id) =>
                    (input.meta?.models ?? state.models).some(
                        (model) => model.id === id && model.enabled
                    )
                )
            }
        })
    }

    async function restoreFromMeta(rawMeta: string) {
        const meta = JSON.parse(rawMeta) as MetaRecord
        if (
            !meta ||
            meta.schemaVersion !== 1 ||
            !meta.state ||
            typeof meta.state !== 'object' ||
            !Array.isArray(meta.sessionIds) ||
            !Array.isArray(meta.runIds)
        )
            throw new Error('Unknown workspace format.')

        const validatedMeta = parseBackup(meta.state)

        // A duplicated id would restore the same record twice and desync the
        // in-memory maps from the diff baseline.
        const sessionIds = [...new Set(meta.sessionIds)]
        const runIds = [...new Set(meta.runIds)]
        const sessionKeys = sessionIds.map(sessionKeyOf)
        const runKeys = runIds.map(runKeyOf)
        const head = await storage.readMany([...sessionKeys, ...runKeys])

        const sessions: ChatSession[] = []
        for (let index = 0; index < sessionIds.length; index++) {
            const raw = head[sessionKeys[index]]
            if (raw === null || raw === undefined)
                throw new Error('Missing session record.')
            sessions.push(sessionSchema.parse(JSON.parse(raw)))
        }

        interface RunParts {
            manifest: RunManifest
            state: RunStateRecord
            tasks: TaskRecord[]
        }
        const parts: RunParts[] = []
        const tailKeys: string[] = []
        for (let index = 0; index < runIds.length; index++) {
            const runId = runIds[index]
            const raw = head[runKeys[index]]
            if (raw === null || raw === undefined)
                throw new Error('Missing experiment record.')
            const manifest = JSON.parse(raw) as RunManifest
            if (!manifest || !Array.isArray(manifest.taskIds))
                throw new Error('Corrupted experiment record.')
            // The manifest and every tail record are written under the run id
            // declared by the meta record; a divergence means the record pair
            // was damaged, and reading on would restore a run under a key that
            // no future write would ever reach again.
            if (manifest.id !== runId)
                throw new Error('Corrupted experiment record.')
            tailKeys.push(runStateKeyOf(runId))
            for (const taskId of manifest.taskIds)
                tailKeys.push(taskKeyOf(runId, taskId))
            parts.push({
                manifest,
                state: {} as RunStateRecord,
                tasks: []
            })
        }
        const tail = tailKeys.length > 0 ? await storage.readMany(tailKeys) : {}

        const runs: ExperimentRun[] = []
        parts.forEach((part) => {
            const stateRaw = tail[runStateKeyOf(part.manifest.id)]
            if (stateRaw === null || stateRaw === undefined)
                throw new Error('Missing experiment state record.')
            part.state = JSON.parse(stateRaw) as RunStateRecord
            for (const taskId of part.manifest.taskIds) {
                const raw = tail[taskKeyOf(part.manifest.id, taskId)]
                if (raw === null || raw === undefined)
                    throw new Error('Missing experiment task record.')
                const record = JSON.parse(raw) as TaskRecord
                if (!record || typeof record !== 'object' || !record.task)
                    throw new Error('Corrupted experiment task record.')
                part.tasks.push(record)
            }
            const pendingTaskIds = part.manifest.taskIds.filter(
                (_, position) => part.tasks[position]?.pending
            )
            runs.push(
                experimentRunSchema.parse({
                    ...part.manifest,
                    taskIds: undefined,
                    tasks: part.tasks.map((record) => record.task),
                    pendingTaskIds,
                    status: part.state.status,
                    startedAt: part.state.startedAt,
                    finishedAt: part.state.finishedAt,
                    error: part.state.error
                })
            )
        })

        const restored: RestoredWorkspace = {
            meta: validatedMeta as Partial<MetaState>,
            sessions: sessions.map(recoverInterruptedSession),
            runs: runs.map(recoverInterruptedExperiment)
        }
        applyRestored(restored)
        return restored
    }

    async function migrateLegacy(raw: string) {
        const parsed = JSON.parse(raw) as { state?: unknown; version?: number }
        if (!parsed || typeof parsed !== 'object' || !parsed.state)
            throw new Error('Unknown legacy workspace format.')
        const validated = parseBackup(parsed.state)
        const sessions = (validated.sessions ?? []).map(
            recoverInterruptedSession
        )
        const runs = (validated.experimentRuns ?? []).map(
            recoverInterruptedExperiment
        )
        const meta: MetaState = Object.fromEntries(
            metaStateKeys
                .filter((key) => validated[key] !== undefined)
                .map((key) => [key, validated[key]])
        ) as MetaState

        const puts: Record<string, string> = {
            [META_KEY]: JSON.stringify({
                schemaVersion: 1,
                state: meta,
                sessionIds: sessions.map((s) => s.id),
                runIds: runs.map((r) => r.id)
            } satisfies MetaRecord)
        }
        for (const session of sessions)
            puts[sessionKeyOf(session.id)] = JSON.stringify(session)
        for (const run of runs) {
            puts[runKeyOf(run.id)] = JSON.stringify(manifestOf(run))
            puts[runStateKeyOf(run.id)] = JSON.stringify(runStateOf(run))
            const pending = new Set(run.pendingTaskIds)
            for (const task of run.tasks)
                puts[taskKeyOf(run.id, task.id)] = JSON.stringify({
                    task,
                    pending: pending.has(task.id)
                })
        }
        // Single atomic cutover: new keys appear and the legacy key leaves in
        // one transaction, or the old data survives untouched.
        await storage.commit(puts, [LEGACY_KEY])

        const restored: RestoredWorkspace = {
            meta,
            sessions,
            runs
        }
        applyRestored(restored)
        return restored
    }

    const hydrate = async () => {
        try {
            store.setState({ persistenceState: 'loading' })
            const head = await storage.readMany([META_KEY, LEGACY_KEY])
            const restored = head[META_KEY]
                ? await restoreFromMeta(head[META_KEY])
                : head[LEGACY_KEY]
                  ? await migrateLegacy(head[LEGACY_KEY])
                  : null
            baseline = restored
                ? baselineForDisk(store.getState(), restored)
                : captureBaseline(store.getState())
            lastSessionsRef = store.getState().sessions
            lastRunsRef = store.getState().experimentRuns
            writeBlocked = false
            store.setState({
                persistenceState: 'ready',
                persistenceError: undefined
            })
        } catch (error) {
            // Read failures keep the in-memory defaults and disable saving so
            // an empty workspace can never overwrite the records on disk.
            writeBlocked = true
            baseline = null
            setPersistenceError('read', error)
        }
    }

    const hydrated = Promise.resolve().then(hydrate)

    const controller: PersistenceController = {
        hydrated,
        flush,
        retry: async () => {
            if (store.getState().persistenceError?.operation !== 'read') {
                await flush()
                return
            }
            await hydrate()
        },
        downloadDump: async () => {
            const records = await storage.dump()
            const { downloadJson } = await import('@/lib/utils')
            await downloadJson(
                {
                    format: 'nillm-storage-dump',
                    records
                },
                `nillm-storage-dump-${Date.now()}.json`
            )
        },
        importValidated: async (data) => {
            if (importing)
                throw new Error('A workspace restore is already in progress.')
            importing = true
            let rebase = false
            try {
                // Existing writes settle before the replacement transaction.
                await flush()
                if (!baseline || writeBlocked)
                    throw new Error('Local storage is not available.')
                // Disk truth before the replacement transaction; rebased on if
                // the workspace changes while the import is in flight.
                const disk = baseline
                const state = store.getState()
                const supplied = {
                    sessions: data.sessions !== undefined,
                    runs: data.experimentRuns !== undefined
                }
                const sessions =
                    data.sessions !== undefined
                        ? data.sessions.map(recoverInterruptedSession)
                        : state.sessions
                const runs =
                    data.experimentRuns !== undefined
                        ? data.experimentRuns.map(recoverInterruptedExperiment)
                        : state.experimentRuns
                const meta = {
                    ...disk.meta,
                    ...Object.fromEntries(
                        metaStateKeys
                            .filter(
                                (key) =>
                                    data[key as keyof BackupData] !== undefined
                            )
                            .map((key) => [key, data[key as keyof BackupData]])
                    )
                } as MetaState
                meta.activeSessionId = sessions.some(
                    (session) => session.id === meta.activeSessionId
                )
                    ? meta.activeSessionId
                    : null
                meta.activeModelIds = meta.activeModelIds.filter((id) =>
                    meta.models.some(
                        (model) => model.id === id && model.enabled
                    )
                )

                const puts: Record<string, string> = {
                    [META_KEY]: JSON.stringify({
                        schemaVersion: 1,
                        state: meta,
                        // Only a domain this import rewrites may be listed: an
                        // id without a matching record makes the whole
                        // workspace unreadable on the next start.
                        sessionIds: supplied.sessions
                            ? sessions.map((s) => s.id)
                            : [...disk.sessions.keys()],
                        runIds: supplied.runs
                            ? runs.map((r) => r.id)
                            : [...disk.runs.keys()]
                    } satisfies MetaRecord)
                }
                const deletes: string[] = []
                if (supplied.sessions) {
                    const keep = new Set(sessions.map((s) => s.id))
                    for (const id of disk.sessions.keys())
                        if (!keep.has(id)) deletes.push(sessionKeyOf(id))
                    for (const session of sessions)
                        puts[sessionKeyOf(session.id)] = JSON.stringify(session)
                }
                if (supplied.runs) {
                    const keep = new Set(runs.map((r) => r.id))
                    for (const [id, runBase] of disk.runs) {
                        if (keep.has(id)) continue
                        deletes.push(runKeyOf(id), runStateKeyOf(id))
                        for (const taskId of runBase.tasks.keys())
                            deletes.push(taskKeyOf(id, taskId))
                    }
                    for (const run of runs) {
                        puts[runKeyOf(run.id)] = JSON.stringify(manifestOf(run))
                        puts[runStateKeyOf(run.id)] = JSON.stringify(
                            runStateOf(run)
                        )
                        const pending = new Set(run.pendingTaskIds)
                        for (const task of run.tasks)
                            puts[taskKeyOf(run.id, task.id)] = JSON.stringify({
                                task,
                                pending: pending.has(task.id)
                            })
                    }
                }
                // Commit the whole replacement workspace first; only then is
                // the in-memory state allowed to follow.
                await storage.commit(puts, deletes)
                rebase = changedWhilePaused
                changedWhilePaused = false
                applyImportedData(
                    (partial) => store.setState(partial),
                    store.getState(),
                    data
                )
                // An edit that landed while the import was in flight is not on
                // disk, so diffing against the imported workspace would mark it
                // as already written. Rebase on the pre-import snapshot instead
                // and let the next flush rewrite the live workspace.
                baseline = rebase
                    ? disk
                    : baselineForDisk(store.getState(), {
                          meta,
                          ...(supplied.sessions && { sessions }),
                          ...(supplied.runs && { runs })
                      })
                lastSessionsRef = store.getState().sessions
                lastRunsRef = store.getState().experimentRuns
            } finally {
                importing = false
                if (rebase) void flush()
            }
        },
        dispose: () => {
            unsubscribe()
            void flush()
        }
    }
    persistenceRegistry.set(store.getState, controller)
    return controller
}

export function persistenceFor(
    store: Pick<StoreApi<AppState>, 'getState'>
): PersistenceController | null {
    return persistenceRegistry.get(store.getState) ?? null
}
