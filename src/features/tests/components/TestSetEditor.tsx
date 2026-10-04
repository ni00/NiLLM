import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Play, Save, ArrowUp, ArrowDown } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { TestSet, TestCase } from '@/lib/types'
import type { TestSetForm } from '../hooks/useTestSets'

interface TestSetEditorProps {
    isOpen: boolean
    editingSetId: string | null
    editForm: TestSetForm
    onClose: () => void
    onSave: () => void
    onAddCase: () => void
    onRemoveCase: (id: string) => void
    onUpdateCase: (id: string, updates: Partial<TestCase>) => void
    onNameChange: (name: string) => void
    onMoveCase: (index: number, direction: 'up' | 'down') => void
    onRunSingle: (testCase: TestCase, testSet: TestSet) => void
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
    onNameChange,
    onMoveCase,
    onRunSingle
}: TestSetEditorProps) {
    const t = useI18n()

    const isValid =
        editForm.name &&
        editForm.cases.filter((c) => c.prompt.trim()).length > 0

    const draftSet: TestSet = {
        id: editingSetId ?? 'draft',
        name: editForm.name,
        cases: editForm.cases,
        createdAt: 0
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>
                        {editingSetId
                            ? t('Edit Test Set')
                            : t('Create Test Set')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('Configure your test cases and prompts.')}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 min-h-0">
                    <div className="p-1 space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="test-set-name">
                                {t('Set Name')}
                            </Label>
                            <Input
                                id="test-set-name"
                                value={editForm.name}
                                onChange={(e) => onNameChange(e.target.value)}
                                placeholder={t(
                                    'e.g. Challenging Logic Puzzles'
                                )}
                                className="font-bold"
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label>
                                    {t('Test Cases ({count})', {
                                        count: editForm.cases.length
                                    })}
                                </Label>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onAddCase}
                                >
                                    <Plus className="h-3 w-3 mr-2" />{' '}
                                    {t('Add Case')}
                                </Button>
                            </div>
                            <div className="space-y-3">
                                {editForm.cases.map((c, idx) => (
                                    <div
                                        key={c.id}
                                        className="rounded-lg border p-3 space-y-2"
                                    >
                                        <div className="flex gap-3 items-start">
                                            <span className="text-xs text-muted-foreground pt-3 w-6 text-center">
                                                {idx + 1}
                                            </span>
                                            <div className="flex-1">
                                                <Input
                                                    value={c.prompt}
                                                    onChange={(e) =>
                                                        onUpdateCase(c.id, {
                                                            prompt: e.target
                                                                .value
                                                        })
                                                    }
                                                    placeholder={t(
                                                        'Enter test prompt...'
                                                    )}
                                                />
                                            </div>
                                            <div className="flex gap-1 shrink-0 mt-[2px]">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-primary hover:bg-primary/10 transition-colors"
                                                    onClick={() =>
                                                        onRunSingle(c, draftSet)
                                                    }
                                                    title={t('Run this case')}
                                                >
                                                    <Play className="h-4 w-4" />
                                                </Button>
                                                <div className="flex flex-col gap-0.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-4 w-6 p-0 text-muted-foreground hover:text-foreground"
                                                        onClick={() =>
                                                            onMoveCase(
                                                                idx,
                                                                'up'
                                                            )
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
                                                            onMoveCase(
                                                                idx,
                                                                'down'
                                                            )
                                                        }
                                                        disabled={
                                                            idx ===
                                                            editForm.cases
                                                                .length -
                                                                1
                                                        }
                                                    >
                                                        <ArrowDown className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                                                    onClick={() =>
                                                        onRemoveCase(c.id)
                                                    }
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <Input
                                            value={c.expected ?? ''}
                                            onChange={(e) =>
                                                onUpdateCase(c.id, {
                                                    expected:
                                                        e.target.value ||
                                                        undefined
                                                })
                                            }
                                            placeholder={t(
                                                'Expected answer (optional)'
                                            )}
                                            className="text-xs bg-muted/20"
                                        />
                                    </div>
                                ))}
                                {editForm.cases.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground italic bg-muted/20 rounded-lg">
                                        {t(
                                            'No test cases yet. Click “Add Case” to start.'
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    <Button onClick={onSave} disabled={!isValid}>
                        <Save className="h-4 w-4 mr-2" /> {t('Save Set')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
