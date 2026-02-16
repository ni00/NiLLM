import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Play, Save, X, ArrowUp, ArrowDown } from 'lucide-react'
import type { TestSetForm } from '../hooks/useTestSets'

interface TestSetEditorProps {
    isOpen: boolean
    editingSetId: string | null
    editForm: TestSetForm
    onClose: () => void
    onSave: () => void
    onAddCase: () => void
    onRemoveCase: (id: string) => void
    onUpdateCase: (id: string, text: string) => void
    onMoveCase: (index: number, direction: 'up' | 'down') => void
    onRunSingle: (prompt: string) => void
}

export function TestSetEditor({
    isOpen,
    editingSetId,
    editForm,
    onClose,
    onSave,
    onAddCase,
    onRemoveCase,
    onUpdateCase,
    onMoveCase,
    onRunSingle
}: TestSetEditorProps) {
    if (!isOpen) return null

    const isValid =
        editForm.name &&
        editForm.cases.filter((c) => c.prompt.trim()).length > 0

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-3xl bg-card border border-border/50 shadow-2xl rounded-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-border/50 flex justify-between items-center bg-muted/10">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">
                            {editingSetId ? 'Edit Test Set' : 'Create Test Set'}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Configure your test cases and prompts.
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="p-6 flex-1 overflow-auto space-y-6">
                    <div className="space-y-2">
                        <Label>Set Name</Label>
                        <Input
                            value={editForm.name}
                            onChange={(e) =>
                                onUpdateCase('name', e.target.value)
                            }
                            placeholder="e.g. Challenging Logic Puzzles"
                            className="font-bold"
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label>Test Cases ({editForm.cases.length})</Label>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onAddCase}
                            >
                                <Plus className="h-3 w-3 mr-2" /> Add Case
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {editForm.cases.map((c, idx) => (
                                <div
                                    key={c.id}
                                    className="flex gap-3 items-start group"
                                >
                                    <span className="text-xs text-muted-foreground pt-3 w-6 text-center">
                                        {idx + 1}
                                    </span>
                                    <div className="flex-1">
                                        <Input
                                            value={c.prompt}
                                            onChange={(e) =>
                                                onUpdateCase(
                                                    c.id,
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Enter test prompt..."
                                        />
                                    </div>
                                    <div className="flex gap-1 shrink-0 mt-[2px]">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-primary hover:bg-primary/10 transition-colors"
                                            onClick={() =>
                                                onRunSingle(c.prompt)
                                            }
                                            title="Run this case"
                                        >
                                            <Play className="h-4 w-4" />
                                        </Button>
                                        <div className="flex flex-col gap-0.5">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-4 w-6 p-0 text-muted-foreground hover:text-foreground"
                                                onClick={() =>
                                                    onMoveCase(idx, 'up')
                                                }
                                                disabled={idx === 0}
                                            >
                                                <ArrowUp className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-4 w-6 p-0 text-muted-foreground hover:text-foreground"
                                                onClick={() =>
                                                    onMoveCase(idx, 'down')
                                                }
                                                disabled={
                                                    idx ===
                                                    editForm.cases.length - 1
                                                }
                                            >
                                                <ArrowDown className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                                            onClick={() => onRemoveCase(c.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {editForm.cases.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground italic bg-muted/20 rounded-lg">
                                    No test cases yet. Click &ldquo;Add
                                    Case&rdquo; to start.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-border/50 bg-muted/10 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={onSave} disabled={!isValid}>
                        <Save className="h-4 w-4 mr-2" /> Save Set
                    </Button>
                </div>
            </div>
        </div>
    )
}
