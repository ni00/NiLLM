import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Plus,
    Trash2,
    Play,
    Save,
    ArrowUp,
    ArrowDown,
    CircleAlert
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogBody,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import type { TestSet, TestCase } from '@/lib/types'
import { testCaseSchema } from '@/lib/validation'
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

type ScoringMode = 'none' | 'exact' | 'contains' | 'json' | 'decision'

// Legacy expected answers without an explicit rule are exact matches.
function getScoringMode(c: TestCase): ScoringMode {
    if (c.evaluation) return c.evaluation.type
    return c.expected !== undefined ? 'exact' : 'none'
}

function applyScoringMode(c: TestCase, mode: ScoringMode): Partial<TestCase> {
    if (mode === 'none') return { expected: undefined, evaluation: undefined }
    return {
        expected: c.expected ?? '',
        ...(mode === 'exact'
            ? { evaluation: undefined }
            : { evaluation: { type: mode } })
    }
}

function getCaseIssue(c: TestCase): string | null {
    const result = testCaseSchema.safeParse(c)
    return result.success ? null : (result.error.issues[0]?.message ?? null)
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

    const caseIssues = new Map<string, string | null>()
    for (const c of editForm.cases) {
        caseIssues.set(c.id, getCaseIssue(c))
    }

    const hasIssues = [...caseIssues.values()].some((issue) => issue !== null)

    const isValid =
        editForm.name.trim() &&
        editForm.cases.filter((c) => c.prompt.trim()).length > 0 &&
        !hasIssues

    const draftSet: TestSet = {
        id: editingSetId ?? 'draft',
        name: editForm.name,
        cases: editForm.cases,
        createdAt: 0
    }

    const scoringOptions: { value: ScoringMode; label: string }[] = [
        { value: 'none', label: t('No scoring') },
        { value: 'exact', label: t('Exact match') },
        { value: 'contains', label: t('Contains') },
        { value: 'json', label: t('JSON') },
        { value: 'decision', label: t('Decision values') }
    ]

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl">
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

                <DialogBody>
                    <div className="space-y-6">
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
                            <div className="flex justify-between items-center gap-2 flex-wrap">
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
                                {editForm.cases.map((c, idx) => {
                                    const issue = caseIssues.get(c.id) ?? null
                                    const mode = getScoringMode(c)
                                    const promptId = `case-prompt-${c.id}`
                                    const expectedId = `case-expected-${c.id}`
                                    return (
                                        <div
                                            key={c.id}
                                            className="rounded-lg border p-3 space-y-2"
                                        >
                                            <div className="flex gap-3 items-start flex-wrap">
                                                <span className="text-xs text-muted-foreground pt-3 w-6 text-center">
                                                    {idx + 1}
                                                </span>
                                                <div className="flex-1 min-w-[12rem] space-y-1">
                                                    <Label
                                                        htmlFor={promptId}
                                                        className="text-xs text-muted-foreground"
                                                    >
                                                        {t('Prompt')}
                                                    </Label>
                                                    <Textarea
                                                        id={promptId}
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
                                                        className="text-primary hover:bg-primary/10 transition-colors"
                                                        onClick={() =>
                                                            onRunSingle(
                                                                c,
                                                                draftSet
                                                            )
                                                        }
                                                        aria-label={t(
                                                            'Run this case'
                                                        )}
                                                        title={t(
                                                            'Run this case'
                                                        )}
                                                    >
                                                        <Play className="h-4 w-4" />
                                                    </Button>
                                                    <div className="flex flex-col gap-0.5 justify-center">
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
                                                            aria-label={t(
                                                                'Move case up'
                                                            )}
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
                                                            aria-label={t(
                                                                'Move case down'
                                                            )}
                                                        >
                                                            <ArrowDown className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground hover:text-destructive transition-colors"
                                                        onClick={() =>
                                                            onRemoveCase(c.id)
                                                        }
                                                        aria-label={t(
                                                            'Remove case'
                                                        )}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-start">
                                                <div className="space-y-1">
                                                    <Label
                                                        htmlFor={`case-scoring-${c.id}`}
                                                        className="text-xs text-muted-foreground"
                                                    >
                                                        {t('Scoring')}
                                                    </Label>
                                                    <SelectDropdown
                                                        value={mode}
                                                        ariaLabel={t('Scoring')}
                                                        onChange={(value) =>
                                                            onUpdateCase(
                                                                c.id,
                                                                applyScoringMode(
                                                                    c,
                                                                    value as ScoringMode
                                                                )
                                                            )
                                                        }
                                                        options={scoringOptions}
                                                    />
                                                </div>
                                                {mode !== 'none' && (
                                                    <div className="space-y-1">
                                                        <Label
                                                            htmlFor={expectedId}
                                                            className="text-xs text-muted-foreground"
                                                        >
                                                            {t(
                                                                'Expected answer'
                                                            )}
                                                        </Label>
                                                        <Input
                                                            id={expectedId}
                                                            value={
                                                                c.expected ?? ''
                                                            }
                                                            onChange={(e) =>
                                                                onUpdateCase(
                                                                    c.id,
                                                                    {
                                                                        expected:
                                                                            e
                                                                                .target
                                                                                .value
                                                                    }
                                                                )
                                                            }
                                                            placeholder={
                                                                mode === 'json'
                                                                    ? t(
                                                                          'Expected JSON value'
                                                                      )
                                                                    : t(
                                                                          'Expected answer'
                                                                      )
                                                            }
                                                            className="text-xs bg-muted/20"
                                                            aria-invalid={
                                                                issue !== null
                                                            }
                                                            aria-describedby={
                                                                issue !== null
                                                                    ? `${expectedId}-error`
                                                                    : undefined
                                                            }
                                                        />
                                                        {mode ===
                                                            'decision' && (
                                                            <>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {t(
                                                                        'Expected values by question ID: Choice label, zero-based Score, or Noul boolean/probability.'
                                                                    )}
                                                                </p>
                                                                <Label
                                                                    htmlFor={`case-tolerance-${c.id}`}
                                                                >
                                                                    {t(
                                                                        'Numeric tolerance'
                                                                    )}
                                                                </Label>
                                                                <Input
                                                                    id={`case-tolerance-${c.id}`}
                                                                    type="number"
                                                                    min={0}
                                                                    step={0.01}
                                                                    value={
                                                                        c
                                                                            .evaluation
                                                                            ?.tolerance ??
                                                                        0.1
                                                                    }
                                                                    onChange={(
                                                                        e
                                                                    ) =>
                                                                        onUpdateCase(
                                                                            c.id,
                                                                            {
                                                                                evaluation:
                                                                                    {
                                                                                        type: 'decision',
                                                                                        tolerance:
                                                                                            e
                                                                                                .target
                                                                                                .value ===
                                                                                            ''
                                                                                                ? undefined
                                                                                                : Number(
                                                                                                      e
                                                                                                          .target
                                                                                                          .value
                                                                                                  )
                                                                                    }
                                                                            }
                                                                        )
                                                                    }
                                                                />
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            {issue && (
                                                <p
                                                    id={`${expectedId}-error`}
                                                    className="flex items-start gap-1.5 text-xs text-destructive"
                                                >
                                                    <CircleAlert className="h-3.5 w-3.5 mt-[1px] shrink-0" />
                                                    <span>{t(issue)}</span>
                                                </p>
                                            )}
                                        </div>
                                    )
                                })}
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
                </DialogBody>

                <DialogFooter className="sm:items-center gap-2">
                    {hasIssues && (
                        <p
                            id="test-set-save-error"
                            className="flex items-center gap-1.5 text-xs text-destructive mr-auto"
                        >
                            <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                            {t(
                                'Please fix the highlighted cases before saving.'
                            )}
                        </p>
                    )}
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
