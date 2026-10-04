import { create, type StateCreator } from 'zustand'
import {
    attachPersistence,
    applyImportedData,
    persistenceFor
} from './persistence'
import { cancelAllStreams } from '../streaming/cancellation'
import { parseBackup } from '../validation'
import { ModelsSlice, createModelsSlice } from './models'
import { SessionsSlice, createSessionsSlice } from './sessions'
import { TestSetsSlice, createTestSetsSlice } from './testSets'
import { QueueSlice, createQueueSlice } from './queue'
import { StreamingSlice, createStreamingSlice } from './streaming'
import { PromptsSlice, createPromptsSlice } from './prompts'
import { ConfigSlice, createConfigSlice } from './config'
import { ArenaSlice, createArenaSlice } from './arena'
import { ExperimentsSlice, createExperimentsSlice } from './experiments'
import { indexedDBStorage } from './indexeddb-storage'
import type { LLMModel } from '@/lib/types'

export interface ExportDataOptions {
    includeSecrets?: boolean
}

export type AppState = ModelsSlice &
    SessionsSlice &
    TestSetsSlice &
    QueueSlice &
    StreamingSlice &
    PromptsSlice &
    ConfigSlice &
    ArenaSlice &
    ExperimentsSlice & {
        persistenceState: 'loading' | 'ready' | 'error'
        persistenceError?: { operation: 'read' | 'write'; message: string }
        retryPersistence: () => void
        downloadStorageDump: () => void
        exportData: (options?: ExportDataOptions) => string
        importData: (data: string) => Promise<void>
        stopAll: () => void
    }

/** Strips credentials, query and hash from an endpoint for shared backups. */
function sanitizeBaseURL(baseURL: string): string {
    try {
        const url = new URL(baseURL)
        url.username = ''
        url.password = ''
        url.search = ''
        url.hash = ''
        return url.href.replace(/\/$/, '')
    } catch {
        return baseURL
    }
}

function sanitizeModels(models: LLMModel[]): LLMModel[] {
    return models.map((model) => ({
        ...model,
        apiKey: undefined,
        ...(model.baseURL !== undefined && {
            baseURL: sanitizeBaseURL(model.baseURL)
        })
    }))
}

// The persistence controller for a store lives in the persistence registry.

export const createAppState: StateCreator<AppState> = (set, get, api) => ({
    ...createModelsSlice(set, get, api),
    ...createSessionsSlice(set, get, api),
    ...createTestSetsSlice(set, get, api),
    ...createQueueSlice(set, get, api),
    ...createStreamingSlice(set, get, api),
    ...createPromptsSlice(set, get, api),
    ...createConfigSlice(set, get, api),
    ...createArenaSlice(set, get, api),
    ...createExperimentsSlice(set, get, api),
    persistenceState: 'loading',
    retryPersistence: () => {
        void persistenceFor(api)?.retry()
    },
    downloadStorageDump: () => {
        void persistenceFor(api)?.downloadDump()
    },
    exportData: (options): string => {
        const state = get()
        const includeSecrets = options?.includeSecrets === true
        return JSON.stringify({
            schemaVersion: 1,
            state: {
                models: includeSecrets
                    ? state.models
                    : sanitizeModels(state.models),
                sessions: state.sessions,
                testSets: state.testSets,
                promptTemplates: state.promptTemplates,
                experimentRuns: state.experimentRuns,
                globalConfig: state.globalConfig,
                activeModelIds: state.activeModelIds,
                activeSessionId: state.activeSessionId,
                testSetOrder: state.testSetOrder,
                language: state.language,
                benchmarkLanguage: state.benchmarkLanguage,
                theme: state.theme,
                arenaColumns: state.arenaColumns,
                arenaSortBy: state.arenaSortBy
            }
        })
    },
    importData: async (json: string) => {
        const state = get()
        if (state.isProcessing || state.isJudging)
            throw new Error(
                'Cannot restore data while requests are running. Stop them first.'
            )
        let data
        try {
            data = parseBackup(JSON.parse(json))
        } catch {
            throw new Error(
                'Invalid backup format. No application data was changed.'
            )
        }
        const own = persistenceFor(api)
        if (own) {
            // Storage commits first; a failure leaves the workspace untouched.
            await own.importValidated(data)
            return
        }
        // Stores without attached persistence (tests) only update memory.
        applyImportedData((partial) => set(partial), get(), data)
    },
    stopAll: () => {
        // Cancel in-flight provider streams first so active tasks settle;
        // isProcessing is released by the single processor afterwards.
        cancelAllStreams()
        for (const run of get().experimentRuns) {
            if (
                run.status === 'queued' ||
                run.status === 'running' ||
                run.status === 'paused'
            ) {
                void get().cancelExperiment(run.id)
            }
        }
        set({
            messageQueue: [],
            streamingData: {}
        })
    }
})

export const useAppStore = create<AppState>()(createAppState)

const persistence = attachPersistence(useAppStore, indexedDBStorage)
export const storeHydration = persistence.hydrated
if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => {
        void persistence.flush()
    })
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') void persistence.flush()
    })
}

export { indexedDBStorage }
export type { AppStorage } from './indexeddb-storage'
export type {
    ModelsSlice,
    SessionsSlice,
    TestSetsSlice,
    QueueSlice,
    StreamingSlice,
    PromptsSlice,
    ConfigSlice,
    ArenaSlice,
    ExperimentsSlice
}
export type { QueueItem } from './queue'
