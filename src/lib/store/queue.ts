import { StateCreator } from 'zustand'

export interface QueueItem {
    id: string
    prompt: string
    sessionId?: string
    paused?: boolean
}

export interface QueueSlice {
    messageQueue: QueueItem[]
    isProcessing: boolean
    addToQueue: (prompt: string, sessionId?: string) => void
    addBatchToQueue: (items: { prompt: string; sessionId?: string }[]) => void
    removeFromQueue: (id: string) => void
    toggleQueuePause: (id: string) => void
    reorderQueue: (fromIndex: number, toIndex: number) => void
    setProcessing: (isProcessing: boolean) => void
    stopAll: () => void
}

export const createQueueSlice: StateCreator<QueueSlice, [], [], QueueSlice> = (
    set
) => ({
    messageQueue: [] as QueueItem[],
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

    addBatchToQueue: (items) =>
        set((state) => ({
            messageQueue: [
                ...state.messageQueue,
                ...items.map((item) => ({
                    id: crypto.randomUUID() as string,
                    prompt: item.prompt,
                    sessionId: item.sessionId,
                    paused: false
                }))
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

    stopAll: () =>
        set({
            messageQueue: [],
            isProcessing: false
        })
})
