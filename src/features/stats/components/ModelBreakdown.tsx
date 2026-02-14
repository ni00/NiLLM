import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Cpu, Zap, Clock, Star, BarChart3, Trash2 } from 'lucide-react'
import type { ModelStat } from '../hooks/useStats'

interface ModelBreakdownProps {
    modelStats: ModelStat[]
    maxTPS: number
    onClearModel: (modelId: string) => void
}

export function ModelBreakdown({
    modelStats,
    maxTPS,
    onClearModel
}: ModelBreakdownProps) {
    if (modelStats.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-muted/10 border-2 border-dashed rounded-xl">
                <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">
                    Insufficient Data
                </h3>
                <p className="text-sm text-muted-foreground/60 max-w-xs text-center mt-2">
                    Start some conversations in the Arena to populate these
                    performance benchmarks.
                </p>
            </div>
        )
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-primary" /> Model Breakdown
                </h2>
                <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {modelStats.length} Models tracked
                </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {modelStats.map((stat) => (
                    <Card
                        key={stat.id}
                        className="group hover:border-primary/50 transition-all hover:shadow-md"
                    >
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center justify-between gap-2">
                                <span
                                    className="truncate group-hover:text-primary transition-colors"
                                    title={stat.name}
                                >
                                    {stat.name}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onClearModel(stat.id)
                                        }}
                                        className="p-1.5 opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                        title="Clear this model's data"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 border border-muted-foreground/20 px-1.5 py-0.5 rounded">
                                        {stat.provider}
                                    </span>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm py-1 border-b border-muted/50">
                                    <div className="flex items-center text-muted-foreground">
                                        <Zap className="mr-2 h-3.5 w-3.5 text-yellow-500" />{' '}
                                        Speed
                                    </div>
                                    <div className="font-mono font-bold">
                                        {stat.avgTPS.toFixed(1)}{' '}
                                        <span className="text-xs font-normal text-muted-foreground">
                                            t/s
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-sm py-1 border-b border-muted/50">
                                    <div className="flex items-center text-muted-foreground">
                                        <Clock className="mr-2 h-3.5 w-3.5 text-blue-400" />{' '}
                                        Latency
                                    </div>
                                    <div className="font-mono font-bold">
                                        {stat.avgTTFT.toFixed(0)}{' '}
                                        <span className="text-xs font-normal text-muted-foreground">
                                            ms
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-sm py-1 border-b border-muted/50">
                                    <div className="flex items-center text-muted-foreground">
                                        <Star className="mr-2 h-3.5 w-3.5 text-amber-500" />{' '}
                                        Quality
                                    </div>
                                    <div className="font-bold">
                                        {stat.avgRating > 0
                                            ? stat.avgRating.toFixed(1)
                                            : '—'}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-sm py-1">
                                    <div className="flex items-center text-muted-foreground">
                                        <BarChart3 className="mr-2 h-3.5 w-3.5 text-green-400" />{' '}
                                        Samples
                                    </div>
                                    <div className="text-xs font-semibold">
                                        {stat.completedCount} /{' '}
                                        {stat.totalCount} msg
                                    </div>
                                </div>

                                <div className="h-1 w-full bg-muted rounded-full overflow-hidden mt-1">
                                    <div
                                        className="h-full bg-primary transition-all duration-500"
                                        style={{
                                            width: `${(stat.avgTPS / maxTPS) * 100}%`
                                        }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
