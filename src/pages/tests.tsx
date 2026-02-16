import { Box, FolderInput, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { PageLayout } from '@/features/layout/PageLayout'
import { useTestSets } from '@/features/tests/hooks/useTestSets'
import { TestSetCard } from '@/features/tests/components/TestSetCard'
import { TestSetEditor } from '@/features/tests/components/TestSetEditor'
import { LanguageSelector } from '@/features/tests/components/LanguageSelector'
import { EmptyState } from '@/features/tests/components/EmptyState'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects
} from '@dnd-kit/core'
import {
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToParentElement } from '@dnd-kit/modifiers'
import { TestSet } from '@/lib/types'
import { useState } from 'react'
import { getBuiltinTests } from '@/data/builtin-tests'

interface SortableTestSetCardProps {
    testSet: TestSet
    isStored: boolean
    isRunning: boolean
    onEdit: (set: TestSet) => void
    onExport: (set: TestSet) => void
    onDelete: (id: string) => void
    onRun: (set: TestSet) => void
    onRunSingle: (prompt: string) => void
}

function SortableTestSetCard({ testSet, ...props }: SortableTestSetCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: testSet.id })

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1
    }

    return (
        <div ref={setNodeRef} style={style} className="h-full">
            <TestSetCard
                testSet={testSet}
                dragHandleProps={{ ...attributes, ...listeners }}
                {...props}
            />
        </div>
    )
}

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
        setEditForm,
        testSetOrder,
        setTestSetOrder
    } = useTestSets()

    const [activeId, setActiveId] = useState<string | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates
        })
    )

    const activeSet = activeId
        ? storedSets.find((s) => s.id === activeId)
        : null

    const builtInTests = getBuiltinTests(language)
    const storedMap = new Map(storedSets.map((s) => [s.id, s]))
    const allSets = [
        ...builtInTests.map((b) => storedMap.get(b.id) || b),
        ...storedSets.filter((s) => !builtInTests.find((b) => b.id === s.id))
    ]

    const sortedSets = [...allSets].sort((a, b) => {
        const indexA = testSetOrder.indexOf(a.id)
        const indexB = testSetOrder.indexOf(b.id)

        if (indexA !== -1 && indexB !== -1) return indexA - indexB
        if (indexA !== -1) return -1
        if (indexB !== -1) return 1
        return 0
    })

    const handleDragEnd = (event: any) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            const oldIndex = sortedSets.findIndex((s) => s.id === active.id)
            const newIndex = sortedSets.findIndex((s) => s.id === over.id)

            if (oldIndex !== -1 && newIndex !== -1) {
                const newOrder = sortedSets.map((s) => s.id)
                const [moved] = newOrder.splice(oldIndex, 1)
                newOrder.splice(newIndex, 0, moved)
                setTestSetOrder(newOrder)
            }
        }
    }

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
                        className="h-9 w-9 px-0 md:w-auto md:px-4 group gap-2 shadow-sm transition-all active:scale-95"
                    >
                        <FolderInput className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="hidden md:inline text-xs font-medium">
                            {isImporting ? 'Importing...' : 'Import'}
                        </span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={openCreateModal}
                        className="h-9 w-9 px-0 md:w-auto md:px-4 group gap-2 transition-all active:scale-95"
                    >
                        <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="hidden md:inline text-xs font-medium">
                            Create
                        </span>
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
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={(e) => setActiveId(e.active.id as string)}
                        onDragEnd={(e) => {
                            handleDragEnd(e)
                            setActiveId(null)
                        }}
                        modifiers={[restrictToParentElement]}
                    >
                        <SortableContext
                            items={sortedSets.map((s) => s.id)}
                            strategy={rectSortingStrategy}
                        >
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 [&>*]:min-w-0">
                                {sortedSets.map((set) => {
                                    const isStored = storedSets.some(
                                        (s) => s.id === set.id
                                    )
                                    return (
                                        <SortableTestSetCard
                                            key={set.id}
                                            testSet={set}
                                            isStored={isStored}
                                            isRunning={runningSetId === set.id}
                                            onEdit={openEditModal}
                                            onExport={handleExport}
                                            onDelete={deleteTestSet}
                                            onRun={handleRunTest}
                                            onRunSingle={handleRunSingle}
                                        />
                                    )
                                })}
                            </div>
                        </SortableContext>
                        <DragOverlay
                            dropAnimation={{
                                sideEffects: defaultDropAnimationSideEffects({
                                    styles: {
                                        active: {
                                            opacity: '0.3'
                                        }
                                    }
                                })
                            }}
                        >
                            {activeId && activeSet ? (
                                <TestSetCard
                                    testSet={activeSet}
                                    isStored={true}
                                    isRunning={runningSetId === activeSet.id}
                                    onEdit={() => {}}
                                    onExport={() => {}}
                                    onDelete={() => {}}
                                    onRun={() => {}}
                                    onRunSingle={() => {}}
                                />
                            ) : null}
                        </DragOverlay>
                    </DndContext>
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
