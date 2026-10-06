import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { useI18n } from '@/lib/i18n'
import { useAppStore } from '@/lib/store'
import type {
    ExperimentDraft,
    ExperimentVariant,
    GenerationConfigPatch,
    TestSet
} from '@/lib/types'
import {
    experimentVariantSchema,
    generationConfigPatchSchema,
    testSetSchema
} from '@/lib/validation'
import {
    applyModelCapabilities,
    mergeConfigPatch,
    resetConfigField,
    resolveGenerationConfig
} from '@/lib/generation-config'
import { MAX_EXPERIMENT_TASKS } from '../domain/plan'
import { ConfigEditor } from '@/features/chat-arena/components/ConfigEditor'
import { ParameterPresetControls } from '@/features/chat-arena/components/ParameterPresetControls'
import {
    Dialog,
    DialogContent,
    DialogBody,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface ExperimentConfigDialogProps {
    open: boolean
    onClose: () => void
    initialTestSet?: TestSet
}

export function ExperimentConfigDialog({
    open,
    onClose,
    initialTestSet
}: ExperimentConfigDialogProps) {
    const t = useI18n()
    const navigate = useNavigate()
    const { models, testSets, globalConfig, createExperiment } = useAppStore(
        useShallow((state) => ({
            models: state.models,
            testSets: state.testSets,
            globalConfig: state.globalConfig,
            createExperiment: state.createExperiment
        }))
    )
    const [name, setName] = useState('')
    const [testSetId, setTestSetId] = useState('')
    const [modelIds, setModelIds] = useState<string[]>([])
    const [repetitions, setRepetitions] = useState(1)
    const [overrides, setOverrides] = useState<GenerationConfigPatch>({})
    const [variants, setVariants] = useState<ExperimentVariant[]>([])
    const [step, setStep] = useState(0)
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)
    useEffect(() => {
        if (!open) return
        setName(
            initialTestSet
                ? `${initialTestSet.name} — ${new Date().toLocaleString()}`
                : ''
        )
        setTestSetId(initialTestSet?.id ?? testSets[0]?.id ?? '')
        setModelIds([])
        setRepetitions(1)
        setOverrides({})
        setVariants([{ id: 'default', name: t('Default'), overrides: {} }])
        setStep(0)
        setError('')
        setSubmitting(false)
    }, [open, initialTestSet])
    const enabledModels = models.filter((model) => model.enabled)
    const selectedModels = enabledModels.filter((model) =>
        modelIds.includes(model.id)
    )
    const selectedSet =
        initialTestSet ?? testSets.find((set) => set.id === testSetId)
    const caseCount =
        selectedSet?.cases.filter((entry) => entry.prompt.trim()).length ?? 0
    const totalCalls =
        caseCount * selectedModels.length * variants.length * repetitions
    const common = resolveGenerationConfig(globalConfig, undefined, overrides)
    const updateVariant = (id: string, changes: Partial<ExperimentVariant>) =>
        setVariants((current) =>
            current.map((variant) =>
                variant.id === id ? { ...variant, ...changes } : variant
            )
        )
    const validate = () => {
        if (!name.trim()) throw new Error(t('A name is required.'))
        if (!selectedSet || !caseCount)
            throw new Error(
                t('The test set needs at least one non-empty prompt.')
            )
        testSetSchema.parse(selectedSet)
        if (!selectedModels.length || selectedModels.length !== modelIds.length)
            throw new Error(t('Select at least one enabled model.'))
        if (step === 0) return
        if (
            !Number.isInteger(repetitions) ||
            repetitions < 1 ||
            repetitions > 20
        )
            throw new Error(
                t('Repetitions must be an integer between 1 and 20.')
            )
        if (variants.length < 1 || variants.length > 8)
            throw new Error(t('Parameter groups must be between 1 and 8.'))
        generationConfigPatchSchema.strict().parse(overrides)
        const names = new Set<string>()
        for (const variant of variants) {
            experimentVariantSchema.parse(variant)
            generationConfigPatchSchema.strict().parse(variant.overrides)
            const trimmed = variant.name.trim()
            if (names.has(trimmed))
                throw new Error(t('Parameter group names must be unique.'))
            names.add(trimmed)
        }
        if (totalCalls > MAX_EXPERIMENT_TASKS)
            throw new Error(
                t(
                    'Limit 50,000 calls. Reduce cases, models, groups or repetitions.'
                )
            )
    }
    const advance = () => {
        try {
            validate()
            setError('')
            setStep((current) => current + 1)
        } catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : t('Could not create the experiment.')
            )
        }
    }
    const confirm = async () => {
        if (submitting || step !== 2) return
        try {
            validate()
            const draft: ExperimentDraft = structuredClone({
                name: name.trim(),
                testSet: selectedSet!,
                modelIds,
                repetitions,
                overrides,
                variants: variants.map((variant) => ({
                    ...variant,
                    name: variant.name.trim()
                }))
            })
            setSubmitting(true)
            setError('')
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
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{t('Configure Experiment')}</DialogTitle>
                    <DialogDescription>
                        {t(
                            'Each case runs independently per model; conversation history is never shared.'
                        )}
                    </DialogDescription>
                </DialogHeader>
                <DialogBody className="space-y-5">
                    <p className="text-sm font-medium">
                        {step + 1} / 3 —{' '}
                        {step === 0
                            ? t('Selection')
                            : step === 1
                              ? t('Parameters')
                              : t('Confirm requests')}
                    </p>

                    <fieldset
                        disabled={submitting}
                        className="space-y-5 min-w-0"
                    >
                        {step === 0 && (
                            <>
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
                                    />
                                </div>
                                {initialTestSet ? (
                                    <p className="text-sm">
                                        {t('Test Set')}: {initialTestSet.name}
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        <Label htmlFor="experiment-testset">
                                            {t('Test Set')}
                                        </Label>
                                        <select
                                            id="experiment-testset"
                                            className="w-full min-h-11 rounded-md border bg-background px-3 text-sm"
                                            value={testSetId}
                                            onChange={(event) =>
                                                setTestSetId(event.target.value)
                                            }
                                        >
                                            {!testSets.length && (
                                                <option value="">
                                                    {t('No test sets yet')}
                                                </option>
                                            )}
                                            {testSets.map((set) => (
                                                <option
                                                    key={set.id}
                                                    value={set.id}
                                                >
                                                    {set.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label>{t('Models')}</Label>
                                    {!enabledModels.length ? (
                                        <p className="text-sm">
                                            {t('No enabled models.')}{' '}
                                            <Link
                                                to="/models"
                                                onClick={onClose}
                                                className="text-primary underline"
                                            >
                                                {t('Add a model')}
                                            </Link>
                                        </p>
                                    ) : (
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {enabledModels.map((model) => (
                                                <label
                                                    key={model.id}
                                                    className="flex min-h-11 items-center gap-2 rounded-md border p-3 text-sm"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={modelIds.includes(
                                                            model.id
                                                        )}
                                                        onChange={() =>
                                                            setModelIds(
                                                                (current) =>
                                                                    current.includes(
                                                                        model.id
                                                                    )
                                                                        ? current.filter(
                                                                              (
                                                                                  id
                                                                              ) =>
                                                                                  id !==
                                                                                  model.id
                                                                          )
                                                                        : [
                                                                              ...current,
                                                                              model.id
                                                                          ]
                                                            )
                                                        }
                                                    />
                                                    <span className="break-all">
                                                        {model.name} (
                                                        {model.mode ?? 'chat'})
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                        {step === 1 && (
                            <>
                                <div className="space-y-2">
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
                                                Number(event.target.value)
                                            )
                                        }
                                    />
                                </div>
                                <section className="rounded-lg border p-4 space-y-3">
                                    <h3 className="font-medium">
                                        {t('Common experiment parameters')}
                                    </h3>
                                    <ParameterPresetControls
                                        config={overrides}
                                        onApply={(patch) =>
                                            setOverrides((current) =>
                                                mergeConfigPatch(current, patch)
                                            )
                                        }
                                    />
                                    <ConfigEditor
                                        config={common.requested}
                                        sources={common.sources}
                                        onChange={(patch) =>
                                            setOverrides((current) =>
                                                mergeConfigPatch(current, patch)
                                            )
                                        }
                                        onResetField={(path) =>
                                            setOverrides((current) =>
                                                resetConfigField(current, path)
                                            )
                                        }
                                    />
                                </section>
                                {variants.map((variant) => {
                                    const resolved = resolveGenerationConfig(
                                        globalConfig,
                                        undefined,
                                        overrides,
                                        variant.overrides
                                    )
                                    return (
                                        <section
                                            key={variant.id}
                                            className="rounded-lg border p-4 space-y-3"
                                        >
                                            <Label
                                                htmlFor={`variant-${variant.id}`}
                                            >
                                                {t('Parameter group name')}
                                            </Label>
                                            <Input
                                                id={`variant-${variant.id}`}
                                                value={variant.name}
                                                onChange={(event) =>
                                                    updateVariant(variant.id, {
                                                        name: event.target.value
                                                    })
                                                }
                                            />
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    className="min-h-11"
                                                    variant="outline"
                                                    disabled={
                                                        variants.length >= 8
                                                    }
                                                    onClick={() =>
                                                        setVariants(
                                                            (current) => [
                                                                ...current,
                                                                {
                                                                    id: crypto.randomUUID(),
                                                                    name: '',
                                                                    overrides:
                                                                        structuredClone(
                                                                            variant.overrides
                                                                        )
                                                                }
                                                            ]
                                                        )
                                                    }
                                                >
                                                    {t('Copy group')}
                                                </Button>
                                                <Button
                                                    className="min-h-11"
                                                    variant="outline"
                                                    disabled={
                                                        variants.length <= 1
                                                    }
                                                    onClick={() =>
                                                        setVariants((current) =>
                                                            current.filter(
                                                                (entry) =>
                                                                    entry.id !==
                                                                    variant.id
                                                            )
                                                        )
                                                    }
                                                >
                                                    {t('Delete group')}
                                                </Button>
                                            </div>
                                            <ParameterPresetControls
                                                config={variant.overrides}
                                                onApply={(patch) =>
                                                    updateVariant(variant.id, {
                                                        overrides:
                                                            mergeConfigPatch(
                                                                variant.overrides,
                                                                patch
                                                            )
                                                    })
                                                }
                                            />
                                            <ConfigEditor
                                                config={resolved.requested}
                                                sources={resolved.sources}
                                                onChange={(patch) =>
                                                    updateVariant(variant.id, {
                                                        overrides:
                                                            mergeConfigPatch(
                                                                variant.overrides,
                                                                patch
                                                            )
                                                    })
                                                }
                                                onResetField={(path) =>
                                                    updateVariant(variant.id, {
                                                        overrides:
                                                            resetConfigField(
                                                                variant.overrides,
                                                                path
                                                            )
                                                    })
                                                }
                                            />
                                        </section>
                                    )
                                })}
                                <Button
                                    className="min-h-11"
                                    variant="outline"
                                    disabled={variants.length >= 8}
                                    onClick={() =>
                                        setVariants((current) => [
                                            ...current,
                                            {
                                                id: crypto.randomUUID(),
                                                name: '',
                                                overrides: {}
                                            }
                                        ])
                                    }
                                >
                                    {t('Add group')}
                                </Button>
                            </>
                        )}
                        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                            <div className="font-medium">
                                {t('Planned calls')}
                            </div>
                            <div className="text-2xl font-bold tabular-nums">
                                {totalCalls}
                            </div>
                            <p>
                                {caseCount} × {selectedModels.length} ×{' '}
                                {variants.length} × {repetitions} (
                                {t('cases × models × groups × repeats')})
                            </p>
                            <p>
                                {t(
                                    'Limit 50,000 calls. Reduce cases, models, groups or repetitions.'
                                )}
                            </p>
                        </div>
                        {selectedModels.some(
                            (model) => model.mode === 'image'
                        ) && (
                            <p className="text-sm text-muted-foreground">
                                {t(
                                    'Image generation remains available; text scoring and text TPS are not applicable.'
                                )}
                            </p>
                        )}
                        {step === 2 && (
                            <>
                                <p className="text-sm">
                                    {t(
                                        'Confirming starts API requests. Review every model and parameter group below.'
                                    )}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {t(
                                        'Unknown capabilities are not verified; providers may ignore requested parameters.'
                                    )}
                                </p>
                                {selectedModels.flatMap((model) =>
                                    variants.map((variant) => {
                                        const resolved = applyModelCapabilities(
                                            resolveGenerationConfig(
                                                globalConfig,
                                                model.config,
                                                overrides,
                                                variant.overrides
                                            ),
                                            model.capabilities,
                                            model
                                        )
                                        return (
                                            <section
                                                key={`${model.id}:${variant.id}`}
                                                className="rounded-lg border p-3 space-y-2"
                                            >
                                                <h3 className="font-medium break-all">
                                                    {model.name} —{' '}
                                                    {variant.name.trim()}
                                                </h3>
                                                <p className="text-sm">
                                                    {t('Not sent')}:{' '}
                                                    {resolved.excludedParameters.join(
                                                        ', '
                                                    ) || '—'}
                                                </p>
                                                <details>
                                                    <summary className="min-h-11 cursor-pointer text-sm">
                                                        {t(
                                                            'NiLLM request configuration'
                                                        )}
                                                    </summary>
                                                    <pre className="whitespace-pre-wrap break-all text-sm select-text">
                                                        {JSON.stringify(
                                                            resolved,
                                                            null,
                                                            2
                                                        )}
                                                    </pre>
                                                </details>
                                            </section>
                                        )
                                    })
                                )}
                            </>
                        )}
                        {error && (
                            <p
                                role="alert"
                                className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                            >
                                {error}
                            </p>
                        )}
                    </fieldset>
                </DialogBody>
                <DialogFooter>
                    <Button
                        className="min-h-11"
                        variant="ghost"
                        disabled={submitting}
                        onClick={onClose}
                    >
                        {t('Cancel')}
                    </Button>
                    {step > 0 && (
                        <Button
                            className="min-h-11"
                            variant="outline"
                            disabled={submitting}
                            onClick={() => {
                                setError('')
                                setStep((current) => current - 1)
                            }}
                        >
                            {t('Back')}
                        </Button>
                    )}
                    {step < 2 ? (
                        <Button className="min-h-11" onClick={advance}>
                            {t('Next')}
                        </Button>
                    ) : (
                        <Button
                            className="min-h-11"
                            disabled={
                                submitting || totalCalls > MAX_EXPERIMENT_TASKS
                            }
                            onClick={confirm}
                        >
                            {submitting
                                ? t('Creating…')
                                : t('Create Experiment')}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
