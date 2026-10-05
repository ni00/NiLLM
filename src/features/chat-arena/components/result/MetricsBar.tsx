import { useI18n } from '@/lib/i18n'
import { getMetricColor } from '../../utils/metrics'
import type { BenchmarkMetrics } from '@/lib/types'
import { UsageMetrics } from './UsageMetrics'

interface MetricsBarProps {
    isDecision?: boolean
    metrics: BenchmarkMetrics
    ranges: {
        ttft: { min: number; max: number }
        tps: { min: number; max: number }
        duration: { min: number; max: number }
    }
}

export function MetricsBar({ metrics, ranges, isDecision }: MetricsBarProps) {
    const t = useI18n()
    const { ttft: ttftRange, tps: tpsRange, duration: durationRange } = ranges

    return (
        <div
            data-testid="response-metrics"
            className="flex items-center gap-x-4 gap-y-2 text-xs font-mono text-muted-foreground tabular-nums pt-3 mt-1 px-1 border-t border-dashed border-border/40 flex-wrap"
        >
            {!isDecision && (
                <div
                    title={t('Time to First Token')}
                    className="flex items-center gap-1"
                >
                    <span className="opacity-50 font-semibold">{'TTFT'}</span>
                    <span
                        className={`font-bold ${getMetricColor(metrics.ttft, ttftRange.min, ttftRange.max, 'min-best')}`}
                    >
                        {Number(metrics.ttft.toFixed(2))}
                    </span>
                    <span className="opacity-40 text-[8px]">{'ms'}</span>
                </div>
            )}
            {!isDecision && (
                <div
                    title={t('Tokens Per Second')}
                    className="flex items-center gap-1"
                >
                    <span className="opacity-50 font-semibold">{'SPD'}</span>
                    <span
                        className={`font-bold ${getMetricColor(metrics.tps, tpsRange.min, tpsRange.max, 'max-best')}`}
                    >
                        {metrics.tps.toFixed(1)}
                    </span>
                    <span className="opacity-40 text-[8px]">{'t/s'}</span>
                </div>
            )}
            <div
                title={t('Total Duration')}
                className="flex items-center gap-1"
            >
                <span className="opacity-50 font-semibold">{'TIME'}</span>
                <span
                    className={`font-bold ${getMetricColor(metrics.totalDuration, durationRange.min, durationRange.max, 'min-best')}`}
                >
                    {(metrics.totalDuration / 1000).toFixed(2)}
                </span>
                <span className="opacity-40 text-[8px]">{'s'}</span>
            </div>
            <UsageMetrics metrics={metrics} />
            <div
                title={t('Input / output tokens')}
                className="flex items-center gap-1 ml-auto"
            >
                <span className="opacity-50 font-semibold">{'IN/OUT'}</span>
                <span className="font-bold">
                    {metrics.inputTokens ?? '—'} /{' '}
                    {metrics.outputTokens ?? `≈${metrics.tokenCount}`}
                </span>
            </div>
        </div>
    )
}
