import { useI18n } from '@/lib/i18n'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { PageLayout } from '@/features/layout/PageLayout'
import { useStats } from '@/features/stats/hooks/useStats'
import { StatsOverview } from '@/features/stats/components/StatsOverview'
import { PerformanceCharts } from '@/features/stats/components/PerformanceCharts'
import { CapabilityRadar } from '@/features/stats/components/CapabilityRadar'
import { EvaluationModels } from '@/features/stats/components/EvaluationModels'
import { ExportMenu } from '@/features/stats/components/ExportMenu'
import { ConfirmClearDialog } from '@/features/stats/components/ConfirmClearDialog'

export function StatsPage() {
    const t = useI18n()
    const {
        mounted,
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
        estimatedCount
    } = useStats()

    const [confirmClearModel, setConfirmClearModel] = useState<string | null>(
        null
    )

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
                    modelStats={modelStats}
                    filters={{ range, providerKey, mode }}
                    totalSessions={totalSessions}
                    totalMessages={totalMessages}
                    totalTokensAcrossModels={totalTokensAcrossModels}
                    avgGlobalTPS={avgGlobalTPS}
                    topTPSModel={topTPSModel}
                    topRatingModel={topRatingModel}
                    fastestModel={fastestModel}
                    onClearAll={clearSessions}
                />
            }
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
                            setMode(value as 'all' | 'chat' | 'image')
                        }
                        options={[
                            { value: 'all', label: t('All modes') },
                            { value: 'chat', label: t('Chat') },
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
                            ? `${successRate.toFixed(1)}%`
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
                        {costSampleCount ? `$${totalCost.toFixed(4)}` : '—'}
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
                        {t('{count} estimated', { count: estimatedCount })}
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

                <PerformanceCharts chartData={chartData} mounted={mounted} />

                <CapabilityRadar
                    radarData={radarData}
                    mounted={mounted}
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
