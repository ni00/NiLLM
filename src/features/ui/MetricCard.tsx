import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BenchmarkMetrics } from '@/lib/types'
import { Zap, Clock, Scale, Hash } from 'lucide-react'

interface MetricCardProps {
    metrics: BenchmarkMetrics
    modelName: string
}

export function MetricCard({ metrics, modelName }: MetricCardProps) {
    return (
        <Card className="w-full bg-card/50 backdrop-blur-sm border-muted">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                    <span>{modelName}</span>
                    <Scale className="h-4 w-4" />
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Zap className="h-3 w-3" /> Speed
                        </span>
                        <span className="text-2xl font-bold">
                            {metrics.tps}{' '}
                            <span className="text-xs font-normal text-muted-foreground">
                                t/s
                            </span>
                        </span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Latency (TTFT)
                        </span>
                        <span className="text-2xl font-bold">
                            {metrics.ttft}{' '}
                            <span className="text-xs font-normal text-muted-foreground">
                                ms
                            </span>
                        </span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Hash className="h-3 w-3" /> Tokens
                        </span>
                        <span className="text-2xl font-bold">
                            {metrics.tokenCount}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
