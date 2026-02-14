import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
    LLMModel,
    ChatSession,
    BenchmarkResult,
    TestSet,
    GenerationConfig,
    PromptTemplate
} from './types'

interface AppState {
    models: LLMModel[]
    activeModelIds: string[]
    sessions: ChatSession[]
    language: 'en' | 'zh' | 'ja'

    // Arena UI Persistence
    arenaColumns: number // 0: auto, 1-4: fixed
    arenaSortBy: 'default' | 'name' | 'ttft' | 'tps' | 'rating'
    setArenaColumns: (cols: number) => void
    setArenaSortBy: (
        sortBy: 'default' | 'name' | 'ttft' | 'tps' | 'rating'
    ) => void

    // Data Management
    setSessions: (sessions: ChatSession[]) => void
    clearSessions: () => void
    setLanguage: (lang: 'en' | 'zh' | 'ja') => void

    setModels: (models: LLMModel[]) => void
    importModels: (models: LLMModel[]) => void

    setTestSets: (testSets: TestSet[]) => void
    updateTestSet: (id: string, updates: Partial<TestSet>) => void

    // Bulk Import/Export Helpers
    exportData: () => string
    importData: (data: string) => void

    activeSessionId: string | null

    // Actions
    addModel: (model: LLMModel) => void
    updateModel: (id: string, updates: Partial<LLMModel>) => void
    deleteModel: (id: string) => void
    toggleModelActivation: (id: string) => void
    reorderModels: (fromIndex: number, toIndex: number) => void

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
    testSetOrder: string[]
    addTestSet: (testSet: TestSet) => void

    deleteTestSet: (id: string) => void
    setTestSetOrder: (order: string[]) => void

    globalConfig: GenerationConfig
    updateGlobalConfig: (updates: Partial<GenerationConfig>) => void

    // Prompt Templates
    promptTemplates: PromptTemplate[]
    setPromptTemplates: (templates: PromptTemplate[]) => void
    addPromptTemplate: (template: PromptTemplate) => void
    updatePromptTemplate: (id: string, updates: Partial<PromptTemplate>) => void

    deletePromptTemplate: (id: string) => void
    reorderPromptTemplates: (fromIndex: number, toIndex: number) => void

    // Arena Integration
    pendingPrompt: string | null
    setPendingPrompt: (content: string | null) => void

    // Queue System
    messageQueue: {
        id: string
        prompt: string
        sessionId?: string
        paused?: boolean
    }[]
    isProcessing: boolean
    addToQueue: (prompt: string, sessionId?: string) => void
    removeFromQueue: (id: string) => void
    toggleQueuePause: (id: string) => void
    reorderQueue: (fromIndex: number, toIndex: number) => void
    setProcessing: (isProcessing: boolean) => void
    clearAllResults: () => void
    clearModelResults: (modelId: string) => void

    // Streaming State (Transient)
    streamingData: Record<string, Partial<BenchmarkResult>> // resultId -> partial data
    setStreamingData: (resultId: string, data: Partial<BenchmarkResult>) => void
    setBatchedStreamingData: (
        updates: Record<string, Partial<BenchmarkResult>>
    ) => void
    clearStreamingData: (resultId: string) => void
}

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
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
            ] as LLMModel[],
            activeModelIds: ['gpt-4o'],
            sessions: [] as ChatSession[],
            activeSessionId: null as string | null,
            language: 'en' as 'en' | 'zh' | 'ja',

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
            reorderModels: (fromIndex, toIndex) =>
                set((state) => {
                    const newModels = [...state.models]
                    const [moved] = newModels.splice(fromIndex, 1)
                    newModels.splice(toIndex, 0, moved)
                    return { models: newModels }
                }),

            createSession: (title, modelIds) => {
                const id = crypto.randomUUID() as string
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

            testSets: [] as TestSet[],
            testSetOrder: [] as string[],
            addTestSet: (testSet) =>
                set((state) => ({
                    testSets: [testSet, ...state.testSets],
                    testSetOrder:
                        state.testSetOrder.length > 0
                            ? [testSet.id, ...state.testSetOrder] // Add to top if order exists
                            : [] // Leave empty to trigger default sort
                })),
            deleteTestSet: (id) =>
                set((state) => ({
                    testSets: state.testSets.filter((ts) => ts.id !== id),
                    testSetOrder: state.testSetOrder.filter((o) => o !== id)
                })),

            globalConfig: {
                temperature: 0.7,
                maxTokens: 100000,
                topP: 0.9,
                topK: undefined,
                frequencyPenalty: 0,
                presencePenalty: 0,
                repetitionPenalty: undefined,
                seed: undefined,
                stopSequences: undefined,
                minP: undefined,
                systemPrompt: 'You are a helpful AI assistant.',
                connectTimeout: 15000,
                readTimeout: 30000
            },
            updateGlobalConfig: (updates) =>
                set((state) => ({
                    globalConfig: { ...state.globalConfig, ...updates }
                })),

            // Queue System
            messageQueue: [] as AppState['messageQueue'],
            isProcessing: false,
            addToQueue: (prompt, sessionId) =>
                set((state) => ({
                    messageQueue: [
                        ...state.messageQueue,
                        {
                            id: crypto.randomUUID() as string,
                            prompt,
                            sessionId,
                            paused: false
                        }
                    ]
                })),
            removeFromQueue: (id) =>
                set((state) => ({
                    messageQueue: state.messageQueue.filter((m) => m.id !== id)
                })),
            toggleQueuePause: (id) =>
                set((state) => ({
                    messageQueue: state.messageQueue.map((m) =>
                        m.id === id ? { ...m, paused: !m.paused } : m
                    )
                })),
            reorderQueue: (fromIndex, toIndex) =>
                set((state) => {
                    const newQueue = [...state.messageQueue]
                    const [moved] = newQueue.splice(fromIndex, 1)
                    newQueue.splice(toIndex, 0, moved)
                    return { messageQueue: newQueue }
                }),
            setProcessing: (isProcessing) => set({ isProcessing }),

            setSessions: (sessions) => set({ sessions }),
            clearSessions: () => set({ sessions: [], activeSessionId: null }),
            setLanguage: (language) => set({ language }),

            setModels: (models) => set({ models }),
            importModels: (newModels) =>
                set((state) => {
                    const existingIds = new Set(state.models.map((m) => m.id))
                    const modelsToAdd = newModels.filter(
                        (m) => !existingIds.has(m.id)
                    )
                    return { models: [...state.models, ...modelsToAdd] }
                }),

            promptTemplates: [
                {
                    id: 'builtin-1',
                    title: 'Summarize Text',
                    content:
                        'Please summarize the following text into 3 key points:\n\n{{text}}',
                    variables: [
                        { name: 'text', description: 'The text to summarize' }
                    ],
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                },
                {
                    id: 'builtin-2',
                    title: 'Explain Code',
                    content:
                        'Explain the following code snippet step-by-step:\n\n```{{language}}\n{{code}}\n```',
                    variables: [
                        {
                            name: 'language',
                            description: 'Programming language'
                        },
                        { name: 'code', description: 'The code snippet' }
                    ],
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                },
                {
                    id: 'builtin-3',
                    title: 'Creative Writing',
                    content:
                        'Write a short story about {{topic}} in the style of {{author}}.',
                    variables: [
                        { name: 'topic', description: 'The main subject' },
                        { name: 'author', description: 'The style author' }
                    ],
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                }
            ] as PromptTemplate[],
            addPromptTemplate: (tmpl) =>
                set((state) => ({
                    promptTemplates: [...state.promptTemplates, tmpl]
                })),
            updatePromptTemplate: (id, updates) =>
                set((state) => ({
                    promptTemplates: state.promptTemplates.map((t) =>
                        t.id === id ? { ...t, ...updates } : t
                    )
                })),
            deletePromptTemplate: (id) =>
                set((state) => ({
                    promptTemplates: state.promptTemplates.filter(
                        (t) => t.id !== id
                    )
                })),
            setPromptTemplates: (templates) =>
                set({ promptTemplates: templates }),
            reorderPromptTemplates: (fromIndex, toIndex) =>
                set((state) => {
                    const newTemplates = [...state.promptTemplates]
                    const [moved] = newTemplates.splice(fromIndex, 1)
                    newTemplates.splice(toIndex, 0, moved)
                    return { promptTemplates: newTemplates }
                }),

            pendingPrompt: null,
            setPendingPrompt: (content) => set({ pendingPrompt: content }),

            setTestSets: (testSets) => set({ testSets }),
            updateTestSet: (id, updates) =>
                set((state) => ({
                    testSets: state.testSets.map((ts) =>
                        ts.id === id ? { ...ts, ...updates } : ts
                    )
                })),
            setTestSetOrder: (order) => set({ testSetOrder: order }),

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
                        globalConfig: data.globalConfig || state.globalConfig
                    }))
                } catch (e) {
                    console.error('Failed to import data:', e)
                }
            },

            clearAllResults: () =>
                set((state) => ({
                    sessions: state.sessions.map((s) => ({
                        ...s,
                        results: {}
                    }))
                })),

            clearModelResults: (modelId: string) =>
                set((state) => ({
                    sessions: state.sessions.map((s) => {
                        const newResults = { ...s.results }
                        delete newResults[modelId]
                        return { ...s, results: newResults }
                    })
                })),

            streamingData: {},
            setStreamingData: (resultId, data) =>
                set((state) => ({
                    streamingData: {
                        ...state.streamingData,
                        [resultId]: {
                            ...state.streamingData[resultId],
                            ...data
                        }
                    }
                })),
            setBatchedStreamingData: (updates) =>
                set((state) => {
                    const newStreamingData = { ...state.streamingData }
                    Object.entries(updates).forEach(([id, data]) => {
                        newStreamingData[id] = {
                            ...newStreamingData[id],
                            ...data
                        }
                    })
                    return { streamingData: newStreamingData }
                }),
            clearStreamingData: (resultId) =>
                set((state) => {
                    const newData = { ...state.streamingData }
                    delete newData[resultId]
                    return { streamingData: newData }
                }),

            arenaColumns: 0,
            arenaSortBy: 'default',
            setArenaColumns: (arenaColumns) => set({ arenaColumns }),
            setArenaSortBy: (arenaSortBy) => set({ arenaSortBy })
        }),
        {
            name: 'nillm-storage',
            partialize: (state) =>
                Object.fromEntries(
                    Object.entries(state).filter(
                        ([key]) => !['streamingData'].includes(key)
                    )
                ) as AppState
        }
    )
)
