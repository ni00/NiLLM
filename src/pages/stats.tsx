import { useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { PageLayout } from '@/features/layout/PageLayout'
import { useStats } from '@/features/stats/hooks/useStats'
import { StatsOverview } from '@/features/stats/components/StatsOverview'
import { PerformanceCharts } from '@/features/stats/components/PerformanceCharts'
import { CapabilityRadar } from '@/features/stats/components/CapabilityRadar'
import { ModelBreakdown } from '@/features/stats/components/ModelBreakdown'
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
        clearSessions
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
            <div className="flex flex-col gap-8 pb-8">
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

                <ModelBreakdown
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
