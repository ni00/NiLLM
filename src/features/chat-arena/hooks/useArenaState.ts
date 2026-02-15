import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { LLMModel } from '@/lib/types'

export const useArenaState = () => {
    const { pendingPrompt, setPendingPrompt } = useAppStore()
    const [input, setInput] = useState('')
    const [editingModelId, setEditingModelId] = useState<string | null>(null)
    const [showArenaSettings, setShowArenaSettings] = useState(false)
    const [arenaSettingsTab, setArenaSettingsTab] = useState<
        'models' | 'prompt' | 'params'
    >('models')
    const [expandedModelIds, setExpandedModelIds] = useState<string[]>([])
    const [manuallyExpandedBlocks, setManuallyExpandedBlocks] = useState<
        Record<string, boolean>
    >({})
    const [modelToEdit, setModelToEdit] = useState<LLMModel | null>(null)
    const [editForm, setEditForm] = useState<Partial<LLMModel>>({})
    const [attachments, setAttachments] = useState<File[]>([])

    useEffect(() => {
        if (pendingPrompt) {
            setInput(pendingPrompt)
            setPendingPrompt(null)
        }
    }, [pendingPrompt, setPendingPrompt])

    const toggleExpandAll = (modelId: string) => {
        setExpandedModelIds((prev) =>
            prev.includes(modelId)
                ? prev.filter((id) => id !== modelId)
                : [...prev, modelId]
        )
    }

    const toggleBlock = (blockId: string) => {
        setManuallyExpandedBlocks((prev) => ({
            ...prev,
            [blockId]: !prev[blockId]
        }))
    }

    const startEditingDetails = (model: LLMModel) => {
        setModelToEdit(model)
        setEditForm({ ...model })
    }

    return {
        input,
        setInput,
        editingModelId,
        setEditingModelId,
        showArenaSettings,
        setShowArenaSettings,
        arenaSettingsTab,
        setArenaSettingsTab,
        expandedModelIds,
        setExpandedModelIds,
        toggleExpandAll,
        manuallyExpandedBlocks,
        toggleBlock,
        modelToEdit,
        setModelToEdit,
        editForm,
        setEditForm,
        startEditingDetails,
        attachments,
        setAttachments
    }
}
