import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Hash, Zap, Trophy } from 'lucide-react'

interface StatsOverviewProps {
    totalSessions: number
    totalTokensAcrossModels: number
    avgGlobalTPS: number
    topTPSModel?: { name: string }
}

export function StatsOverview({
    totalSessions,
    totalTokensAcrossModels,
    avgGlobalTPS,
    topTPSModel
}: StatsOverviewProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden border-none bg-primary/5 shadow-none">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                        Total Sessions
                    </CardTitle>
                    <MessageSquare className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{totalSessions}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Active conversation threads
                    </p>
                </CardContent>
                <div className="absolute -right-2 -bottom-2 opacity-10">
                    <MessageSquare className="h-16 w-16" />
                </div>
            </Card>

            <Card className="relative overflow-hidden border-none bg-blue-500/5 shadow-none">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                        Generated Tokens
                    </CardTitle>
                    <Hash className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">
                        {totalTokensAcrossModels.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Total model output volume
                    </p>
                </CardContent>
                <div className="absolute -right-2 -bottom-2 opacity-10 text-blue-500">
                    <Hash className="h-16 w-16" />
                </div>
            </Card>

            <Card className="relative overflow-hidden border-none bg-yellow-500/5 shadow-none">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                        Avg. System Speed
                    </CardTitle>
                    <Zap className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">
                        {avgGlobalTPS.toFixed(2)}{' '}
                        <span className="text-sm font-normal text-muted-foreground">
                            t/s
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        System-wide throughput
                    </p>
                </CardContent>
                <div className="absolute -right-2 -bottom-2 opacity-10 text-yellow-500">
                    <Zap className="h-16 w-16" />
                </div>
            </Card>

            <Card className="relative overflow-hidden border-none bg-amber-500/5 shadow-none">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                        Top Performer
                    </CardTitle>
                    <Trophy className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                    <div
                        className="text-2xl font-extrabold truncate"
                        title={topTPSModel?.name || 'N/A'}
                    >
                        {topTPSModel?.name || 'N/A'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Highest throughput (TPS)
                    </p>
                </CardContent>
                <div className="absolute -right-2 -bottom-2 opacity-10 text-amber-500">
                    <Trophy className="h-16 w-16" />
                </div>
            </Card>
        </div>
    )
}
