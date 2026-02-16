import { StateCreator } from 'zustand'
import { LLMModel } from '@/lib/types'

export interface ModelsSlice {
    models: LLMModel[]
    activeModelIds: string[]
    addModel: (model: LLMModel) => void
    updateModel: (id: string, updates: Partial<LLMModel>) => void
    deleteModel: (id: string) => void
    toggleModelActivation: (id: string) => void
    toggleAllModels: () => void
    reorderModels: (fromIndex: number, toIndex: number) => void
    setModels: (models: LLMModel[]) => void
    importModels: (newModels: LLMModel[]) => void
}

export const createModelsSlice: StateCreator<
    ModelsSlice,
    [],
    [],
    ModelsSlice
> = (set) => ({
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

    addModel: (model) => set((state) => ({ models: [...state.models, model] })),

    updateModel: (id, updates) =>
        set((state) => ({
            models: state.models.map((m) =>
                m.id === id ? { ...m, ...updates } : m
            )
        })),

    deleteModel: (id) =>
        set((state) => ({
            models: state.models.filter((m) => m.id !== id),
            activeModelIds: state.activeModelIds.filter((mid) => mid !== id)
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

    toggleAllModels: () =>
        set((state) => {
            const allModelIds = state.models
                .filter((m) => m.enabled)
                .map((m) => m.id)
            const isAllSelected =
                state.activeModelIds.length === allModelIds.length
            return {
                activeModelIds: isAllSelected ? [] : allModelIds
            }
        }),

    reorderModels: (fromIndex, toIndex) =>
        set((state) => {
            const newModels = [...state.models]
            const [moved] = newModels.splice(fromIndex, 1)
            newModels.splice(toIndex, 0, moved)
            return { models: newModels }
        }),

    setModels: (models) => set({ models }),

    importModels: (newModels) =>
        set((state) => {
            const existingIds = new Set(state.models.map((m) => m.id))
            const modelsToAdd = newModels.filter((m) => !existingIds.has(m.id))
            return { models: [...state.models, ...modelsToAdd] }
        })
})
