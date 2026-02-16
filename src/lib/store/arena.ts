import { StateCreator } from 'zustand'

export interface ArenaSlice {
    arenaColumns: number
    arenaSortBy: 'default' | 'name' | 'ttft' | 'tps' | 'rating'
    setArenaColumns: (cols: number) => void
    setArenaSortBy: (
        sortBy: 'default' | 'name' | 'ttft' | 'tps' | 'rating'
    ) => void
    pendingPrompt: string | null
    setPendingPrompt: (content: string | null) => void
}

export const createArenaSlice: StateCreator<ArenaSlice, [], [], ArenaSlice> = (
    set
) => ({
    arenaColumns: 0,
    arenaSortBy: 'default',

    setArenaColumns: (arenaColumns) => set({ arenaColumns }),
    setArenaSortBy: (arenaSortBy) => set({ arenaSortBy }),

    pendingPrompt: null,
    setPendingPrompt: (content) => set({ pendingPrompt: content })
})
