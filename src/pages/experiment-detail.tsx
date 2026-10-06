import { useCallback, useMemo, useRef, useState } from 'react'
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual'
import { Link, useParams } from 'react-router'
import {
    ArrowLeft,
    FlaskConical,
    BarChart3,
    Gavel,
    Pause,
    Play,
    Square,
    RotateCcw,
    Trash2
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { PageLayout } from '@/features/layout/PageLayout'
import type { BenchmarkResult, ExperimentTask, TestCase } from '@/lib/types'
import {
    Dialog,
    DialogContent,
    DialogBody,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    buildJudgingGroups,
    summarizeJudgeCost,
    summarizeScoringCoverage,
    useExperimentJudging
} from '@/features/experiments/hooks/useExperimentJudging'
import { resultStatus } from '@/lib/statistics'
import { AttemptView } from '@/features/experiments/components/AttemptView'
import { formatUSD } from '@/features/stats/domain/export-csv'

const MODEL_PAGE_SIZE = 6

/** Keep all records; window lists only above this threshold. */
const VIRTUAL_THRESHOLD = 50
const VIRTUAL_OVERSCAN = 6
const MATRIX_ROW_ESTIMATE = 36
const TASK_CARD_ESTIMATE = 68
const ATTEMPT_ESTIMATE = 48

function attemptStatus(task: ExperimentTask) {
    if (task.attempts.length === 0) return 'not-run' as const
    return resultStatus(task.attempts[task.attempts.length - 1])
}

export function ExperimentDetailPage() {
    const t = useI18n()
    const { runId } = useParams<{ runId: string }>()
    const {
        runs,
        pauseExperiment,
        resumeExperiment,
        cancelExperiment,
        retryFailedExperiment,
        deleteExperiment,
        rateExperimentResult
    } = useAppStore(
        useShallow((state) => ({
            runs: state.experimentRuns,
            pauseExperiment: state.pauseExperiment,
            resumeExperiment: state.resumeExperiment,
            cancelExperiment: state.cancelExperiment,
            retryFailedExperiment: state.retryFailedExperiment,
            deleteExperiment: state.deleteExperiment,
            rateExperimentResult: state.rateExperimentResult
        }))
    )
    const run = runs.find((candidate) => candidate.id === runId)
    const judging = useExperimentJudging(runId ?? '')
    const [variantFilter, setVariantFilter] = useState('all')
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [repeatFilter, setRepeatFilter] = useState(0)
    const [modelPage, setModelPage] = useState(0)
    const [openTaskId, setOpenTaskId] = useState<string | null>(null)

    const [openAttemptIds, setOpenAttemptIds] = useState<ReadonlySet<string>>(
        () => new Set<string>()
    )
    const toggleAttempt = useCallback((resultId: string) => {
        setOpenAttemptIds((previous) => {
            const next = new Set(previous)
            if (next.has(resultId)) next.delete(resultId)
            else next.add(resultId)
            return next
        })
    }, [])

    // Judge exactly the visible variant/repeat selection.

    const scoringVariantIds = useMemo(
        () =>
            !run
                ? []
                : variantFilter === 'all'
                  ? run.variants.map((variant) => variant.id)
                  : [variantFilter],
        [run, variantFilter]
    )
    const judgingGroups = useMemo(
        () =>
            run ? buildJudgingGroups(run, scoringVariantIds, repeatFilter) : [],
        [run, scoringVariantIds, repeatFilter]
    )
    const scoringSummary = useMemo(
        () =>
            run
                ? {
                      coverage: summarizeScoringCoverage(run),
                      cost: summarizeJudgeCost(run.tasks)
                  }
                : null,
        [run]
    )

    const matrixTasks = useMemo(() => {
        if (!run) return []
        return run.tasks.filter(
            (task) =>
                (variantFilter === 'all' || task.variantId === variantFilter) &&
                task.repeatIndex === repeatFilter
        )
    }, [run, variantFilter, repeatFilter])

    const listTasks = useMemo(() => {
        if (!run) return []
        return run.tasks.filter(
            (task) =>
                variantFilter === 'all' || task.variantId === variantFilter
        )
    }, [run, variantFilter])

    const allCases = run?.testSet.cases ?? []
    const modelPageCount = Math.max(
        1,
        Math.ceil((run?.models.length ?? 0) / MODEL_PAGE_SIZE)
    )
    const safeModelPage = Math.min(modelPage, modelPageCount - 1)
    const visibleModels = run
        ? run.models.slice(
              safeModelPage * MODEL_PAGE_SIZE,
              safeModelPage * MODEL_PAGE_SIZE + MODEL_PAGE_SIZE
          )
        : []
    const caseById = useMemo(
        () => new Map(allCases.map((testCase) => [testCase.id, testCase])),
        [allCases]
    )
    const modelById = useMemo(
        () => new Map((run?.models ?? []).map((model) => [model.id, model])),
        [run]
    )
    const taskByCaseModel = useMemo(() => {
        const map = new Map<string, Map<string, ExperimentTask>>()
        for (const task of matrixTasks) {
            let row = map.get(task.caseId)
            if (!row) {
                row = new Map<string, ExperimentTask>()
                map.set(task.caseId, row)
            }
            row.set(task.modelId, task)
        }
        return map
    }, [matrixTasks])
    const taskFor = useCallback(
        (caseId: string, modelId: string) =>
            taskByCaseModel.get(caseId)?.get(modelId),
        [taskByCaseModel]
    )
    const openTask = run?.tasks.find((task) => task.id === openTaskId) ?? null
    const openModel = openTask ? modelById.get(openTask.modelId) : undefined

    const matrixWindowed = allCases.length > VIRTUAL_THRESHOLD
    const mobileWindowed = listTasks.length > VIRTUAL_THRESHOLD
    const attemptWindowed = (openTask?.attempts.length ?? 0) > VIRTUAL_THRESHOLD

    const matrixScrollRef = useRef<HTMLDivElement | null>(null)
    const mobileScrollRef = useRef<HTMLDivElement | null>(null)
    // The portal mounts later; publish its viewport through a callback ref.

    const [attemptScrollElement, setAttemptScrollElement] =
        useState<HTMLDivElement | null>(null)

    const matrixVirtualizer = useVirtualizer<
        HTMLDivElement,
        HTMLTableRowElement
    >({
        count: matrixWindowed ? allCases.length : 0,
        getScrollElement: () => matrixScrollRef.current,
        estimateSize: () => MATRIX_ROW_ESTIMATE,
        overscan: VIRTUAL_OVERSCAN,
        useAnimationFrameWithResizeObserver: true,
        getItemKey: (index) => allCases[index]?.id ?? index,
        measureElement: (element) => element.getBoundingClientRect().height
    })
    const mobileVirtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
        count: mobileWindowed ? listTasks.length : 0,
        getScrollElement: () => mobileScrollRef.current,
        estimateSize: () => TASK_CARD_ESTIMATE,
        overscan: VIRTUAL_OVERSCAN,
        useAnimationFrameWithResizeObserver: true,
        getItemKey: (index) => listTasks[index]?.id ?? index
    })
    const attemptVirtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
        count: attemptWindowed ? (openTask?.attempts.length ?? 0) : 0,
        getScrollElement: () => attemptScrollElement,
        estimateSize: () => ATTEMPT_ESTIMATE,
        overscan: VIRTUAL_OVERSCAN,
        useAnimationFrameWithResizeObserver: true,
        getItemKey: (index) => openTask?.attempts[index]?.id ?? index
    })

    const matrixItems = matrixVirtualizer.getVirtualItems()
    const matrixPadTop = matrixItems.length > 0 ? matrixItems[0].start : 0
    const matrixPadBottom =
        matrixItems.length > 0
            ? matrixVirtualizer.getTotalSize() -
              matrixItems[matrixItems.length - 1].end
            : 0
    const taskItems = mobileVirtualizer.getVirtualItems()
    const taskPadTop = taskItems.length > 0 ? taskItems[0].start : 0
    const taskPadBottom =
        taskItems.length > 0
            ? mobileVirtualizer.getTotalSize() -
              taskItems[taskItems.length - 1].end
            : 0
    const attemptItems = attemptVirtualizer.getVirtualItems()
    const attemptPadTop = attemptItems.length > 0 ? attemptItems[0].start : 0
    const attemptPadBottom =
        attemptItems.length > 0
            ? attemptVirtualizer.getTotalSize() -
              attemptItems[attemptItems.length - 1].end
            : attemptVirtualizer.getTotalSize()

    if (!run) {
        return (
            <PageLayout title={t('Experiment')} icon={FlaskConical}>
                <div className="p-10 text-center space-y-3">
                    <p className="font-medium">{t('Experiment not found')}</p>
                    <Button asChild variant="outline">
                        <Link to="/experiments">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {t('Back to experiments')}
                        </Link>
                    </Button>
                </div>
            </PageLayout>
        )
    }

    const counts = run.tasks.reduce(
        (acc, task) => {
            const status = attemptStatus(task)
            if (status === 'not-run') acc.notRun++
            else if (status === 'completed') acc.completed++
            else if (status === 'error') acc.error++
            else if (status === 'cancelled') acc.cancelled++
            return acc
        },
        { notRun: 0, completed: 0, error: 0, cancelled: 0 }
    )
    const executed = run.tasks.length - counts.notRun
    const isActive =
        run.status === 'queued' ||
        run.status === 'running' ||
        run.status === 'paused'

    const renderMatrixRow = (
        testCase: TestCase,
        caseIndex: number,
        virtual?: VirtualItem
    ) => (
        <tr
            key={testCase.id}
            {...(virtual
                ? {
                      'data-index': virtual.index,
                      ref: matrixVirtualizer.measureElement
                  }
                : {})}
        >
            <th
                scope="row"
                className="sticky left-0 z-10 bg-card text-left font-normal text-muted-foreground p-1 truncate max-w-64"
                title={testCase.prompt}
            >
                {caseIndex + 1}. {testCase.prompt}
            </th>
            {visibleModels.map((model) => {
                const task = taskFor(testCase.id, model.id)
                const status = task ? attemptStatus(task) : ('not-run' as const)
                return (
                    <td key={model.id} className="p-0.5">
                        <button
                            type="button"
                            disabled={!task}
                            onClick={() => task && setOpenTaskId(task.id)}
                            className={`w-full h-8 min-w-8 rounded-md border text-[10px] font-semibold uppercase tracking-wide transition-colors flex items-center justify-center gap-1 ${
                                status === 'completed'
                                    ? 'border-success/40 bg-success/10 text-success'
                                    : status === 'error'
                                      ? 'border-destructive/40 bg-destructive/10 text-destructive'
                                      : status === 'cancelled'
                                        ? 'border-border bg-muted/40 text-muted-foreground'
                                        : status === 'pending'
                                          ? 'border-primary/40 bg-primary/5 text-primary'
                                          : 'border-dashed border-border/60 text-muted-foreground/60'
                            } disabled:cursor-default`}
                            title={
                                task
                                    ? `${model.name}: ${t(status)}`
                                    : t('Not run')
                            }
                        >
                            {status === 'not-run'
                                ? '·'
                                : status === 'completed'
                                  ? '✓'
                                  : status === 'error'
                                    ? '!'
                                    : status === 'cancelled'
                                      ? '⨯'
                                      : '…'}
                        </button>
                    </td>
                )
            })}
        </tr>
    )

    const renderTaskCard = (task: ExperimentTask) => {
        const status = attemptStatus(task)
        const testCase = caseById.get(task.caseId)
        const model = modelById.get(task.modelId)
        return (
            <button
                key={task.id}
                type="button"
                onClick={() => setOpenTaskId(task.id)}
                className="w-full text-left rounded-lg border p-2 text-xs space-y-1 hover:bg-muted/40"
            >
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={
                            status === 'completed'
                                ? 'text-success'
                                : status === 'error'
                                  ? 'text-destructive'
                                  : 'text-muted-foreground'
                        }
                    >
                        {status === 'not-run' ? t('Not run') : t(status)}
                    </span>
                    <span className="text-muted-foreground">
                        r{task.repeatIndex + 1}
                    </span>
                    {model && <span className="font-medium">{model.name}</span>}
                </div>
                <div className="truncate italic text-muted-foreground">
                    {testCase?.prompt}
                </div>
            </button>
        )
    }

    const renderAttempt = (
        task: ExperimentTask,
        attempt: BenchmarkResult,
        index: number
    ) => (
        <AttemptView
            key={attempt.id}
            attempt={attempt}
            index={index}
            mode={openModel?.mode ?? 'chat'}
            open={openAttemptIds.has(attempt.id)}
            onToggle={() => toggleAttempt(attempt.id)}
            onRate={(resultId, score) =>
                rateExperimentResult(run.id, task.id, resultId, score)
            }
        />
    )

    return (
        <PageLayout
            title={run.name}
            icon={FlaskConical}
            actions={
                <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                        <Link to={`/stats?run=${encodeURIComponent(run.id)}`}>
                            <BarChart3 className="h-4 w-4 mr-2" />
                            {t('View report')}
                        </Link>
                    </Button>
                    {run.status === 'running' && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => pauseExperiment(run.id)}
                        >
                            <Pause className="h-4 w-4" />
                            {t('Pause')}
                        </Button>
                    )}
                    {(run.status === 'paused' ||
                        run.status === 'interrupted') &&
                        run.pendingTaskIds.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => resumeExperiment(run.id)}
                            >
                                <Play className="h-4 w-4" />
                                {t('Continue pending tasks')}
                            </Button>
                        )}
                    {isActive && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => void cancelExperiment(run.id)}
                        >
                            <Square className="h-4 w-4" />
                            {t('Cancel')}
                        </Button>
                    )}
                    {!isActive && counts.error > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => retryFailedExperiment(run.id)}
                        >
                            <RotateCcw className="h-4 w-4" />
                            {t('Retry failed tasks')}
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => setConfirmDelete(true)}
                        disabled={deleting}
                    >
                        <Trash2 className="h-4 w-4" />
                        {t('Delete')}
                    </Button>
                </div>
            }
        >
            <div className="space-y-6 pb-8">
                <div className="rounded-xl border bg-card p-4 space-y-2 text-sm">
                    <div className="flex flex-wrap gap-x-6 gap-y-1">
                        <span>
                            <b className="uppercase tracking-wide">
                                {t(run.status)}
                            </b>
                        </span>
                        <span className="tabular-nums">
                            {t('Executed')}: {executed}/{run.tasks.length}
                        </span>
                        <span className="tabular-nums">
                            ✓ {counts.completed} · ✗ {counts.error} · ⨯{' '}
                            {counts.cancelled} · ○ {counts.notRun}
                        </span>
                        <span className="tabular-nums">
                            {t('Concurrency')}: {run.maxConcurrent}
                        </span>
                    </div>
                    {scoringSummary && (
                        <div className="tabular-nums text-xs text-muted-foreground">
                            {t('Rule scoring')}:{' '}
                            {scoringSummary.coverage.ruleCovered}/
                            {scoringSummary.coverage.eligible} ·{' '}
                            {t('AI judging')}:{' '}
                            {scoringSummary.coverage.judgeCovered}/
                            {scoringSummary.coverage.eligible} ·{' '}
                            {t('Known judging cost')}:{' '}
                            {scoringSummary.cost.cost != null
                                ? formatUSD(scoringSummary.cost.cost)
                                : '—'}{' '}
                            ({scoringSummary.cost.scoredCalls}/
                            {scoringSummary.cost.calls} {t('priced calls')})
                        </div>
                    )}
                    {run.error && (
                        <div className="text-destructive text-xs">
                            {run.error}
                        </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                        {run.testSet.name} · {run.models.length} {t('models')} ·{' '}
                        {run.variants.length} {t('groups')} · {run.repetitions}×
                    </div>
                    {isActive && (
                        <div className="text-xs text-muted-foreground">
                            {t(
                                'Disabling a model does not change this run; pause or cancel it first.'
                            )}
                        </div>
                    )}
                </div>

                <div className="rounded-xl border bg-card p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold">
                            {t('AI judging')}
                        </h3>
                        <span className="text-xs text-muted-foreground tabular-nums">
                            {t('Scope')}:{' '}
                            {variantFilter === 'all'
                                ? run.variants
                                      .map((variant) => variant.name)
                                      .join(' + ')
                                : (run.variants.find(
                                      (variant) => variant.id === variantFilter
                                  )?.name ?? variantFilter)}{' '}
                            · {t('Repeat')} {repeatFilter + 1} ·{' '}
                            {t('Estimated judge calls')}: {judgingGroups.length}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {t(
                            'Each group anonymously compares the latest completed answers of all chat models for one case, parameter group and repeat. Failed, cancelled and unfinished attempts are not scored; image models are excluded.'
                        )}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                            <Label htmlFor="judge-model-select">
                                {t('Judge model')}
                            </Label>
                            <select
                                id="judge-model-select"
                                value={judging.judgeModelId}
                                onChange={(event) =>
                                    judging.setJudgeModelId(event.target.value)
                                }
                                className="h-11 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                            >
                                <option value="">
                                    {t('Select a chat model…')}
                                </option>
                                {judging.judgeCandidates.map((model) => (
                                    <option key={model.id} value={model.id}>
                                        {model.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="judge-prompt-input">
                            {t('Judge prompt')}
                        </Label>
                        <Textarea
                            id="judge-prompt-input"
                            value={judging.judgePrompt}
                            onChange={(event) =>
                                judging.setJudgePrompt(event.target.value)
                            }
                            className="min-h-24 text-sm"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            size="sm"
                            className="gap-2"
                            disabled={
                                judging.isJudging ||
                                judging.isProcessing ||
                                judging.judgeModelId.length === 0 ||
                                judgingGroups.length === 0
                            }
                            onClick={() => void judging.start(judgingGroups)}
                        >
                            <Gavel className="h-4 w-4" />
                            {t('Start scoring')}
                        </Button>
                        {judging.judgingHere && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-2"
                                onClick={judging.cancel}
                            >
                                <Square className="h-4 w-4" />
                                {t('Stop scoring')}
                            </Button>
                        )}
                        {judging.isJudging && !judging.judgingHere && (
                            <span className="text-xs text-muted-foreground">
                                {t('Another judging batch is running.')}
                            </span>
                        )}
                        {judgingGroups.length === 0 && !judging.isJudging && (
                            <span className="text-xs text-muted-foreground">
                                {t('No completed answers in this scope yet.')}
                            </span>
                        )}
                    </div>
                    {judging.progress && (
                        <div className="text-xs tabular-nums">
                            {t('Judging…')} {judging.progress.done}/
                            {judging.progress.total}
                        </div>
                    )}
                    {judging.status?.kind === 'error' && (
                        <div className="text-xs text-destructive">
                            {judging.status.code === 'no-judge-model'
                                ? t(
                                      'Select an enabled chat model as the judge first.'
                                  )
                                : t(
                                      'Judging stopped before group {index} of {total}: {reason}',
                                      {
                                          index: judging.status.index,
                                          total: judging.status.total,
                                          reason: t(judging.status.reason)
                                      }
                                  )}
                        </div>
                    )}
                    {judging.status?.kind === 'info' && (
                        <div className="text-xs text-muted-foreground">
                            {judging.status.code === 'deleted'
                                ? t(
                                      'This experiment was deleted; judging stopped. Scores recorded so far were kept.'
                                  )
                                : judging.status.code === 'stopped'
                                  ? t(
                                        'Judging stopped. Scores recorded so far were kept.'
                                    )
                                  : t('Judging finished: {total} scored.', {
                                        total: judging.status.total
                                    })}
                        </div>
                    )}
                </div>

                <div className="rounded-xl border bg-card p-4 space-y-3">
                    <h3 className="text-sm font-semibold">
                        {t('Frozen parameters')}
                    </h3>
                    <div className="grid gap-2 sm:grid-cols-2 text-xs">
                        {run.models.map((model) =>
                            run.variants.map((variant) => {
                                const resolved =
                                    run.configByModelVariant[model.id]?.[
                                        variant.id
                                    ]
                                if (!resolved) return null
                                return (
                                    <div
                                        key={`${model.id}:${variant.id}`}
                                        className="rounded-md border bg-background/50 p-2"
                                    >
                                        <div className="font-medium">
                                            {model.name} · {variant.name}
                                        </div>
                                        <div className="text-muted-foreground tabular-nums">
                                            temp{' '}
                                            {resolved.requested.temperature} ·
                                            maxTokens{' '}
                                            {resolved.requested.maxTokens} ·
                                            topP {resolved.requested.topP}
                                            {resolved.excludedParameters
                                                .length > 0 && (
                                                <span className="text-amber-600 dark:text-amber-400">
                                                    {' '}
                                                    · {t('Not sent')}:{' '}
                                                    {resolved.excludedParameters.join(
                                                        ', '
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold">
                            {t('Case × Model')}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={variantFilter}
                                onChange={(event) => {
                                    setVariantFilter(event.target.value)
                                    setModelPage(0)
                                }}
                                className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                                aria-label={t('Parameter group')}
                            >
                                <option value="all">{t('All groups')}</option>
                                {run.variants.map((variant) => (
                                    <option key={variant.id} value={variant.id}>
                                        {variant.name}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={repeatFilter}
                                onChange={(event) => {
                                    setRepeatFilter(
                                        parseInt(event.target.value)
                                    )
                                }}
                                className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                                aria-label={t('Repetition')}
                            >
                                {Array.from(
                                    { length: run.repetitions },
                                    (_, index) => (
                                        <option key={index} value={index}>
                                            {t('Repeat')} {index + 1}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>
                    </div>

                    <div className="hidden md:block">
                        {matrixWindowed ? (
                            <ScrollArea
                                horizontal
                                ref={matrixScrollRef}
                                className="h-[70vh]"
                            >
                                <table className="w-full text-xs border-separate border-spacing-0">
                                    <thead>
                                        <tr>
                                            <th className="sticky left-0 top-0 z-30 bg-card text-left font-medium text-muted-foreground p-1 min-w-48">
                                                {t('Case')}
                                            </th>
                                            {visibleModels.map((model) => (
                                                <th
                                                    key={model.id}
                                                    className="sticky top-0 z-20 bg-card text-left font-medium text-muted-foreground p-1 min-w-32 max-w-48 truncate"
                                                    title={model.name}
                                                >
                                                    {model.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr aria-hidden="true">
                                            <td
                                                colSpan={
                                                    visibleModels.length + 1
                                                }
                                                style={{
                                                    height: matrixPadTop,
                                                    padding: 0,
                                                    border: 0
                                                }}
                                            />
                                        </tr>
                                        {matrixItems.map((item) =>
                                            renderMatrixRow(
                                                allCases[item.index],
                                                item.index,
                                                item
                                            )
                                        )}
                                        <tr aria-hidden="true">
                                            <td
                                                colSpan={
                                                    visibleModels.length + 1
                                                }
                                                style={{
                                                    height: matrixPadBottom,
                                                    padding: 0,
                                                    border: 0
                                                }}
                                            />
                                        </tr>
                                    </tbody>
                                </table>
                            </ScrollArea>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs border-separate border-spacing-0">
                                    <thead>
                                        <tr>
                                            <th className="sticky left-0 z-10 bg-card text-left font-medium text-muted-foreground p-1 min-w-48">
                                                {t('Case')}
                                            </th>
                                            {visibleModels.map((model) => (
                                                <th
                                                    key={model.id}
                                                    className="text-left font-medium text-muted-foreground p-1 min-w-32 max-w-48 truncate"
                                                    title={model.name}
                                                >
                                                    {model.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allCases.map((testCase, index) =>
                                            renderMatrixRow(testCase, index)
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="md:hidden">
                        {mobileWindowed ? (
                            <ScrollArea
                                ref={mobileScrollRef}
                                className="h-[60vh]"
                            >
                                <div>
                                    <div
                                        aria-hidden="true"
                                        style={{ height: taskPadTop }}
                                    />
                                    {taskItems.map((item) => (
                                        <div
                                            key={item.key}
                                            data-index={item.index}
                                            ref={
                                                mobileVirtualizer.measureElement
                                            }
                                            className="pb-2"
                                        >
                                            {renderTaskCard(
                                                listTasks[item.index]
                                            )}
                                        </div>
                                    ))}
                                    <div
                                        aria-hidden="true"
                                        style={{ height: taskPadBottom }}
                                    />
                                </div>
                            </ScrollArea>
                        ) : (
                            <div className="space-y-2">
                                {listTasks.map((task) => renderTaskCard(task))}
                            </div>
                        )}
                    </div>

                    {modelPageCount > 1 && (
                        <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={safeModelPage === 0}
                                    onClick={() =>
                                        setModelPage(safeModelPage - 1)
                                    }
                                >
                                    {t('Models')} ‹
                                </Button>
                                <span className="tabular-nums">
                                    {safeModelPage + 1} / {modelPageCount}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={
                                        safeModelPage >= modelPageCount - 1
                                    }
                                    onClick={() =>
                                        setModelPage(safeModelPage + 1)
                                    }
                                >
                                    {t('Models')} ›
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {openTask && (
                    <Dialog
                        open={openTaskId !== null}
                        onOpenChange={(open) => !open && setOpenTaskId(null)}
                    >
                        <DialogContent className="max-w-2xl h-[85dvh]">
                            <DialogHeader>
                                <DialogTitle>
                                    {run.models.find(
                                        (m) => m.id === openTask.modelId
                                    )?.name ?? openTask.modelId}
                                </DialogTitle>
                                <DialogDescription>
                                    {run.variants.find(
                                        (v) => v.id === openTask.variantId
                                    )?.name ?? ''}{' '}
                                    · {t('Repeat')} {openTask.repeatIndex + 1} ·{' '}
                                    {openTask.attempts.length} {t('attempts')}
                                </DialogDescription>
                            </DialogHeader>
                            <DialogBody ref={setAttemptScrollElement}>
                                <div
                                    className={
                                        attemptWindowed ? '' : 'space-y-2'
                                    }
                                >
                                    <div
                                        className={`text-xs italic text-muted-foreground rounded-md border bg-muted/20 p-2 select-text${attemptWindowed ? ' mb-2' : ''}`}
                                    >
                                        {run.testSet.cases.find(
                                            (c) => c.id === openTask.caseId
                                        )?.prompt ?? ''}
                                    </div>
                                    {openTask.attempts.length === 0 && (
                                        <div className="text-xs text-muted-foreground">
                                            {t('Not run')}
                                        </div>
                                    )}
                                    {attemptWindowed ? (
                                        <>
                                            <div
                                                aria-hidden="true"
                                                style={{
                                                    height: attemptPadTop
                                                }}
                                            />
                                            {attemptItems.map((item) => (
                                                <div
                                                    key={item.key}
                                                    data-index={item.index}
                                                    ref={
                                                        attemptVirtualizer.measureElement
                                                    }
                                                    className="pb-2"
                                                >
                                                    {renderAttempt(
                                                        openTask,
                                                        openTask.attempts[
                                                            item.index
                                                        ],
                                                        item.index
                                                    )}
                                                </div>
                                            ))}
                                            <div
                                                aria-hidden="true"
                                                style={{
                                                    height: attemptPadBottom
                                                }}
                                            />
                                        </>
                                    ) : (
                                        openTask.attempts.map(
                                            (attempt, index) =>
                                                renderAttempt(
                                                    openTask,
                                                    attempt,
                                                    index
                                                )
                                        )
                                    )}
                                </div>
                            </DialogBody>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t('Delete this experiment?')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t(
                                'All recorded attempts and parameters will be removed. This cannot be undone.'
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>
                            {t('Cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={deleting}
                            onClick={async (event) => {
                                event.preventDefault()
                                setDeleting(true)
                                await deleteExperiment(run.id)
                                setDeleting(false)
                                setConfirmDelete(false)
                            }}
                        >
                            {deleting ? t('Deleting…') : t('Delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </PageLayout>
    )
}

export const Component = ExperimentDetailPage
