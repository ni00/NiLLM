import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import {
    ArrowLeft,
    FlaskConical,
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
import type { BenchmarkResult, ExperimentTask } from '@/lib/types'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

const CASE_PAGE_SIZE = 50
const MODEL_PAGE_SIZE = 6

const PAGE_SIZE = 50

function attemptStatus(task: ExperimentTask) {
    if (task.attempts.length === 0) return 'not-run' as const
    return task.attempts[task.attempts.length - 1].status ?? 'completed'
}

function AttemptView({
    attempt,
    index
}: {
    attempt: BenchmarkResult
    index: number
}) {
    const [open, setOpen] = useState(false)
    return (
        <div className="rounded-md border bg-background/60 text-xs">
            <button
                type="button"
                className="w-full flex items-center justify-between gap-2 p-2 text-left"
                onClick={() => setOpen((value) => !value)}
            >
                <span className="font-medium">
                    #{index + 1} · {attempt.status}
                </span>
                <span className="text-muted-foreground tabular-nums">
                    {attempt.metrics.ttft > 0
                        ? `TTFT ${Math.round(attempt.metrics.ttft)}ms · ${attempt.metrics.tps.toFixed(1)} TPS`
                        : ''}
                </span>
            </button>
            {open && (
                <div className="p-2 pt-0 space-y-2">
                    {attempt.error && (
                        <div className="text-destructive">{attempt.error}</div>
                    )}
                    {attempt.response && (
                        <pre className="whitespace-pre-wrap break-words max-h-64 overflow-y-auto text-xs bg-muted/30 rounded p-2 select-text">
                            {attempt.response}
                        </pre>
                    )}
                </div>
            )}
        </div>
    )
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
        deleteExperiment
    } = useAppStore(
        useShallow((state) => ({
            runs: state.experimentRuns,
            pauseExperiment: state.pauseExperiment,
            resumeExperiment: state.resumeExperiment,
            cancelExperiment: state.cancelExperiment,
            retryFailedExperiment: state.retryFailedExperiment,
            deleteExperiment: state.deleteExperiment
        }))
    )
    const run = runs.find((candidate) => candidate.id === runId)
    const [variantFilter, setVariantFilter] = useState('all')
    const [page, setPage] = useState(0)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [repeatFilter, setRepeatFilter] = useState(0)
    const [modelPage, setModelPage] = useState(0)
    const [openTaskId, setOpenTaskId] = useState<string | null>(null)

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

    const pageCount = Math.max(
        1,
        Math.ceil((run?.testSet.cases.length ?? 0) / CASE_PAGE_SIZE)
    )
    const safePage = Math.min(page, pageCount - 1)
    const visibleCases = run
        ? run.testSet.cases.slice(
              safePage * CASE_PAGE_SIZE,
              safePage * CASE_PAGE_SIZE + CASE_PAGE_SIZE
          )
        : []
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
    const taskFor = (caseId: string, modelId: string) =>
        matrixTasks.find(
            (task) => task.caseId === caseId && task.modelId === modelId
        )
    const openTask = run?.tasks.find((task) => task.id === openTaskId) ?? null

    const listPageCount = Math.max(1, Math.ceil(listTasks.length / PAGE_SIZE))
    const safeListPage = Math.min(page, listPageCount - 1)
    const visibleTasks = listTasks.slice(
        safeListPage * PAGE_SIZE,
        safeListPage * PAGE_SIZE + PAGE_SIZE
    )

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

    return (
        <PageLayout
            title={run.name}
            icon={FlaskConical}
            actions={
                <div className="flex flex-wrap gap-2">
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
                                {run.status}
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
                                                    · excluded:{' '}
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
                                    setPage(0)
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
                                    setPage(0)
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

                    {/* Matrix (md+): one cell per case×model. */}
                    <div className="hidden md:block overflow-x-auto">
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
                                {visibleCases.map((testCase, rowIndex) => (
                                    <tr key={testCase.id}>
                                        <th
                                            scope="row"
                                            className="sticky left-0 z-10 bg-card text-left font-normal text-muted-foreground p-1 truncate max-w-64"
                                            title={testCase.prompt}
                                        >
                                            {safePage * CASE_PAGE_SIZE +
                                                rowIndex +
                                                1}
                                            . {testCase.prompt}
                                        </th>
                                        {visibleModels.map((model) => {
                                            const task = taskFor(
                                                testCase.id,
                                                model.id
                                            )
                                            const status = task
                                                ? attemptStatus(task)
                                                : ('not-run' as const)
                                            return (
                                                <td
                                                    key={model.id}
                                                    className="p-0.5"
                                                >
                                                    <button
                                                        type="button"
                                                        disabled={!task}
                                                        onClick={() =>
                                                            task &&
                                                            setOpenTaskId(
                                                                task.id
                                                            )
                                                        }
                                                        className={`w-full h-8 min-w-8 rounded-md border text-[10px] font-semibold uppercase tracking-wide transition-colors flex items-center justify-center gap-1 ${
                                                            status ===
                                                            'completed'
                                                                ? 'border-success/40 bg-success/10 text-success'
                                                                : status ===
                                                                    'error'
                                                                  ? 'border-destructive/40 bg-destructive/10 text-destructive'
                                                                  : status ===
                                                                      'cancelled'
                                                                    ? 'border-border bg-muted/40 text-muted-foreground'
                                                                    : status ===
                                                                        'pending'
                                                                      ? 'border-primary/40 bg-primary/5 text-primary'
                                                                      : 'border-dashed border-border/60 text-muted-foreground/60'
                                                        } disabled:cursor-default`}
                                                        title={
                                                            task
                                                                ? `${model.name}: ${status}`
                                                                : t('Not run')
                                                        }
                                                    >
                                                        {status === 'not-run'
                                                            ? '·'
                                                            : status ===
                                                                'completed'
                                                              ? '✓'
                                                              : status ===
                                                                  'error'
                                                                ? '!'
                                                                : status ===
                                                                    'cancelled'
                                                                  ? '⨯'
                                                                  : '…'}
                                                    </button>
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Compact list for small screens. */}
                    <div className="md:hidden space-y-2">
                        {visibleTasks.map((task) => {
                            const status = attemptStatus(task)
                            const testCase = run.testSet.cases.find(
                                (c) => c.id === task.caseId
                            )
                            const model = run.models.find(
                                (m) => m.id === task.modelId
                            )
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
                                            {status === 'not-run'
                                                ? t('Not run')
                                                : status}
                                        </span>
                                        <span className="text-muted-foreground">
                                            r{task.repeatIndex + 1}
                                        </span>
                                        {model && (
                                            <span className="font-medium">
                                                {model.name}
                                            </span>
                                        )}
                                    </div>
                                    <div className="truncate italic text-muted-foreground">
                                        {testCase?.prompt}
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    {(pageCount > 1 || modelPageCount > 1) && (
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={safePage === 0}
                                    onClick={() => setPage(safePage - 1)}
                                >
                                    {t('Previous')}
                                </Button>
                                <span className="tabular-nums">
                                    {safePage + 1} / {pageCount}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={safePage >= pageCount - 1}
                                    onClick={() => setPage(safePage + 1)}
                                >
                                    {t('Next')}
                                </Button>
                            </div>
                            {modelPageCount > 1 && (
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
                            )}
                        </div>
                    )}
                </div>

                {openTask && (
                    <Dialog
                        open={openTaskId !== null}
                        onOpenChange={(open) => !open && setOpenTaskId(null)}
                    >
                        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
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
                            <ScrollArea className="flex-1 min-h-0">
                                <div className="space-y-2">
                                    <div className="text-xs italic text-muted-foreground rounded-md border bg-muted/20 p-2 select-text">
                                        {run.testSet.cases.find(
                                            (c) => c.id === openTask.caseId
                                        )?.prompt ?? ''}
                                    </div>
                                    {openTask.attempts.length === 0 && (
                                        <div className="text-xs text-muted-foreground">
                                            {t('Not run')}
                                        </div>
                                    )}
                                    {openTask.attempts.map((attempt, index) => (
                                        <AttemptView
                                            key={attempt.id}
                                            attempt={attempt}
                                            index={index}
                                        />
                                    ))}
                                </div>
                            </ScrollArea>
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
