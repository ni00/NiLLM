import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useI18n } from '@/lib/i18n'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/lib/store'
import type { ExperimentDraft, TestSet } from '@/lib/types'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Link } from 'react-router'

export interface ExperimentConfigDialogProps {
    open: boolean
    onClose: () => void
    /** Preselected test set (single-case runs pass a filtered copy). */
    initialTestSet?: TestSet
}

export function ExperimentConfigDialog({
    open,
    onClose,
    initialTestSet
}: ExperimentConfigDialogProps) {
    const t = useI18n()
    const navigate = useNavigate()
    const { models, testSets, createExperiment } = useAppStore(
        useShallow((state) => ({
            models: state.models,
            testSets: state.testSets,
            createExperiment: state.createExperiment
        }))
    )
    const [name, setName] = useState('')
    const [testSetId, setTestSetId] = useState('')
    const [modelIds, setModelIds] = useState<string[]>([])
    const [repetitions, setRepetitions] = useState(1)
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const baseTestSet = initialTestSet ?? testSets[0]
    useEffect(() => {
        if (!open) return
        setName(
            initialTestSet
                ? `${initialTestSet.name} — ${new Date().toLocaleString()}`
                : ''
        )
        setTestSetId(baseTestSet?.id ?? '')
        setError('')
        setSubmitting(false)
    }, [open, initialTestSet, baseTestSet?.id])

    const chatModels = useMemo(
        () => models.filter((m) => m.enabled && (m.mode ?? 'chat') === 'chat'),
        [models]
    )
    const selectedSet =
        initialTestSet ?? testSets.find((s) => s.id === testSetId)
    const caseCount =
        selectedSet?.cases.filter((c) => c.prompt.trim().length > 0).length ?? 0
    const variantCount = 1
    const totalCalls = caseCount * variantCount * repetitions * modelIds.length

    const toggleModel = (id: string) =>
        setModelIds((current) =>
            current.includes(id)
                ? current.filter((entry) => entry !== id)
                : [...current, id]
        )

    const handleConfirm = async () => {
        if (submitting || !selectedSet) return
        const source = selectedSet
        // Freeze the inputs before any async work so late edits cannot leak
        // into the created run.
        const draft: ExperimentDraft = {
            name,
            testSet: source,
            modelIds,
            repetitions,
            overrides: {},
            variants: [{ id: 'default', name: t('Default'), overrides: {} }]
        }
        setSubmitting(true)
        setError('')
        try {
            const runId = await createExperiment(draft)
            onClose()
            navigate(`/experiments/${runId}`)
        } catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : t('Could not create the experiment.')
            )
            setSubmitting(false)
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => !next && !submitting && onClose()}
        >
            <DialogContent className="max-w-2xl flex flex-col max-h-[85vh]">
                <DialogHeader>
                    <DialogTitle>{t('Configure Experiment')}</DialogTitle>
                    <DialogDescription>
                        {t(
                            'Each case runs independently per model; conversation history is never shared.'
                        )}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 min-h-0">
                    <div className="space-y-5 px-1 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="experiment-name">
                                {t('Experiment Name')}
                            </Label>
                            <Input
                                id="experiment-name"
                                value={name}
                                onChange={(event) =>
                                    setName(event.target.value)
                                }
                                placeholder={t('e.g. Nightly regression')}
                            />
                        </div>

                        {!initialTestSet && (
                            <div className="space-y-2">
                                <Label htmlFor="experiment-testset">
                                    {t('Test Set')}
                                </Label>
                                <select
                                    id="experiment-testset"
                                    value={testSetId}
                                    onChange={(event) =>
                                        setTestSetId(event.target.value)
                                    }
                                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                                >
                                    {testSets.length === 0 && (
                                        <option value="">
                                            {t('No test sets yet')}
                                        </option>
                                    )}
                                    {testSets.map((set) => (
                                        <option key={set.id} value={set.id}>
                                            {set.name} ({set.cases.length})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {initialTestSet && (
                            <div className="text-sm text-muted-foreground">
                                {t('Test set')}: <b>{initialTestSet.name}</b> (
                                {caseCount})
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>{t('Models')}</Label>
                            {chatModels.length === 0 ? (
                                <div className="text-sm text-muted-foreground">
                                    {t('No enabled chat models.')}{' '}
                                    <Link
                                        to="/models"
                                        className="text-primary underline"
                                        onClick={onClose}
                                    >
                                        {t('Add a model')}
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {chatModels.map((model) => (
                                        <label
                                            key={model.id}
                                            className="flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer hover:bg-muted/40"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={modelIds.includes(
                                                    model.id
                                                )}
                                                onChange={() =>
                                                    toggleModel(model.id)
                                                }
                                                className="accent-primary"
                                            />
                                            <span className="truncate">
                                                {model.name}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 max-w-48">
                            <Label htmlFor="experiment-repetitions">
                                {t('Repetitions')}
                            </Label>
                            <Input
                                id="experiment-repetitions"
                                type="number"
                                min={1}
                                max={20}
                                value={repetitions}
                                onChange={(event) =>
                                    setRepetitions(
                                        Math.max(
                                            1,
                                            Math.min(
                                                20,
                                                parseInt(event.target.value) ||
                                                    1
                                            )
                                        )
                                    )
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                {t(
                                    'Repeat each case with the same parameters to measure variance.'
                                )}
                            </p>
                        </div>

                        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                            <div className="font-medium">
                                {t('Planned calls')}
                            </div>
                            <div className="text-2xl font-bold tabular-nums">
                                {totalCalls}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {caseCount} × {modelIds.length} × {variantCount}{' '}
                                × {repetitions} (
                                {t('cases × models × groups × repeats')})
                            </div>
                        </div>

                        {error && (
                            <div
                                role="alert"
                                className="text-sm text-destructive rounded-md border border-destructive/40 bg-destructive/10 p-2"
                            >
                                {error}
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        {t('Cancel')}
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={
                            submitting ||
                            !name.trim() ||
                            !selectedSet ||
                            modelIds.length === 0 ||
                            caseCount === 0
                        }
                    >
                        {submitting ? t('Creating…') : t('Create Experiment')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
