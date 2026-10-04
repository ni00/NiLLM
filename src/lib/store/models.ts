import type { AppState } from './index'
import { StateCreator } from 'zustand'
import { LLMModel } from '@/lib/types'

export interface ModelsSlice {
    models: LLMModel[]
    activeModelIds: string[]
    addModel: (model: LLMModel) => void
    addModels: (models: LLMModel[]) => void
    setModelGroupActive: (ids: string[], active: boolean) => void
    updateModel: (id: string, updates: Partial<LLMModel>) => void
    deleteModel: (id: string) => void
    toggleModelActivation: (id: string) => void
    toggleAllModels: () => void
    reorderModels: (fromIndex: number, toIndex: number) => void
    setModels: (models: LLMModel[]) => void
    importModels: (newModels: LLMModel[]) => void
}

export const createModelsSlice: StateCreator<AppState, [], [], ModelsSlice> = (
    set
) => ({
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

    addModels: (models) =>
        set((state) => {
            const ids = new Set(state.models.map((model) => model.id))
            return {
                models: [
                    ...state.models,
                    ...models.filter((model) => {
                        if (ids.has(model.id)) return false
                        ids.add(model.id)
                        return true
                    })
                ]
            }
        }),
    setModelGroupActive: (ids, active) =>
        set((state) => {
            const selected = new Set(state.activeModelIds)
            const validIds = new Set(
                state.models
                    .filter((model) => model.enabled)
                    .map((model) => model.id)
            )
            for (const id of ids) {
                if (active && validIds.has(id)) selected.add(id)
                else selected.delete(id)
            }
            return { activeModelIds: [...selected] }
        }),

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
            if (!state.models.some((model) => model.id === id && model.enabled))
                return state
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
                allModelIds.length > 0 &&
                allModelIds.every((id) => state.activeModelIds.includes(id))
            return {
                activeModelIds: isAllSelected ? [] : allModelIds
            }
        }),

    reorderModels: (fromIndex, toIndex) =>
        set((state) => {
            if (
                fromIndex < 0 ||
                toIndex < 0 ||
                fromIndex >= state.models.length ||
                toIndex >= state.models.length
            )
                return state
            const newModels = [...state.models]
            const [moved] = newModels.splice(fromIndex, 1)
            newModels.splice(toIndex, 0, moved)
            return { models: newModels }
        }),

    setModels: (models) =>
        set((state) => ({
            models,
            activeModelIds: state.activeModelIds.filter((id) =>
                models.some((m) => m.id === id && m.enabled)
            )
        })),

    importModels: (newModels) =>
        set((state) => {
            const existingIds = new Set(state.models.map((m) => m.id))
            const modelsToAdd = newModels.filter((m) => {
                if (existingIds.has(m.id)) return false
                existingIds.add(m.id)
                return true
            })
            return { models: [...state.models, ...modelsToAdd] }
        })
})
