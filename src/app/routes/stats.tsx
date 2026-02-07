import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { BarChart3, Clock, Zap, Star } from 'lucide-react'

export function StatsPage() {
    const { sessions, models } = useAppStore()

    // Calculate aggregate stats
    const stats = models
        .map((model) => {
            let totalTPS = 0
            let tpsCount = 0
            let totalTTFT = 0
            let ttftCount = 0
            let totalCount = 0
            let totalRating = 0
            let ratingCount = 0

            sessions.forEach((session) => {
                const results = session.results[model.id] || []
                results.forEach((r) => {
                    totalCount++
                    if (r.metrics?.tps > 0) {
                        totalTPS += r.metrics.tps
                        tpsCount++
                    }
                    if (r.metrics?.ttft > 0) {
                        totalTTFT += r.metrics.ttft
                        ttftCount++
                    }
                    if (r.rating) {
                        totalRating += r.rating
                        ratingCount++
                    }
                })
            })

            return {
                id: model.id,
                name: model.name,
                provider: model.providerName || model.provider,
                avgTPS:
                    tpsCount > 0 ? (totalTPS / tpsCount).toFixed(2) : '0.00',
                avgTTFT:
                    ttftCount > 0 ? (totalTTFT / ttftCount).toFixed(0) : '0',
                avgRating:
                    ratingCount > 0
                        ? (totalRating / ratingCount).toFixed(1)
                        : 'N/A',
                count: totalCount,
                completedCount: tpsCount
            }
        })
        .filter((s) => s.count > 0)

    return (
        <div className="flex flex-col h-full gap-4 p-6">
            <h1 className="text-2xl font-bold tracking-tight">Statistics</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Sessions
                        </CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {sessions.length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <h2 className="text-xl font-semibold mt-6">Model Performance</h2>
            <ScrollArea className="flex-1">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {stats.map((stat) => (
                        <Card key={stat.id}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center justify-between gap-2">
                                    <span
                                        className="truncate"
                                        title={stat.name}
                                    >
                                        {stat.name}
                                    </span>
                                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 border px-1.5 py-0.5 rounded">
                                        {stat.provider}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-2">
                                    {stat.avgRating !== 'N/A' && (
                                        <div className="flex items-center justify-between pb-2 border-b border-dashed mb-2">
                                            <div className="flex items-center text-sm font-medium">
                                                <Star className="mr-2 h-4 w-4 text-amber-500 fill-amber-500" />{' '}
                                                Score
                                            </div>
                                            <div className="font-bold flex items-center gap-1">
                                                {stat.avgRating}{' '}
                                                <span className="text-muted-foreground text-xs font-normal">
                                                    / 5.0
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center text-sm text-muted-foreground">
                                            <Zap className="mr-2 h-4 w-4" /> Avg
                                            Speed
                                        </div>
                                        <div className="font-bold">
                                            {stat.avgTPS} t/s
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center text-sm text-muted-foreground">
                                            <Clock className="mr-2 h-4 w-4" />{' '}
                                            Avg Latency
                                        </div>
                                        <div className="font-bold">
                                            {stat.avgTTFT} ms
                                        </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-2">
                                        Based on {stat.completedCount} completed
                                        (of {stat.count} total)
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {stats.length === 0 && (
                        <div className="col-span-full text-center text-muted-foreground py-10">
                            No data available yet. Start chatting in the Arena
                            to detect metrics.
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}

export const Component = StatsPage
