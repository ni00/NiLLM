import { memo } from 'react'
import { formatStatNumber } from '../display'
import { useI18n } from '@/lib/i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Hash, Zap, Trophy } from 'lucide-react'

interface StatsOverviewProps {
    totalSessions: number
    totalTokensAcrossModels: number
    avgGlobalTPS: number
    topTPSModel?: { name: string }
}

export const StatsOverview = memo(function StatsOverview({
    totalSessions,
    totalTokensAcrossModels,
    avgGlobalTPS,
    topTPSModel
}: StatsOverviewProps) {
    const t = useI18n()
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 w-full max-w-full min-w-0">
            <Card className="relative overflow-hidden border-none bg-primary/5 shadow-none">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                        {t('Total Sessions')}
                    </CardTitle>
                    <MessageSquare className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{totalSessions}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {t('Active conversation threads')}
                    </p>
                </CardContent>
                <div className="absolute -right-2 -bottom-2 opacity-10">
                    <MessageSquare className="h-16 w-16" />
                </div>
            </Card>

            <Card className="relative overflow-hidden border-none bg-blue-500/5 shadow-none">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                        {t('Generated Tokens')}
                    </CardTitle>
                    <Hash className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">
                        {totalTokensAcrossModels.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {t('Successful output; API counts or estimates')}
                    </p>
                </CardContent>
                <div className="absolute -right-2 -bottom-2 opacity-10 text-blue-500">
                    <Hash className="h-16 w-16" />
                </div>
            </Card>

            <Card className="relative overflow-hidden border-none bg-yellow-500/5 shadow-none">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                        {t('Avg. Request Speed')}
                    </CardTitle>
                    <Zap className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">
                        {formatStatNumber(avgGlobalTPS)}{' '}
                        <span className="text-sm font-normal text-muted-foreground">
                            {'t/s'}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {t('Sample-weighted mean generation speed')}
                    </p>
                </CardContent>
                <div className="absolute -right-2 -bottom-2 opacity-10 text-yellow-500">
                    <Zap className="h-16 w-16" />
                </div>
            </Card>

            <Card className="relative overflow-hidden border-none bg-emerald-500/5 shadow-none">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                        {t('Top Performer')}
                    </CardTitle>
                    <Trophy className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div
                        className="text-2xl font-extrabold truncate"
                        title={topTPSModel?.name || 'N/A'}
                    >
                        {topTPSModel?.name || 'N/A'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {t('Highest throughput (TPS)')}
                    </p>
                </CardContent>
                <div className="absolute -right-2 -bottom-2 opacity-10 text-emerald-500">
                    <Trophy className="h-16 w-16" />
                </div>
            </Card>
        </div>
    )
})
