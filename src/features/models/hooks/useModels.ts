import { useI18n } from '@/lib/i18n'
import { useState, useMemo, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { DragEndEvent } from '@dnd-kit/core'
import { aggregateStatistics } from '@/features/stats/domain/statistics'
import { parseModels, modelSchema } from '@/lib/validation'
import { useAppStore } from '@/lib/store'
import { LLMModel } from '@/lib/types'

export interface ModelFormData {
    name: string
    provider: string
    providerId: string
    providerName?: string
    baseURL?: string
    apiKey?: string
}

export function useModels() {
    const t = useI18n()
    const {
        models,
        addModel,
        updateModel,
        deleteModel,
        activeModelIds,
        toggleModelActivation,
        reorderModels,
        sessions
    } = useAppStore(
        useShallow((state) => ({
            models: state.models,
            addModel: state.addModel,
            updateModel: state.updateModel,
            deleteModel: state.deleteModel,
            activeModelIds: state.activeModelIds,
            toggleModelActivation: state.toggleModelActivation,
            reorderModels: state.reorderModels,
            sessions: state.sessions
        }))
    )

    const [editingModelId, setEditingModelId] = useState<string | null>(null)
    const [isAdding, setIsAdding] = useState(false)
    const [newModel, setNewModel] = useState<Partial<LLMModel>>({
        provider: 'openrouter',
        enabled: true
    })

    const handleSaveModel = () => {
        if (!newModel.name || !newModel.providerId) return

        if (editingModelId) {
            updateModel(editingModelId, newModel)
            setEditingModelId(null)
        } else {
            // New models keep every submitted field (mode/config/pricing/
            // capabilities included) instead of a hand-picked subset that
            // would silently drop them.
            const candidate: LLMModel = {
                id: crypto.randomUUID(),
                name: newModel.name,
                provider:
                    (newModel.provider as LLMModel['provider']) || 'openrouter',
                enabled: true,
                ...(newModel.providerName !== undefined && {
                    providerName: newModel.providerName
                }),
                ...(newModel.providerId !== undefined && {
                    providerId: newModel.providerId
                }),
                ...(newModel.apiKey !== undefined && {
                    apiKey: newModel.apiKey
                }),
                ...(newModel.baseURL !== undefined && {
                    baseURL: newModel.baseURL
                }),
                ...(newModel.mode !== undefined && { mode: newModel.mode }),
                ...(newModel.config !== undefined && {
                    config: newModel.config
                }),
                ...(newModel.pricing !== undefined && {
                    pricing: newModel.pricing
                }),
                ...(newModel.capabilities !== undefined && {
                    capabilities: newModel.capabilities
                })
            }
            try {
                addModel(modelSchema.parse(candidate))
            } catch {
                alert(t('Invalid model data. Check the JSON format.'))
                return
            }
        }
        setIsAdding(false)
        setNewModel({ provider: 'openrouter', enabled: true })
    }

    const handleEditClick = useCallback((model: LLMModel) => {
        setNewModel(model)
        setEditingModelId(model.id)
        setIsAdding(true)
    }, [])

    const handleCancel = () => {
        setIsAdding(false)
        setEditingModelId(null)
        setNewModel({ provider: 'openrouter', enabled: true })
    }

    const handleDuplicateModel = useCallback(
        (model: LLMModel) => {
            const duplicated: LLMModel = {
                ...model,
                id: crypto.randomUUID(),
                name: `${model.name} (Copy)`,
                enabled: true
            }
            addModel(duplicated)
        },
        [addModel]
    )

    const statistics = useMemo(
        () =>
            new Map(
                aggregateStatistics(models, sessions).modelStats.map((stat) => [
                    stat.id,
                    stat
                ])
            ),
        [models, sessions]
    )
    const getModelStats = useCallback(
        (model: LLMModel) => {
            const stats = statistics.get(model.id)
            return {
                avgTPS: stats?.avgTPS ? stats.avgTPS.toFixed(1) : '-',
                avgTTFT: stats?.avgTTFT ? stats.avgTTFT.toFixed(0) : '-',
                totalTokens: stats?.totalTokens || 0
            }
        },
        [statistics]
    )

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event
            if (over && active.id !== over.id) {
                const oldIndex = models.findIndex((m) => m.id === active.id)
                const newIndex = models.findIndex((m) => m.id === over.id)
                reorderModels(oldIndex, newIndex)
            }
        },
        [models, reorderModels]
    )

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            const { readJsonFile } = await import('@/lib/utils')
            const data = await readJsonFile(file)
            if (Array.isArray(data)) {
                const store = useAppStore.getState()
                store.importModels(parseModels(data))
            } else {
                alert(t('Invalid model data format'))
            }
        } catch {
            console.error('Failed to import model data.')
            alert(t('Invalid model data. Check the JSON format.'))
        }
        e.target.value = ''
    }

    const handleExport = async () => {
        const { downloadJson } = await import('@/lib/utils')
        await downloadJson(
            useAppStore
                .getState()
                .models.map((model) => ({ ...model, apiKey: undefined })),
            'nillm-models.json'
        )
    }

    return {
        models,
        activeModelIds,
        isAdding,
        editingModelId,
        newModel,
        setIsAdding,
        setNewModel,
        setEditingModelId,
        handleSaveModel,
        handleEditClick,
        handleCancel,
        handleDuplicateModel,
        getModelStats,
        handleDragEnd,
        handleImport,
        handleExport,
        deleteModel,
        toggleModelActivation
    }
}
