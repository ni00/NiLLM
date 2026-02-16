import { StateCreator } from 'zustand'
import { BenchmarkResult } from '@/lib/types'

export interface StreamingSlice {
    streamingData: Record<string, Partial<BenchmarkResult>>
    setStreamingData: (resultId: string, data: Partial<BenchmarkResult>) => void
    setBatchedStreamingData: (
        updates: Record<string, Partial<BenchmarkResult>>
    ) => void
    clearStreamingData: (resultId: string) => void
    clearAllStreamingData: () => void
}

export const createStreamingSlice: StateCreator<
    StreamingSlice,
    [],
    [],
    StreamingSlice
> = (set) => ({
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

    clearAllStreamingData: () => set({ streamingData: {} })
})
