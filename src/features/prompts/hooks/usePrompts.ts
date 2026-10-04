import { useI18n } from '@/lib/i18n'
import { z } from 'zod'
import type { DragEndEvent } from '@dnd-kit/core'
import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/lib/store'
import { useNavigate } from 'react-router'
import { PromptTemplate, PromptVariable } from '@/lib/types'
import { downloadFile, readJsonFile } from '@/lib/utils'

export interface PromptForm {
    title: string
    content: string
    variables: PromptVariable[]
}

export function usePrompts() {
    const t = useI18n()
    const {
        promptTemplates,
        addPromptTemplate,
        updatePromptTemplate,
        deletePromptTemplate,
        setPendingPrompt,
        models,
        reorderPromptTemplates
    } = useAppStore(
        useShallow((state) => ({
            promptTemplates: state.promptTemplates,
            addPromptTemplate: state.addPromptTemplate,
            updatePromptTemplate: state.updatePromptTemplate,
            deletePromptTemplate: state.deletePromptTemplate,
            setPendingPrompt: state.setPendingPrompt,
            models: state.models,
            reorderPromptTemplates: state.reorderPromptTemplates
        }))
    )

    const navigate = useNavigate()

    const [isEditing, setIsEditing] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<PromptForm>({
        title: '',
        content: '',
        variables: []
    })

    const [isUsing, setIsUsing] = useState(false)
    const [usingTemplate, setUsingTemplate] = useState<PromptTemplate | null>(
        null
    )
    const [variableValues, setVariableValues] = useState<
        Record<string, string>
    >({})
    const [isGenerating, setIsGenerating] = useState(false)
    const [selectedModelId, setSelectedModelId] = useState<string>('')

    const extractVariables = (content: string) => {
        const regex = /\{\{([^}]+)\}\}/g
        const vars = new Set<string>()
        let match
        while ((match = regex.exec(content)) !== null) {
            vars.add(match[1].trim())
        }
        return Array.from(vars)
    }

    const handleCreate = () => {
        setEditingId(null)
        setEditForm({ title: '', content: '', variables: [] })
        setIsEditing(true)
    }

    const handleEdit = (tmpl: PromptTemplate) => {
        setEditingId(tmpl.id)
        setEditForm({
            title: tmpl.title,
            content: tmpl.content,
            variables: tmpl.variables || []
        })
        setIsEditing(true)
    }

    const handleDelete = (id: string) => {
        if (confirm(t('Are you sure you want to delete this template?'))) {
            deletePromptTemplate(id)
        }
    }

    const handleSave = () => {
        if (!editForm.title.trim() || !editForm.content.trim()) return

        const extractedNames = extractVariables(editForm.content)
        const newVariables: PromptVariable[] = extractedNames.map((name) => {
            const existing = editForm.variables.find((v) => v.name === name)
            return existing || { name, description: '' }
        })

        const templateData = {
            title: editForm.title,
            content: editForm.content,
            variables: newVariables,
            updatedAt: Date.now()
        }

        if (editingId) {
            updatePromptTemplate(editingId, templateData)
        } else {
            addPromptTemplate({
                id: crypto.randomUUID(),
                createdAt: Date.now(),
                ...templateData
            })
        }
        setIsEditing(false)
    }

    const handleExport = (tmpl: PromptTemplate) => {
        downloadFile(
            JSON.stringify(tmpl, null, 2),
            `${tmpl.title.replace(/\s+/g, '_')}.json`,
            'application/json'
        )
    }

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            const data = z
                .object({
                    title: z.string().min(1),
                    content: z.string().min(1),
                    variables: z
                        .array(
                            z.object({
                                name: z.string(),
                                description: z.string()
                            })
                        )
                        .default([])
                })
                .parse(await readJsonFile(file))
            if (data.title && data.content) {
                addPromptTemplate({
                    ...data,
                    id: crypto.randomUUID(),
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                })
            } else {
                alert(t('Invalid template format'))
            }
        } catch (err) {
            console.error(err)
            alert(t('Failed to read file'))
        }
    }

    const handleUse = (tmpl: PromptTemplate) => {
        const vars = extractVariables(tmpl.content)
        if (vars.length === 0) {
            setPendingPrompt(tmpl.content)
            navigate('/')
        } else {
            setUsingTemplate(tmpl)
            setVariableValues(Object.fromEntries(vars.map((v) => [v, ''])))
            const defaultModel = models.find((m) => m.enabled)
            if (defaultModel) setSelectedModelId(defaultModel.id)
            setIsUsing(true)
        }
    }

    const handleFillAndUse = () => {
        if (!usingTemplate) return
        let finalContent = usingTemplate.content
        Object.entries(variableValues).forEach(([key, val]) => {
            finalContent = finalContent.replaceAll(`{{${key}}}`, val)
        })
        setPendingPrompt(finalContent)
        setIsUsing(false)
        navigate('/')
    }

    const handleAutoFill = async (modelId: string) => {
        if (!usingTemplate) return

        const model = models.find((m) => m.id === modelId)
        if (!model) {
            alert(t('Selected model not found.'))
            return
        }

        setIsGenerating(true)
        try {
            const [{ getProvider }, { generateText }] = await Promise.all([
                import('@/lib/ai-provider'),
                import('ai')
            ])
            const provider = await getProvider(model)
            const prompt = `You are a helpful assistant. 
            I have a prompt template with the following variables. Please generate realistic and creative values for them based on their descriptions.
            
            Template Title: ${usingTemplate.title}
            Template Content: ${usingTemplate.content}
            
            Variables to fill:
            ${usingTemplate.variables.map((v) => `- ${v.name}: ${v.description || 'No description'}`).join('\n')}
            
            Respond ONLY with a JSON object mapping variable names to their generated content. 
            Example: { "var1": "generated content..." }`

            const response = await generateText({
                model: provider(model.providerId || model.id),
                messages: [{ role: 'user', content: prompt }]
            })

            const text = response.text
            let jsonStr = text.trim()
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
            if (jsonMatch) jsonStr = jsonMatch[0]

            const values = z
                .record(z.string(), z.string())
                .parse(JSON.parse(jsonStr))
            setVariableValues((prev) => ({ ...prev, ...values }))
        } catch {
            console.error('Could not generate template variables.')
            alert(
                t(
                    'Could not fill variables. Check provider settings and network access.'
                )
            )
        } finally {
            setIsGenerating(false)
        }
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            const oldIndex = promptTemplates.findIndex(
                (t) => t.id === active.id
            )
            const newIndex = promptTemplates.findIndex((t) => t.id === over.id)
            reorderPromptTemplates(oldIndex, newIndex)
        }
    }

    return {
        promptTemplates,
        isEditing,
        editingId,
        editForm,
        isUsing,
        usingTemplate,
        variableValues,
        isGenerating,
        selectedModelId,
        models,
        extractVariables,
        setEditForm,
        setIsEditing,
        setVariableValues,
        setSelectedModelId,
        setIsUsing,
        handleCreate,
        handleEdit,
        handleDelete,
        handleSave,
        handleExport,
        handleImport,
        handleUse,
        handleFillAndUse,
        handleAutoFill,
        handleDragEnd
    }
}
