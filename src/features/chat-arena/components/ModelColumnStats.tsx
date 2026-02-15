import React from 'react'
import { BenchmarkResult } from '@/lib/types'
import { getMetricColor } from '../utils/metrics'

export interface ModelColumnStatsProps {
    results: BenchmarkResult[]
    footerRanges: {
        ttft: { min: number; max: number }
        tps: { min: number; max: number }
        duration: { min: number; max: number }
        tokens: { min: number; max: number }
    }
}

export const ModelColumnStats = React.memo(
    ({ results, footerRanges }: ModelColumnStatsProps) => {
        const {
            ttft: fTtftRange,
            tps: fTpsRange,
            duration: fTimeRange,
            tokens: fToksRange
        } = footerRanges

        const validTtft = results
            .map((m) => m.metrics?.ttft)
            .filter((v): v is number => !!v && v > 0)

        const avgTtft =
            validTtft.length > 0
                ? validTtft.reduce((a, b) => a + b, 0) / validTtft.length
                : 0

        const validTps = results
            .map((m) => m.metrics?.tps)
            .filter((v): v is number => !!v && v > 0)

        const avgTps =
            validTps.length > 0
                ? validTps.reduce((a, b) => a + b, 0) / validTps.length
                : 0

        const sumTime = results.reduce(
            (acc, r) => acc + (r.metrics?.totalDuration || 0),
            0
        )

        const sumToks = results.reduce(
            (acc, r) => acc + (r.metrics?.tokenCount || 0),
            0
        )

        return (
            <div className="flex flex-wrap gap-1.5 text-xs font-mono text-muted-foreground tabular-nums overflow-hidden">
                <div
                    title="Average TTFT"
                    className="flex items-center gap-1 px-2 py-1 rounded bg-muted/40 whitespace-nowrap flex-1 min-w-[70px] justify-center"
                >
                    <span className="opacity-50">TTFT</span>
                    <span
                        className={`font-bold ${getMetricColor(avgTtft, fTtftRange.min, fTtftRange.max, 'min-best')}`}
                    >
                        {Number(avgTtft.toFixed(2))}
                    </span>
                    <span className="opacity-40 text-[8px]">ms</span>
                </div>

                <div
                    title="Average Tokens/sec"
                    className="flex items-center gap-1 px-2 py-1 rounded bg-muted/40 whitespace-nowrap flex-1 min-w-[70px] justify-center"
                >
                    <span className="opacity-50">SPD</span>
                    <span
                        className={`font-bold ${getMetricColor(avgTps, fTpsRange.min, fTpsRange.max, 'max-best')}`}
                    >
                        {avgTps.toFixed(1)}
                    </span>
                    <span className="opacity-40 text-[8px]">t/s</span>
                </div>

                <div
                    title="Total Duration"
                    className="flex items-center gap-1 px-2 py-1 rounded bg-muted/40 whitespace-nowrap flex-1 min-w-[70px] justify-center"
                >
                    <span className="opacity-50">TIME</span>
                    <span
                        className={`font-bold ${getMetricColor(sumTime, fTimeRange.min, fTimeRange.max, 'min-best')}`}
                    >
                        {(sumTime / 1000).toFixed(2)}
                    </span>
                    <span className="opacity-40 text-[8px]">s</span>
                </div>

                <div
                    title="Total Tokens"
                    className="flex items-center gap-1 px-2 py-1 rounded bg-muted/40 whitespace-nowrap flex-1 min-w-[70px] justify-center"
                >
                    <span className="opacity-50">TOKS</span>
                    <span
                        className={`font-bold ${getMetricColor(sumToks, fToksRange.min, fToksRange.max, 'min-best')}`}
                    >
                        {sumToks}
                    </span>
                </div>
            </div>
        )
    }
)

ModelColumnStats.displayName = 'ModelColumnStats'
