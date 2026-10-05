import { useI18n } from '@/lib/i18n'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { lazy, Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useExperimentRuns } from '@/lib/hooks/useStoreSelectors'
import type { ReportInput } from '@/features/stats/domain/report'
import { formatStatCost, formatStatNumber } from '@/features/stats/display'
import { Button } from '@/components/ui/button'
import { BarChart3 } from 'lucide-react'
import { PageLayout } from '@/features/layout/PageLayout'
import { useStats } from '@/features/stats/hooks/useStats'
import { StatsOverview } from '@/features/stats/components/StatsOverview'
import { PerformanceCharts } from '@/features/stats/components/PerformanceCharts'
import { CapabilityRadar } from '@/features/stats/components/CapabilityRadar'
import { EvaluationModels } from '@/features/stats/components/EvaluationModels'
import { ExportMenu } from '@/features/stats/components/ExportMenu'
import { ConfirmClearDialog } from '@/features/stats/components/ConfirmClearDialog'

const ExperimentReport = lazy(() =>
    import('@/features/stats/components/ExperimentReport').then((module) => ({
        default: module.ExperimentReport
    }))
)

export function StatsPage() {
    const t = useI18n()
    const {
        modelStats,
        totalSessions,
        totalMessages,
        totalTokensAcrossModels,
        avgGlobalTPS,
        topTPSModel,
        topRatingModel,
        fastestModel,
        chartData,
        radarData,
        maxTPS,
        clearModelResults,
        clearSessions,
        range,
        setRange,
        providerKey,
        setProviderKey,
        mode,
        setMode,
        providers,
        successRate,
        completedCount,
        errorCount,
        cancelledCount,
        totalCost,
        costSampleCount,
        estimatedCount,
        reportInput: arenaInput
    } = useStats()

    const [confirmClearModel, setConfirmClearModel] = useState<string | null>(
        null
    )
    const runs = useExperimentRuns()
    const [searchParams, setSearchParams] = useSearchParams()
    const tab =
        searchParams.get('tab') === 'arena'
            ? 'arena'
            : searchParams.has('run') ||
                searchParams.get('tab') === 'experiments'
              ? 'experiments'
              : 'arena'
    const runId = searchParams.get('run') ?? ''
    const variantId = searchParams.get('variant') || undefined
    const run = runs.find((candidate) => candidate.id === runId)
    const [baselineId, setBaselineId] = useState('')
    const [baselineVariantId, setBaselineVariantId] = useState('')
    const baselineRun = runs.find((candidate) => candidate.id === baselineId)
    const baseline = useMemo(
        () =>
            baselineRun
                ? { run: baselineRun, variantId: baselineVariantId }
                : undefined,
        [baselineRun, baselineVariantId]
    )
    const validVariant =
        !variantId ||
        !!run?.variants.some((variant) => variant.id === variantId)
    const experimentInput = useMemo<ReportInput | undefined>(
        () =>
            run && validVariant && (!baselineId || baselineRun)
                ? { source: 'experiment', run, variantId, baseline }
                : undefined,
        [run, validVariant, variantId, baseline, baselineId, baselineRun]
    )
    const selectTab = (value: string) =>
        setSearchParams((previous) => {
            const next = new URLSearchParams(previous)
            next.set('tab', value)
            return next
        })
    const selectRun = (value: string) => {
        setSearchParams((previous) => {
            const next = new URLSearchParams(previous)
            next.set('run', value)
            next.delete('variant')
            return next
        })
        setBaselineId('')
        setBaselineVariantId('')
    }
    const selectVariant = (value: string) =>
        setSearchParams((previous) => {
            const next = new URLSearchParams(previous)
            if (value === 'all') next.delete('variant')
            else next.set('variant', value)
            return next
        })

    const handleClearModel = () => {
        if (confirmClearModel) {
            clearModelResults(confirmClearModel)
            setConfirmClearModel(null)
        }
    }

    const selectedModelName = confirmClearModel
        ? modelStats.find((s) => s.id === confirmClearModel)?.name
        : undefined

    return (
        <PageLayout
            title={t('Performance')}
            icon={BarChart3}
            actions={
                <ExportMenu
                    input={tab === 'arena' ? arenaInput : experimentInput}
                    onClearAll={tab === 'arena' ? clearSessions : undefined}
                />
            }
        >
            <div
                role="tablist"
                aria-label={t('Statistics source')}
                className="flex flex-wrap gap-2 mb-6"
                onKeyDown={(event) => {
                    if (
                        !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(
                            event.key
                        )
                    )
                        return
                    event.preventDefault()
                    const next =
                        event.key === 'Home'
                            ? 'arena'
                            : event.key === 'End'
                              ? 'experiments'
                              : tab === 'arena'
                                ? 'experiments'
                                : 'arena'
                    selectTab(next)
                    document.getElementById(`stats-tab-${next}`)?.focus()
                }}
            >
                {(['arena', 'experiments'] as const).map((value) => (
                    <Button
                        key={value}
                        id={`stats-tab-${value}`}
                        role="tab"
                        aria-selected={tab === value}
                        aria-controls={`stats-panel-${value}`}
                        tabIndex={tab === value ? 0 : -1}
                        variant={tab === value ? 'default' : 'outline'}
                        onClick={() => selectTab(value)}
                    >
                        {value === 'arena'
                            ? t('Arena statistics')
                            : t('Experiment reports')}
                    </Button>
                ))}
            </div>
            {tab === 'experiments' ? (
                <div
                    id="stats-panel-experiments"
                    role="tabpanel"
                    aria-labelledby="stats-tab-experiments"
                    className="min-w-0"
                >
                    <div className="grid gap-3 mb-6 sm:grid-cols-2 xl:grid-cols-4">
                        <SelectDropdown
                            ariaLabel={t('Select experiment')}
                            value={runId}
                            onChange={selectRun}
                            options={runs.map((candidate) => ({
                                value: candidate.id,
                                label: candidate.name
                            }))}
                            placeholder={t('Select experiment')}
                        />
                        <SelectDropdown
                            ariaLabel={t('Target parameter group')}
                            value={variantId ?? 'all'}
                            onChange={selectVariant}
                            disabled={!run}
                            options={[
                                {
                                    value: 'all',
                                    label: t('All parameter groups')
                                },
                                ...(run?.variants.map((variant) => ({
                                    value: variant.id,
                                    label: variant.name
                                })) ?? [])
                            ]}
                        />
                        <SelectDropdown
                            ariaLabel={t('Baseline experiment')}
                            value={baselineId}
                            onChange={(value) => {
                                setBaselineId(value)
                                setBaselineVariantId('')
                            }}
                            disabled={!run}
                            options={[
                                { value: '', label: t('No baseline') },
                                ...runs.map((candidate) => ({
                                    value: candidate.id,
                                    label: candidate.name
                                }))
                            ]}
                        />
                        <SelectDropdown
                            ariaLabel={t('Baseline parameter group')}
                            value={baselineVariantId}
                            onChange={setBaselineVariantId}
                            disabled={!baselineRun}
                            options={
                                baselineRun?.variants.map((variant) => ({
                                    value: variant.id,
                                    label: variant.name
                                })) ?? []
                            }
                            placeholder={t('Choose baseline parameter group')}
                        />
                    </div>
                    {!run ? (
                        <p
                            role="status"
                            className="rounded-xl border p-6 text-sm text-muted-foreground"
                        >
                            {runId
                                ? t(
                                      'This experiment is no longer available. Select another experiment.'
                                  )
                                : t(
                                      'Select an experiment to inspect frozen metrics, quality signals and request evidence.'
                                  )}
                        </p>
                    ) : !validVariant ? (
                        <p
                            role="status"
                            className="rounded-xl border p-6 text-sm text-muted-foreground"
                        >
                            {t(
                                'This parameter group is no longer available. Select another group.'
                            )}
                        </p>
                    ) : (
                        <>
                            {baselineId && !baselineRun && (
                                <p
                                    role="status"
                                    className="text-sm text-destructive mb-4"
                                >
                                    {t(
                                        'The selected baseline is no longer available.'
                                    )}
                                </p>
                            )}
                            <Suspense
                                fallback={
                                    <p
                                        role="status"
                                        className="py-6 text-sm text-muted-foreground"
                                    >
                                        {t('Loading...')}
                                    </p>
                                }
                            >
                                <ExperimentReport
                                    run={run}
                                    variantId={variantId}
                                    baseline={baseline}
                                />
                            </Suspense>
                        </>
                    )}
                </div>
            ) : (
                <div
                    id="stats-panel-arena"
                    role="tabpanel"
                    aria-labelledby="stats-tab-arena"
                    className="min-w-0"
                >
                    <div className="flex flex-wrap gap-3 mb-6">
                        <div className="w-40">
                            <SelectDropdown
                                ariaLabel={t('Time range')}
                                value={range}
                                onChange={setRange}
                                options={[
                                    { value: 'all', label: t('All time') },
                                    { value: '7', label: t('Last 7 days') },
                                    { value: '30', label: t('Last 30 days') }
                                ]}
                            />
                        </div>
                        <div className="w-56">
                            <SelectDropdown
                                ariaLabel={t('Provider filter')}
                                value={providerKey}
                                onChange={setProviderKey}
                                options={[
                                    { value: 'all', label: t('All providers') },
                                    ...providers.map((p) => ({
                                        value: p.key,
                                        label: p.label
                                    }))
                                ]}
                            />
                        </div>
                        <div className="w-40">
                            <SelectDropdown
                                ariaLabel={t('Model mode')}
                                value={mode}
                                onChange={(value) =>
                                    setMode(
                                        value as
                                            | 'all'
                                            | 'chat'
                                            | 'image'
                                            | 'decision'
                                    )
                                }
                                options={[
                                    { value: 'all', label: t('All modes') },
                                    { value: 'chat', label: t('Chat') },
                                    { value: 'decision', label: t('Decision') },
                                    { value: 'image', label: t('Image') }
                                ]}
                            />
                        </div>
                    </div>
                    <div className="grid gap-4 mb-6 sm:grid-cols-3">
                        <div className="rounded-xl border p-4">
                            <p className="text-sm text-muted-foreground">
                                {t('Success rate')}
                            </p>
                            <p className="text-2xl font-semibold">
                                {completedCount + errorCount + cancelledCount
                                    ? `${formatStatNumber(successRate)}%`
                                    : '—'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {t(
                                    '{completed} completed · {failed} failed · {cancelled} cancelled',
                                    {
                                        completed: completedCount,
                                        failed: errorCount,
                                        cancelled: cancelledCount
                                    }
                                )}
                            </p>
                        </div>
                        <div className="rounded-xl border p-4">
                            <p className="text-sm text-muted-foreground">
                                {t('Known cost (USD)')}
                            </p>
                            <p className="text-2xl font-semibold">
                                {formatStatCost(
                                    costSampleCount ? totalCost : undefined
                                )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {t(
                                    'Pricing available for {priced} / {completed} completed requests',
                                    {
                                        priced: costSampleCount,
                                        completed: completedCount
                                    }
                                )}
                            </p>
                        </div>
                        <div className="rounded-xl border p-4">
                            <p className="text-sm text-muted-foreground">
                                {t('Token measurements')}
                            </p>
                            <p className="text-2xl font-semibold">
                                {t('{count} estimated', {
                                    count: estimatedCount
                                })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {t(
                                    'Provider usage takes precedence. Failed requests excluded from performance averages.'
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-8 pb-8 w-full max-w-full min-w-0">
                        <StatsOverview
                            totalSessions={totalSessions}
                            totalTokensAcrossModels={totalTokensAcrossModels}
                            avgGlobalTPS={avgGlobalTPS}
                            topTPSModel={topTPSModel}
                        />

                        <PerformanceCharts chartData={chartData} />

                        <CapabilityRadar
                            radarData={radarData}
                            fastestModel={fastestModel}
                            topRatingModel={topRatingModel}
                            totalMessages={totalMessages}
                        />

                        <EvaluationModels
                            modelStats={modelStats}
                            maxTPS={maxTPS}
                            onClearModel={setConfirmClearModel}
                        />
                    </div>
                </div>
            )}

            <ConfirmClearDialog
                isOpen={!!confirmClearModel}
                modelName={selectedModelName}
                onConfirm={handleClearModel}
                onCancel={() => setConfirmClearModel(null)}
            />
        </PageLayout>
    )
}

export const Component = StatsPage
