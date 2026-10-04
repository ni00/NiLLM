import type { AppState } from './index'
import { StateCreator } from 'zustand'

export interface QueueItem {
    id: string
    prompt: string
    sessionId?: string
    paused?: boolean
    /** Retries one arena result through the single processor. */
    retry?: { modelId: string; resultId: string }
    /** Set when dispatching failed; item pauses instead of vanishing. */
    error?: string
}

export interface QueueSlice {
    messageQueue: QueueItem[]
    isProcessing: boolean
    /** Shared lock: only one judging batch may run at a time. */
    isJudging: boolean
    setJudging: (flag: boolean) => void
    addToQueue: (prompt: string, sessionId?: string) => void
    addRetryToQueue: (
        sessionId: string,
        modelId: string,
        resultId: string
    ) => void
    removeFromQueue: (id: string) => void
    toggleQueuePause: (id: string) => void
    reorderQueue: (fromIndex: number, toIndex: number) => void
    failQueueItem: (id: string, message: string) => void
    setProcessing: (isProcessing: boolean) => void
}

export const createQueueSlice: StateCreator<AppState, [], [], QueueSlice> = (
    set,
    get
) => ({
    messageQueue: [] as QueueItem[],
    isProcessing: false,
    isJudging: false,

    setJudging: (flag) => set({ isJudging: flag }),

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

    addRetryToQueue: (sessionId, modelId, resultId) => {
        const state = get()
        const session = state.sessions.find((s) => s.id === sessionId)
        const exists = session?.results[modelId]?.some(
            (result) => result.id === resultId
        )
        const alreadyQueued = state.messageQueue.some(
            (item) => item.retry?.resultId === resultId
        )
        const prompt = session?.results[modelId]?.find(
            (result) => result.id === resultId
        )?.prompt
        if (!exists || alreadyQueued || prompt === undefined) return
        set((current) => ({
            messageQueue: [
                ...current.messageQueue,
                {
                    id: crypto.randomUUID() as string,
                    prompt,
                    sessionId,
                    paused: false,
                    retry: { modelId, resultId }
                }
            ]
        }))
    },

    removeFromQueue: (id) =>
        set((state) => ({
            messageQueue: state.messageQueue.filter((m) => m.id !== id)
        })),

    // Unpausing also clears the dispatch error so the item can run again.
    toggleQueuePause: (id) =>
        set((state) => ({
            messageQueue: state.messageQueue.map((m) =>
                m.id === id
                    ? {
                          ...m,
                          paused: !m.paused,
                          error: m.paused ? undefined : m.error
                      }
                    : m
            )
        })),

    reorderQueue: (fromIndex, toIndex) =>
        set((state) => {
            const newQueue = [...state.messageQueue]
            const [moved] = newQueue.splice(fromIndex, 1)
            newQueue.splice(toIndex, 0, moved)
            return { messageQueue: newQueue }
        }),

    failQueueItem: (id, message) =>
        set((state) => ({
            messageQueue: state.messageQueue.map((m) =>
                m.id === id ? { ...m, paused: true, error: message } : m
            )
        })),

    setProcessing: (isProcessing) => set({ isProcessing })
})
