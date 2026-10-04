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
            title="Performance"
            description="Live metrics and benchmark results."
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
                        ariaLabel="Time range"
                        value={range}
                        onChange={setRange}
                        options={[
                            { value: 'all', label: 'All time' },
                            { value: '7', label: 'Last 7 days' },
                            { value: '30', label: 'Last 30 days' }
                        ]}
                    />
                </div>
                <div className="w-56">
                    <SelectDropdown
                        ariaLabel="Provider filter"
                        value={providerKey}
                        onChange={setProviderKey}
                        options={[
                            { value: 'all', label: 'All providers' },
                            ...providers.map((p) => ({
                                value: p.key,
                                label: p.label
                            }))
                        ]}
                    />
                </div>
                <div className="w-40">
                    <SelectDropdown
                        ariaLabel="Model mode"
                        value={mode}
                        onChange={(value) =>
                            setMode(value as 'all' | 'chat' | 'image')
                        }
                        options={[
                            { value: 'all', label: 'All modes' },
                            { value: 'chat', label: 'Chat' },
                            { value: 'image', label: 'Image' }
                        ]}
                    />
                </div>
            </div>
            <div className="grid gap-4 mb-6 sm:grid-cols-3">
                <div className="rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">
                        Success rate
                    </p>
                    <p className="text-2xl font-semibold">
                        {completedCount + errorCount + cancelledCount
                            ? `${successRate.toFixed(1)}%`
                            : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {completedCount} completed · {errorCount} failed ·{' '}
                        {cancelledCount} cancelled
                    </p>
                </div>
                <div className="rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">
                        Known cost (USD)
                    </p>
                    <p className="text-2xl font-semibold">
                        {costSampleCount ? `$${totalCost.toFixed(4)}` : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Pricing available for {costSampleCount} /{' '}
                        {completedCount} completed requests
                    </p>
                </div>
                <div className="rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">
                        Token measurements
                    </p>
                    <p className="text-2xl font-semibold">
                        {estimatedCount} estimated
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Provider usage takes precedence. Failed requests
                        excluded from performance averages.
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
