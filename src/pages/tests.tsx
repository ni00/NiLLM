import { Box, FolderInput, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { PageLayout } from '@/features/layout/PageLayout'
import { useTestSets } from '@/features/tests/hooks/useTestSets'
import { TestSetCard } from '@/features/tests/components/TestSetCard'
import { TestSetEditor } from '@/features/tests/components/TestSetEditor'
import { LanguageSelector } from '@/features/tests/components/LanguageSelector'
import { EmptyState } from '@/features/tests/components/EmptyState'
import { getBuiltinTests } from '@/data/builtin-tests'

export function TestsPage() {
    const {
        fileInputRef,
        isImporting,
        runningSetId,
        isEditing,
        editingSetId,
        editForm,
        language,
        storedSets,
        setLanguage,
        openCreateModal,
        openEditModal,
        saveTestSet,
        addCase,
        removeCase,
        updateCase,
        moveCase,
        handleImportClick,
        handleFileChange,
        handleExport,
        handleRunTest,
        handleRunSingle,
        deleteTestSet,
        setIsEditing,
        setEditForm
    } = useTestSets()

    const builtInTests = getBuiltinTests(language)
    const storedMap = new Map(storedSets.map((s) => [s.id, s]))
    const allSets = [
        ...builtInTests.map((b) => storedMap.get(b.id) || b),
        ...storedSets.filter((s) => !builtInTests.find((b) => b.id === s.id))
    ]

    return (
        <PageLayout
            title="Test Sets"
            description="Built-in and custom benchmarks for systematic model evaluation."
            icon={Box}
            actions={
                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".json"
                    />
                    <LanguageSelector
                        currentLanguage={language}
                        onChange={setLanguage}
                    />
                    <Button
                        variant="outline"
                        onClick={handleImportClick}
                        disabled={isImporting}
                        className="h-9 px-4 group gap-2 shadow-sm transition-all active:scale-95"
                    >
                        <FolderInput className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-xs font-medium">
                            {isImporting ? 'Importing...' : 'Import'}
                        </span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={openCreateModal}
                        className="h-9 px-4 group gap-2 transition-all active:scale-95"
                    >
                        <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-xs font-medium">Create</span>
                    </Button>
                </div>
            }
        >
            <div className="flex flex-col gap-8 pb-8">
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">
                            Standard Benchmarks
                        </h2>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                        {allSets.map((set) => (
                            <TestSetCard
                                key={set.id}
                                testSet={set}
                                isStored={storedSets.some(
                                    (s) => s.id === set.id
                                )}
                                isRunning={runningSetId === set.id}
                                onEdit={openEditModal}
                                onExport={handleExport}
                                onDelete={deleteTestSet}
                                onRun={handleRunTest}
                                onRunSingle={handleRunSingle}
                            />
                        ))}
                    </div>
                </div>

                {!storedSets.length && (
                    <EmptyState onImport={handleImportClick} />
                )}
            </div>

            <TestSetEditor
                isOpen={isEditing}
                editingSetId={editingSetId}
                editForm={editForm}
                onClose={() => setIsEditing(false)}
                onSave={saveTestSet}
                onAddCase={addCase}
                onRemoveCase={removeCase}
                onUpdateCase={(id, text) => {
                    if (id === 'name') {
                        setEditForm((prev) => ({ ...prev, name: text }))
                    } else {
                        updateCase(id, text)
                    }
                }}
                onMoveCase={moveCase}
                onRunSingle={handleRunSingle}
            />
        </PageLayout>
    )
}

export const Component = TestsPage
