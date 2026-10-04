import { create, type StateCreator } from 'zustand'
import { attachPersistence } from './persistence'
import { cancelAllStreams } from '../streaming/cancellation'

import { ModelsSlice, createModelsSlice } from './models'
import { SessionsSlice, createSessionsSlice } from './sessions'
import { TestSetsSlice, createTestSetsSlice } from './testSets'
import { QueueSlice, createQueueSlice } from './queue'
import { StreamingSlice, createStreamingSlice } from './streaming'
import { PromptsSlice, createPromptsSlice } from './prompts'
import { ConfigSlice, createConfigSlice } from './config'
import { ArenaSlice, createArenaSlice } from './arena'
import { indexedDBStorage } from './indexeddb-storage'

export type AppState = ModelsSlice &
    SessionsSlice &
    TestSetsSlice &
    QueueSlice &
    StreamingSlice &
    PromptsSlice &
    ConfigSlice &
    ArenaSlice & {
        exportData: () => string
        importData: (data: string) => Promise<void>
        stopAll: () => void
    }

export const createAppState: StateCreator<AppState> = (set, get, api) => ({
    ...createModelsSlice(set, get, api),
    ...createSessionsSlice(set, get, api),
    ...createTestSetsSlice(set, get, api),
    ...createQueueSlice(set, get, api),
    ...createStreamingSlice(set, get, api),
    ...createPromptsSlice(set, get, api),
    ...createConfigSlice(set, get, api),
    ...createArenaSlice(set, get, api),
    exportData: (): string => {
        const state = get()
        return JSON.stringify({
            models: state.models,
            sessions: state.sessions,
            testSets: state.testSets,
            promptTemplates: state.promptTemplates,
            globalConfig: state.globalConfig
        })
    },
    importData: async (json: string) => {
        try {
            const { parseBackup } = await import('../validation')
            const data = parseBackup(JSON.parse(json))
            set((state) => ({
                models: data.models || state.models,
                activeModelIds: state.activeModelIds.filter((id) =>
                    (data.models || state.models).some(
                        (model) => model.id === id && model.enabled
                    )
                ),
                activeSessionId: (data.sessions || state.sessions).some(
                    (session) => session.id === state.activeSessionId
                )
                    ? state.activeSessionId
                    : null,
                sessions: data.sessions || state.sessions,
                testSets: data.testSets || state.testSets,
                promptTemplates: data.promptTemplates || state.promptTemplates,
                globalConfig: data.globalConfig || state.globalConfig
            }))
        } catch {
            throw new Error(
                'Invalid backup format. No application data was changed.'
            )
        }
    },
    stopAll: () => {
        cancelAllStreams()
        set({
            messageQueue: [],
            isProcessing: false,
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
export type {
    ModelsSlice,
    SessionsSlice,
    TestSetsSlice,
    QueueSlice,
    StreamingSlice,
    PromptsSlice,
    ConfigSlice,
    ArenaSlice
}
export type { QueueItem } from './queue'
