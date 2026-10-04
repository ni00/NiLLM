import { useState, useMemo, useDeferredValue, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { ProviderImportDialog } from '@/features/models/components/ProviderImportDialog'
import { groupModels } from '@/features/models/domain/models'
import type { ProviderConnection } from '@/lib/providers/discovery'
import { useAppStore } from '@/lib/store'
import { VirtualModelList } from '@/features/models/components/VirtualModelList'
import { Cpu, Plus, FolderInput, Download, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageLayout } from '@/features/layout/PageLayout'
import { useModels } from '@/features/models/hooks/useModels'
import { ModelEditor } from '@/features/models/components/ModelEditor'

export function ModelsPage() {
    const {
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
    } = useModels()

    const [providerDialog, setProviderDialog] = useState<
        ProviderConnection | null | false
    >(false)
    const [query, setQuery] = useState('')
    const [reordering, setReordering] = useState(false)
    const search = useDeferredValue(query.toLowerCase())
    const [notice, setNotice] = useState('')
    const groups = useMemo(
        () =>
            groupModels(
                models.filter((model) =>
                    `${model.name} ${model.providerId || ''} ${model.providerName || model.provider}`
                        .toLowerCase()
                        .includes(search)
                )
            ),
        [models, search]
    )
    const openProvider = useCallback(
        (connection: ProviderConnection) => setProviderDialog(connection),
        []
    )
    const selectProvider = useAppStore((state) => state.setModelGroupActive)

    return (
        <PageLayout
            title="Models"
            description="Manage your LLM providers and configuration."
            icon={Cpu}
            isScrollable={false}
            actions={
                <div className="flex items-center gap-2">
                    <Button
                        variant={reordering ? 'default' : 'outline'}
                        aria-pressed={reordering}
                        aria-label={reordering ? 'Done reordering' : 'Reorder'}
                        onClick={() => setReordering((value) => !value)}
                        className="h-9 w-9 px-0 md:w-auto md:px-4 gap-2"
                    >
                        <GripVertical className="h-4 w-4" />
                        <span className="hidden md:inline text-xs">
                            {reordering ? 'Done reordering' : 'Reorder'}
                        </span>
                    </Button>
                    <input
                        type="file"
                        id="import-models"
                        className="hidden"
                        accept=".json"
                        onChange={handleImport}
                    />
                    <Button
                        variant="outline"
                        onClick={() =>
                            document.getElementById('import-models')?.click()
                        }
                        className="h-9 w-9 px-0 md:w-auto md:px-4 group gap-2 shadow-sm transition-all active:scale-95"
                    >
                        <FolderInput className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="hidden md:inline text-xs font-medium">
                            Import
                        </span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleExport}
                        className="h-9 w-9 px-0 md:w-auto md:px-4 group gap-2 shadow-sm transition-all active:scale-95"
                    >
                        <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="hidden md:inline text-xs font-medium">
                            Export
                        </span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setProviderDialog(null)}
                        className="h-9 gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="text-xs">Add provider</span>
                    </Button>
                    {!isAdding && (
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsAdding(true)
                                setEditingModelId(null)
                                setNewModel({
                                    provider: 'openrouter',
                                    enabled: true
                                })
                            }}
                            className="h-9 w-9 px-0 md:w-auto md:px-4 group gap-2 shadow-sm transition-all active:scale-95"
                        >
                            <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            <span className="hidden md:inline text-xs font-medium">
                                Add
                            </span>
                        </Button>
                    )}
                </div>
            }
        >
            <div className="shrink-0 px-4 md:px-6 pt-4 md:pt-6 pb-4 space-y-2">
                <Input
                    aria-label="Search configured models"
                    placeholder="Search models or providers…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                {notice && (
                    <p role="status" className="text-sm text-muted-foreground">
                        {notice}
                    </p>
                )}
            </div>
            <VirtualModelList
                groups={groups}
                reordering={reordering}
                filterKey={search}
                activeModelIds={activeModelIds}
                getModelStats={getModelStats}
                onEdit={handleEditClick}
                onDuplicate={handleDuplicateModel}
                onDelete={deleteModel}
                onToggle={toggleModelActivation}
                onDragEnd={handleDragEnd}
                onFetchProvider={openProvider}
                onSelectProvider={selectProvider}
            />

            {providerDialog !== false && (
                <ProviderImportDialog
                    initialConnection={providerDialog || undefined}
                    onClose={() => setProviderDialog(false)}
                    onAdded={(count) =>
                        setNotice(
                            count
                                ? `Added ${count} models.`
                                : 'All selected models are already configured.'
                        )
                    }
                />
            )}
            <ModelEditor
                isOpen={isAdding}
                editingId={editingModelId}
                modelData={newModel}
                onClose={handleCancel}
                onSave={handleSaveModel}
                onChange={setNewModel}
            />
        </PageLayout>
    )
}

export const Component = ModelsPage
