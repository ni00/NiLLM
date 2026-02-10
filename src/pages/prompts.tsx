import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription
} from '@/components/ui/card'
import {
    BookTemplate,
    Plus,
    Pencil,
    Trash2,
    Play,
    Sparkles,
    X,
    Save,
    FolderOutput,
    ChevronDown,
    Zap,
    FolderInput
} from 'lucide-react'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { PromptTemplate, PromptVariable } from '@/lib/types'
import { generateText } from 'ai'
import { getProvider } from '@/lib/ai-provider'
import { downloadFile, readJsonFile } from '@/lib/utils'
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from '@/components/ui/popover'
import { PageLayout } from '@/features/layout/PageLayout'

export function PromptsPage() {
    const {
        promptTemplates,
        addPromptTemplate,
        updatePromptTemplate,
        deletePromptTemplate,
        setPendingPrompt,
        models,
        activeModelIds
    } = useAppStore()

    const navigate = useNavigate()

    // --- State ---
    const [isEditing, setIsEditing] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<{
        title: string
        content: string
        variables: PromptVariable[]
    }>({ title: '', content: '', variables: [] })

    const [isUsing, setIsUsing] = useState(false)
    const [usingTemplate, setUsingTemplate] = useState<PromptTemplate | null>(
        null
    )
    const [variableValues, setVariableValues] = useState<
        Record<string, string>
    >({})
    const [isGenerating, setIsGenerating] = useState(false)
    const [selectedModelId, setSelectedModelId] = useState<string>('')

    // --- Helpers ---
    const extractVariables = (content: string) => {
        const regex = /\{\{([^}]+)\}\}/g
        const vars = new Set<string>()
        let match
        while ((match = regex.exec(content)) !== null) {
            vars.add(match[1].trim())
        }
        return Array.from(vars)
    }

    // --- Handlers: CRUD ---
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
        if (confirm('Are you sure you want to delete this template?')) {
            deletePromptTemplate(id)
        }
    }

    const handleSave = () => {
        if (!editForm.title.trim() || !editForm.content.trim()) return

        // Sync variables from content
        const extractedNames = extractVariables(editForm.content)
        // Keep existing descriptions if name matches
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

    // --- Handlers: Import/Export ---
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
            const data = await readJsonFile(file)
            if (data.title && data.content) {
                addPromptTemplate({
                    ...data,
                    id: crypto.randomUUID(),
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                })
            } else {
                alert('Invalid template format')
            }
        } catch (err) {
            console.error(err)
            alert('Failed to read file')
        }
    }

    // --- Handlers: Usage ---
    const handleUse = (tmpl: PromptTemplate) => {
        const vars = extractVariables(tmpl.content)
        if (vars.length === 0) {
            // No variables, just use directly
            setPendingPrompt(tmpl.content)
            navigate('/')
        } else {
            // Open fill dialog
            setUsingTemplate(tmpl)
            setVariableValues(Object.fromEntries(vars.map((v) => [v, ''])))
            // Default model selection logic: try active models first, then any enabled model
            const defaultModel =
                models.find((m) => activeModelIds.includes(m.id)) ||
                models.find((m) => m.enabled)
            if (defaultModel) setSelectedModelId(defaultModel.id)
            setIsUsing(true)
        }
    }

    const handleFillAndUse = () => {
        if (!usingTemplate) return
        let finalContent = usingTemplate.content
        Object.entries(variableValues).forEach(([key, val]) => {
            finalContent = finalContent.replace(
                new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
                val
            )
        })
        setPendingPrompt(finalContent)
        setIsUsing(false)
        navigate('/')
    }

    const handleAutoFill = async (modelId: string) => {
        if (!usingTemplate) return

        const model = models.find((m) => m.id === modelId)
        if (!model) {
            alert('Selected model not found.')
            return
        }

        setIsGenerating(true)
        try {
            const provider = getProvider(model)
            const prompt = `You are a helpful assistant. 
            I have a prompt template with the following variables. Please generate realistic and creative values for them based on their descriptions.
            
            Template Title: ${usingTemplate.title}
            Template Content: ${usingTemplate.content}
            
            Variables to fill:
            ${usingTemplate.variables.map((v) => `- ${v.name}: ${v.description || 'No description'}`).join('\n')}
            
            Respond ONLY with a JSON object mapping variable names to their generated content. 
            Example: { "var1": "generated content..." }`

            const response = await generateText({
                model: provider(model.providerId!),
                messages: [{ role: 'user', content: prompt }],
                headers: model.apiKey
                    ? { Authorization: `Bearer ${model.apiKey}` }
                    : undefined
            })

            const text = response.text
            let jsonStr = text.trim()
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
            if (jsonMatch) jsonStr = jsonMatch[0]

            const values = JSON.parse(jsonStr)
            setVariableValues((prev) => ({ ...prev, ...values }))
        } catch (e) {
            console.error(e)
            alert('Failed to auto-fill variables. See console.')
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <PageLayout
            title="Prompt Templates"
            description="Manage and use reusable prompt templates with variable support."
            icon={BookTemplate}
            actions={
                <div className="flex gap-2">
                    <div className="relative">
                        <input
                            type="file"
                            onChange={handleImport}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            accept=".json"
                            title="Import JSON Template"
                        />
                        <Button
                            variant="outline"
                            className="h-10 px-4 group gap-2"
                        >
                            <FolderInput className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            <span className="text-xs font-medium">Import</span>
                        </Button>
                    </div>
                    <Button
                        variant="outline"
                        onClick={handleCreate}
                        className="h-10 px-4 group gap-2"
                    >
                        <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-xs font-medium">Create</span>
                    </Button>
                </div>
            }
        >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pb-10">
                {promptTemplates.map((tmpl) => (
                    <Card
                        key={tmpl.id}
                        className="group relative hover:shadow-lg transition-all"
                    >
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <CardTitle
                                        className="text-lg line-clamp-1"
                                        title={tmpl.title}
                                    >
                                        {tmpl.title}
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        {tmpl.variables.length} variables •{' '}
                                        {new Date(
                                            tmpl.updatedAt
                                        ).toLocaleDateString()}
                                    </CardDescription>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEdit(tmpl)}
                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleExport(tmpl)}
                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                    >
                                        <FolderOutput className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(tmpl.id)}
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-muted/30 p-3 rounded-md text-xs font-mono text-muted-foreground line-clamp-3 mb-4 h-16">
                                {tmpl.content}
                            </div>
                            <Button
                                className="w-full gap-2"
                                onClick={() => handleUse(tmpl)}
                            >
                                <Play className="h-4 w-4" /> Use Template
                            </Button>
                        </CardContent>
                    </Card>
                ))}
                {promptTemplates.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
                        <BookTemplate className="h-10 w-10 mb-4 opacity-30" />
                        <p>No templates yet. Create one to get started!</p>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-2xl bg-card border shadow-2xl rounded-xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
                        <div className="p-4 border-b flex justify-between items-center bg-muted/20">
                            <h3 className="font-semibold">
                                {editingId ? 'Edit Template' : 'New Template'}
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsEditing(false)}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4">
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input
                                    value={editForm.title}
                                    onChange={(e) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            title: e.target.value
                                        }))
                                    }
                                    placeholder="My Awesome Prompt"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Content</Label>
                                <div className="text-xs text-muted-foreground mb-1">
                                    Use <code>{'{{variable}}'}</code> to define
                                    variables.
                                </div>
                                <Textarea
                                    value={editForm.content}
                                    onChange={(e) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            content: e.target.value
                                        }))
                                    }
                                    className="min-h-[200px] font-mono text-sm"
                                    placeholder="Write a story about {{topic}} in the style of {{author}}..."
                                />
                            </div>

                            {/* Variable Descriptions */}
                            {extractVariables(editForm.content).length > 0 && (
                                <div className="space-y-3 pt-4 border-t">
                                    <Label>Variable Descriptions</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Describe your variables to help the AI
                                        auto-fill them.
                                    </p>
                                    {extractVariables(editForm.content).map(
                                        (vName) => {
                                            const match =
                                                editForm.variables.find(
                                                    (v) => v.name === vName
                                                )
                                            return (
                                                <div
                                                    key={vName}
                                                    className="grid grid-cols-[100px_1fr] gap-2 items-center"
                                                >
                                                    <span className="text-xs font-mono font-medium text-right pr-2">
                                                        {vName}
                                                    </span>
                                                    <Input
                                                        value={
                                                            match?.description ||
                                                            ''
                                                        }
                                                        onChange={(e) => {
                                                            const val =
                                                                e.target.value
                                                            setEditForm(
                                                                (prev) => {
                                                                    const newVars =
                                                                        [
                                                                            ...prev.variables
                                                                        ]
                                                                    const idx =
                                                                        newVars.findIndex(
                                                                            (
                                                                                v
                                                                            ) =>
                                                                                v.name ===
                                                                                vName
                                                                        )
                                                                    if (
                                                                        idx >= 0
                                                                    )
                                                                        newVars[
                                                                            idx
                                                                        ] = {
                                                                            ...newVars[
                                                                                idx
                                                                            ],
                                                                            description:
                                                                                val
                                                                        }
                                                                    else
                                                                        newVars.push(
                                                                            {
                                                                                name: vName,
                                                                                description:
                                                                                    val
                                                                            }
                                                                        )
                                                                    return {
                                                                        ...prev,
                                                                        variables:
                                                                            newVars
                                                                    }
                                                                }
                                                            )
                                                        }}
                                                        placeholder={`Description for ${vName}`}
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                            )
                                        }
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t bg-muted/20 flex justify-end gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => setIsEditing(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={!editForm.title || !editForm.content}
                            >
                                <Save className="h-4 w-4 mr-2" /> Save
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Use/Fill Modal */}
            {isUsing && usingTemplate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-xl bg-card border shadow-2xl rounded-xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
                        <div className="p-4 border-b flex justify-between items-center bg-muted/20">
                            <h3 className="font-semibold">
                                Fill Variables: {usingTemplate.title}
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsUsing(false)}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4">
                            <div className="flex justify-between gap-2 items-center">
                                <span className="text-xs text-muted-foreground italic">
                                    Manually enter values or use AI to
                                    auto-fill.
                                </span>
                                {models.length === 0 ? (
                                    <span className="text-xs text-destructive">
                                        No models available. Add models in
                                        settings.
                                    </span>
                                ) : (
                                    <SelectDropdown
                                        value={selectedModelId}
                                        onChange={(val) => {
                                            setSelectedModelId(val)
                                            handleAutoFill(val)
                                        }}
                                        options={models
                                            .filter((m) => m.enabled)
                                            .map((m) => ({
                                                label: m.name,
                                                value: m.id,
                                                description:
                                                    m.providerName || m.provider
                                            }))}
                                        placeholder="Select Model..."
                                        width={200}
                                        disabled={
                                            models.length === 0 || isGenerating
                                        }
                                    />
                                )}
                            </div>

                            {usingTemplate.variables.map((v) => (
                                <div key={v.name} className="space-y-1">
                                    <div className="flex justify-between">
                                        <Label className="font-mono text-xs">
                                            {v.name}
                                        </Label>
                                        <span className="text-[10px] text-muted-foreground">
                                            {v.description}
                                        </span>
                                    </div>
                                    <Textarea
                                        value={variableValues[v.name] || ''}
                                        onChange={(e) =>
                                            setVariableValues((prev) => ({
                                                ...prev,
                                                [v.name]: e.target.value
                                            }))
                                        }
                                        placeholder={`Value for ${v.name}...`}
                                        className="h-20"
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t bg-muted/20 flex justify-end gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => setIsUsing(false)}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleFillAndUse}>
                                <Play className="h-4 w-4 mr-2" /> Fill & Use
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </PageLayout>
    )
}

export const Component = PromptsPage
