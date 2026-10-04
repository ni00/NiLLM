import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { FlaskConical, Plus, Trash2 } from 'lucide-react'
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
import { ExperimentConfigDialog } from '@/features/experiments/components/ExperimentConfigDialog'
import type { ExperimentRun } from '@/lib/types'

function formatDateTime(timestamp: number) {
    return new Date(timestamp).toLocaleString()
}

function statusLabel(status: ExperimentRun['status']) {
    return status
}

function runProgress(run: ExperimentRun) {
    const executed = run.tasks.filter((t) => t.attempts.length > 0).length
    return { executed, planned: run.tasks.length }
}

export function ExperimentsPage() {
    const t = useI18n()
    const { runs, testSets, deleteExperiment } = useAppStore(
        useShallow((state) => ({
            runs: state.experimentRuns,
            testSets: state.testSets,
            deleteExperiment: state.deleteExperiment
        }))
    )
    const [creating, setCreating] = useState(false)
    const [pendingDelete, setPendingDelete] = useState<string | null>(null)
    const [searchParams, setSearchParams] = useSearchParams()

    useEffect(() => {
        if (searchParams.get('new') === '1') {
            setCreating(true)
            setSearchParams({}, { replace: true })
        }
    }, [searchParams, setSearchParams])

    return (
        <PageLayout
            title={t('Experiments')}
            icon={FlaskConical}
            actions={
                <Button onClick={() => setCreating(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t('New Experiment')}
                </Button>
            }
        >
            <div className="space-y-3 pb-8">
                {runs.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-10 text-center">
                        <p className="font-medium">{t('No experiments yet')}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {testSets.length === 0
                                ? t(
                                      'Create or import a test set first, then run it as an experiment.'
                                  )
                                : t(
                                      'Pick a test set and compare models under identical, independent conditions.'
                                  )}
                        </p>
                        <div className="mt-4 flex justify-center gap-2">
                            {testSets.length === 0 && (
                                <Button asChild variant="outline">
                                    <Link to="/tests">{t('Test Sets')}</Link>
                                </Button>
                            )}
                            <Button onClick={() => setCreating(true)}>
                                {t('New Experiment')}
                            </Button>
                        </div>
                    </div>
                ) : (
                    [...runs]
                        .sort((a, b) => b.createdAt - a.createdAt)
                        .map((run) => {
                            const { executed, planned } = runProgress(run)
                            return (
                                <div
                                    key={run.id}
                                    className="rounded-xl border bg-card p-4 flex flex-wrap items-center gap-3"
                                >
                                    <div className="min-w-0 flex-1">
                                        <Link
                                            to={`/experiments/${run.id}`}
                                            className="font-semibold hover:text-primary truncate block"
                                        >
                                            {run.name}
                                        </Link>
                                        <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
                                            <span>
                                                {formatDateTime(run.createdAt)}
                                            </span>
                                            <span>
                                                {run.models.length}{' '}
                                                {t('models')} · {planned}{' '}
                                                {t('tasks')} · {executed}{' '}
                                                {t('executed')}
                                            </span>
                                            <span className="uppercase tracking-wide font-medium">
                                                {statusLabel(run.status)}
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={t('Delete')}
                                        title={t('Delete')}
                                        onClick={() => setPendingDelete(run.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            )
                        })
                )}
            </div>

            <ExperimentConfigDialog
                open={creating}
                onClose={() => setCreating(false)}
            />

            <AlertDialog
                open={pendingDelete !== null}
                onOpenChange={(open) => !open && setPendingDelete(null)}
            >
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
                        <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (pendingDelete)
                                    void deleteExperiment(pendingDelete)
                                setPendingDelete(null)
                            }}
                        >
                            {t('Delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </PageLayout>
    )
}

export const Component = ExperimentsPage
