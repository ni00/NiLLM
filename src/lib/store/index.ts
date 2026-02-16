import { create, StoreApi, UseBoundStore } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

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
        importData: (data: string) => void
        stopAll: () => void
    }

export const useAppStore: UseBoundStore<StoreApi<AppState>> =
    create<AppState>()(
        persist(
            (set, get) => ({
                ...createModelsSlice(set, get as never, {} as never),
                ...createSessionsSlice(set, get as never, {} as never),
                ...createTestSetsSlice(set, get as never, {} as never),
                ...createQueueSlice(set, get as never, {} as never),
                ...createStreamingSlice(set, get as never, {} as never),
                ...createPromptsSlice(set, get as never, {} as never),
                ...createConfigSlice(set, get as never, {} as never),
                ...createArenaSlice(set, get as never, {} as never),
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
                importData: (json: string) => {
                    try {
                        const data = JSON.parse(json)
                        set((state) => ({
                            models: data.models || state.models,
                            sessions: data.sessions || state.sessions,
                            testSets: data.testSets || state.testSets,
                            promptTemplates:
                                data.promptTemplates || state.promptTemplates,
                            globalConfig:
                                data.globalConfig || state.globalConfig
                        }))
                    } catch (e) {
                        console.error('Failed to import data:', e)
                    }
                },
                stopAll: () => {
                    set({
                        messageQueue: [],
                        isProcessing: false,
                        streamingData: {}
                    })
                }
            }),
            {
                name: 'nillm-storage',
                storage: createJSONStorage(() => indexedDBStorage),
                partialize: (state: AppState) =>
                    Object.fromEntries(
                        Object.entries(state).filter(
                            ([key]) => !['streamingData'].includes(key)
                        )
                    ) as AppState
            }
        )
    )

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
