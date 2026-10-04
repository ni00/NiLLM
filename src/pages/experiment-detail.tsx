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

    const filteredTasks = useMemo(() => {
        if (!run) return []
        return run.tasks.filter(
            (task) =>
                variantFilter === 'all' || task.variantId === variantFilter
        )
    }, [run, variantFilter])

    const pageCount = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE))
    const safePage = Math.min(page, pageCount - 1)
    const visibleTasks = filteredTasks.slice(
        safePage * PAGE_SIZE,
        safePage * PAGE_SIZE + PAGE_SIZE
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
                        <h3 className="text-sm font-semibold">{t('Tasks')}</h3>
                        <select
                            value={variantFilter}
                            onChange={(event) => {
                                setVariantFilter(event.target.value)
                                setPage(0)
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
                    </div>
                    <div className="space-y-2">
                        {visibleTasks.map((task) => {
                            const status = attemptStatus(task)
                            const testCase = run.testSet.cases.find(
                                (c) => c.id === task.caseId
                            )
                            const model = run.models.find(
                                (m) => m.id === task.modelId
                            )
                            const variant = run.variants.find(
                                (v) => v.id === task.variantId
                            )
                            return (
                                <div
                                    key={task.id}
                                    className="rounded-lg border p-2 text-xs space-y-1"
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span
                                            className={
                                                status === 'not-run'
                                                    ? 'text-muted-foreground'
                                                    : status === 'completed'
                                                      ? 'text-emerald-600 dark:text-emerald-400'
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
                                        {variant && <span>{variant.name}</span>}
                                        {model && (
                                            <span className="font-medium">
                                                {model.name}
                                            </span>
                                        )}
                                        <span className="truncate flex-1 italic text-muted-foreground">
                                            {testCase?.prompt}
                                        </span>
                                    </div>
                                    {task.attempts.length > 0 && (
                                        <div className="space-y-1 pl-2 border-l border-border/60 ml-1">
                                            {task.attempts.map(
                                                (attempt, index) => (
                                                    <AttemptView
                                                        key={attempt.id}
                                                        attempt={attempt}
                                                        index={index}
                                                    />
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    {pageCount > 1 && (
                        <div className="flex items-center justify-between text-xs">
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
                    )}
                </div>
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
