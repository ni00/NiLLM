import { BookTemplate, Plus, FolderInput } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageLayout } from '@/features/layout/PageLayout'
import { usePrompts } from '@/features/prompts/hooks/usePrompts'
import { PromptCard } from '@/features/prompts/components/PromptCard'
import { PromptEditor } from '@/features/prompts/components/PromptEditor'
import { VariableFiller } from '@/features/prompts/components/VariableFiller'
import { EmptyPrompts } from '@/features/prompts/components/EmptyPrompts'

export function PromptsPage() {
    const {
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
        handleAutoFill
    } = usePrompts()

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
                    <PromptCard
                        key={tmpl.id}
                        template={tmpl}
                        onEdit={handleEdit}
                        onExport={handleExport}
                        onDelete={handleDelete}
                        onUse={handleUse}
                    />
                ))}
                {promptTemplates.length === 0 && (
                    <EmptyPrompts onImport={() => {}} onCreate={handleCreate} />
                )}
            </div>

            <PromptEditor
                isOpen={isEditing}
                editingId={editingId}
                editForm={editForm}
                onClose={() => setIsEditing(false)}
                onSave={handleSave}
                onChange={setEditForm}
            />

            <VariableFiller
                isOpen={isUsing}
                template={usingTemplate}
                variableValues={variableValues}
                selectedModelId={selectedModelId}
                isGenerating={isGenerating}
                models={models}
                onClose={() => setIsUsing(false)}
                onUse={handleFillAndUse}
                onAutoFill={handleAutoFill}
                onChangeVariable={(name, value) =>
                    setVariableValues((prev) => ({ ...prev, [name]: value }))
                }
                onSelectModel={setSelectedModelId}
            />
        </PageLayout>
    )
}

export const Component = PromptsPage
