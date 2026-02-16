import { StateCreator } from 'zustand'
import { ChatSession, BenchmarkResult } from '@/lib/types'

export interface SessionsSlice {
    sessions: ChatSession[]
    activeSessionId: string | null
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
    setSessions: (sessions: ChatSession[]) => void
    clearSessions: () => void
    clearAllResults: () => void
    clearModelResults: (modelId: string) => void
}

export const createSessionsSlice: StateCreator<
    SessionsSlice,
    [],
    [],
    SessionsSlice
> = (set) => ({
    sessions: [] as ChatSession[],
    activeSessionId: null as string | null,

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

    clearActiveSession: () => set({ activeSessionId: null }),

    setSessions: (sessions) => set({ sessions }),

    clearSessions: () => set({ sessions: [], activeSessionId: null }),

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
        }))
})
