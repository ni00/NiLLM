import { useState } from 'react'
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
    const {
        models,
        addModel,
        updateModel,
        deleteModel,
        activeModelIds,
        toggleModelActivation,
        reorderModels,
        sessions
    } = useAppStore()

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
            addModel({
                id: crypto.randomUUID(),
                name: newModel.name,
                provider: newModel.provider as any,
                providerName: newModel.providerName,
                providerId: newModel.providerId,
                apiKey: newModel.apiKey,
                baseURL: newModel.baseURL,
                enabled: true
            })
        }
        setIsAdding(false)
        setNewModel({ provider: 'openrouter', enabled: true })
    }

    const handleEditClick = (model: LLMModel) => {
        setNewModel(model)
        setEditingModelId(model.id)
        setIsAdding(true)
    }

    const handleCancel = () => {
        setIsAdding(false)
        setEditingModelId(null)
        setNewModel({ provider: 'openrouter', enabled: true })
    }

    const handleDuplicateModel = (model: LLMModel) => {
        const duplicated: LLMModel = {
            ...model,
            id: crypto.randomUUID(),
            name: `${model.name} (Copy)`,
            enabled: true
        }
        addModel(duplicated)
    }

    const getModelStats = (model: LLMModel) => {
        let totalTPS = 0,
            tpsCount = 0
        let totalTTFT = 0,
            ttftCount = 0
        let totalTokens = 0

        sessions.forEach((session: any) => {
            const results = session.results[model.id] || []
            results.forEach((r: any) => {
                if (r.metrics?.tps > 0) {
                    totalTPS += r.metrics.tps
                    tpsCount++
                }
                if (r.metrics?.ttft > 0) {
                    totalTTFT += r.metrics.ttft
                    ttftCount++
                }
                if (r.metrics?.tokenCount > 0) {
                    totalTokens += r.metrics.tokenCount
                }
            })
        })

        return {
            avgTPS: tpsCount > 0 ? (totalTPS / tpsCount).toFixed(1) : '-',
            avgTTFT: ttftCount > 0 ? (totalTTFT / ttftCount).toFixed(0) : '-',
            totalTokens
        }
    }

    const handleDragEnd = (event: any) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            const oldIndex = models.findIndex((m) => m.id === active.id)
            const newIndex = models.findIndex((m) => m.id === over.id)
            reorderModels(oldIndex, newIndex)
        }
    }

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            const { readJsonFile } = await import('@/lib/utils')
            const data = await readJsonFile(file)
            if (Array.isArray(data)) {
                const store = useAppStore.getState()
                store.importModels(data as LLMModel[])
            } else {
                alert('Invalid model data format')
            }
        } catch (err) {
            console.error('Failed to import', err)
        }
        e.target.value = ''
    }

    const handleExport = async () => {
        const { downloadJson } = await import('@/lib/utils')
        await downloadJson(useAppStore.getState().models, 'nillm-models.json')
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
