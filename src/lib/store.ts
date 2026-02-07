import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
    LLMModel,
    ChatSession,
    BenchmarkResult,
    TestSet,
    GenerationConfig
} from './types'

interface AppState {
    models: LLMModel[]
    activeModelIds: string[]
    sessions: ChatSession[]
    activeSessionId: string | null

    // Actions
    addModel: (model: LLMModel) => void
    updateModel: (id: string, updates: Partial<LLMModel>) => void
    deleteModel: (id: string) => void
    toggleModelActivation: (id: string) => void

    createSession: (title: string, modelIds: string[]) => string
    addResult: (
        sessionId: string,
        modelId: string,
        result: BenchmarkResult
    ) => void
    updateResult: (
        sessionId: string,
        modelId: string,
        resultId: string,
        updates: Partial<BenchmarkResult>
    ) => void
    clearActiveSession: () => void

    testSets: TestSet[]
    addTestSet: (testSet: TestSet) => void
    deleteTestSet: (id: string) => void

    globalConfig: GenerationConfig
    updateGlobalConfig: (updates: Partial<GenerationConfig>) => void
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            models: [
                {
                    id: 'gpt-4o',
                    name: 'GPT-4o',
                    provider: 'openai',
                    providerId: 'gpt-4o',
                    enabled: true
                },
                {
                    id: 'claude-3-opus',
                    name: 'Claude 3 Opus (OpenRouter)',
                    provider: 'openrouter',
                    providerId: 'anthropic/claude-3-opus',
                    enabled: true
                }
            ],
            activeModelIds: ['gpt-4o'],
            sessions: [],
            activeSessionId: null,

            addModel: (model) =>
                set((state) => ({ models: [...state.models, model] })),
            updateModel: (id, updates) =>
                set((state) => ({
                    models: state.models.map((m) =>
                        m.id === id ? { ...m, ...updates } : m
                    )
                })),
            deleteModel: (id) =>
                set((state) => ({
                    models: state.models.filter((m) => m.id !== id),
                    activeModelIds: state.activeModelIds.filter(
                        (mid) => mid !== id
                    )
                })),
            toggleModelActivation: (id) =>
                set((state) => {
                    const isActive = state.activeModelIds.includes(id)
                    return {
                        activeModelIds: isActive
                            ? state.activeModelIds.filter((mid) => mid !== id)
                            : [...state.activeModelIds, id]
                    }
                }),

            createSession: (title, modelIds) => {
                const id = crypto.randomUUID()
                const newSession: ChatSession = {
                    id,
                    title,
                    models: modelIds,
                    messages: [],
                    results: {},
                    createdAt: Date.now()
                }
                set((state) => ({
                    sessions: [newSession, ...state.sessions],
                    activeSessionId: id
                }))
                return id
            },

            addResult: (sessionId, modelId, result) =>
                set((state) => ({
                    sessions: state.sessions.map((session) => {
                        if (session.id !== sessionId) return session
                        const modelResults = session.results[modelId] || []
                        return {
                            ...session,
                            results: {
                                ...session.results,
                                [modelId]: [...modelResults, result]
                            }
                        }
                    })
                })),

            updateResult: (sessionId, modelId, resultId, updates) =>
                set((state) => ({
                    sessions: state.sessions.map((session) => {
                        if (session.id !== sessionId) return session

                        const modelResults = session.results[modelId]
                        if (!modelResults) return session

                        const updatedResults = modelResults.map((res) =>
                            res.id === resultId ? { ...res, ...updates } : res
                        )

                        return {
                            ...session,
                            results: {
                                ...session.results,
                                [modelId]: updatedResults
                            }
                        }
                    })
                })),

            clearActiveSession: () =>
                set((state) => ({
                    sessions: state.sessions.map((session) => {
                        if (session.id !== state.activeSessionId) return session
                        return {
                            ...session,
                            messages: [],
                            results: {}
                        }
                    })
                })),

            testSets: [],
            addTestSet: (testSet) =>
                set((state) => ({ testSets: [...state.testSets, testSet] })),
            deleteTestSet: (id) =>
                set((state) => ({
                    testSets: state.testSets.filter((ts) => ts.id !== id)
                })),

            globalConfig: {
                temperature: 0.7,
                maxTokens: 1000,
                topP: 0.9,
                topK: undefined, // Assuming topK is added and initially undefined
                systemPrompt: 'You are a helpful AI assistant.'
            },
            updateGlobalConfig: (updates) =>
                set((state) => ({
                    globalConfig: { ...state.globalConfig, ...updates }
                }))
        }),
        {
            name: 'nillm-storage'
        }
    )
)
