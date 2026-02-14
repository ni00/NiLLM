import { getMetricColor } from '../../utils/metrics'

interface Metrics {
    ttft: number
    tps: number
    totalDuration: number
    tokenCount: number
}

interface MetricsBarProps {
    metrics: Metrics
    ranges: {
        ttft: { min: number; max: number }
        tps: { min: number; max: number }
        duration: { min: number; max: number }
    }
}

export function MetricsBar({ metrics, ranges }: MetricsBarProps) {
    const { ttft: ttftRange, tps: tpsRange, duration: durationRange } = ranges

    return (
        <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground tabular-nums pt-3 mt-1 px-1 opacity-70 border-t border-dashed border-border/40">
            <div
                title="Time to First Token"
                className="flex items-center gap-1"
            >
                <span className="opacity-50 font-semibold">TTFT</span>
                <span
                    className={`font-bold ${getMetricColor(metrics.ttft, ttftRange.min, ttftRange.max, 'min-best')}`}
                >
                    {metrics.ttft}
                </span>
                <span className="opacity-40 text-[8px]">ms</span>
            </div>
            <div title="Tokens Per Second" className="flex items-center gap-1">
                <span className="opacity-50 font-semibold">SPD</span>
                <span
                    className={`font-bold ${getMetricColor(metrics.tps, tpsRange.min, tpsRange.max, 'max-best')}`}
                >
                    {metrics.tps.toFixed(1)}
                </span>
                <span className="opacity-40 text-[8px]">t/s</span>
            </div>
            <div title="Total Duration" className="flex items-center gap-1">
                <span className="opacity-50 font-semibold">TIME</span>
                <span
                    className={`font-bold ${getMetricColor(metrics.totalDuration, durationRange.min, durationRange.max, 'min-best')}`}
                >
                    {(metrics.totalDuration / 1000).toFixed(2)}
                </span>
                <span className="opacity-40 text-[8px]">s</span>
            </div>
            <div
                title="Total Tokens"
                className="flex items-center gap-1 ml-auto"
            >
                <span className="opacity-50 font-semibold">TOKS</span>
                <span className="font-bold">{metrics.tokenCount}</span>
            </div>
        </div>
    )
}
