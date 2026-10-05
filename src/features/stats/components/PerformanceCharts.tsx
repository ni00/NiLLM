import { memo, useMemo } from 'react'
import { useI18n } from '@/lib/i18n'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card'
import { Activity, Clock } from 'lucide-react'
import type { ChartDataPoint } from '../hooks/useStats'
import { formatStatNumber } from '../display'

export const PerformanceCharts = memo(function PerformanceCharts({
    chartData
}: {
    chartData: ChartDataPoint[]
}) {
    const t = useI18n()
    const comparisons = useMemo(
        () => [
            {
                key: 'speed' as const,
                title: 'Generation Speed (t/s)',
                description: 'Throughput comparison per model.',
                unit: 't/s',
                icon: Activity,
                rows: [...chartData]
                    .sort((a, b) => (b.speed ?? -1) - (a.speed ?? -1))
                    .slice(0, 12)
            },
            {
                key: 'latency' as const,
                title: 'Avg. Latency (ms)',
                description: 'Time to first token (Lower is better).',
                unit: 'ms',
                icon: Clock,
                rows: [...chartData]
                    .sort(
                        (a, b) =>
                            (a.latency ?? Infinity) - (b.latency ?? Infinity)
                    )
                    .slice(0, 12)
            }
        ],
        [chartData]
    )
    return (
        <div
            className="grid gap-6 xl:grid-cols-2 min-w-0"
            data-stats-performance
        >
            {comparisons.map(
                ({ key, title, description, unit, icon: Icon, rows }) => {
                    const maximum = Math.max(
                        1,
                        ...rows.map((row) => row[key] ?? 0)
                    )
                    return (
                        <Card
                            key={key}
                            className="min-w-0"
                            aria-label={t(title)}
                        >
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    {t(title)}
                                </CardTitle>
                                <CardDescription>
                                    {t(description)}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ol className="space-y-4">
                                    {rows.map((row) => (
                                        <li
                                            key={row.id}
                                            className="min-w-0"
                                            data-stats-bar={key}
                                        >
                                            <div className="flex items-start gap-4 mb-2">
                                                <div className="min-w-0 flex-1">
                                                    <p
                                                        className="truncate text-sm font-medium leading-5"
                                                        title={row.name}
                                                    >
                                                        {row.name}
                                                    </p>
                                                    <p
                                                        className="truncate text-xs text-muted-foreground leading-5"
                                                        title={row.provider}
                                                    >
                                                        {row.provider}
                                                    </p>
                                                </div>
                                                <p
                                                    className="shrink-0 text-sm font-semibold tabular-nums text-right"
                                                    data-stats-value
                                                >
                                                    {formatStatNumber(row[key])}
                                                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                                                        {unit}
                                                    </span>
                                                </p>
                                            </div>
                                            <div
                                                className="h-2 rounded-full bg-muted overflow-hidden"
                                                aria-hidden
                                            >
                                                <div
                                                    className="h-full rounded-full bg-primary/75"
                                                    style={{
                                                        width: `${((row[key] ?? 0) / maximum) * 100}%`
                                                    }}
                                                />
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                                {!rows.length && (
                                    <p className="text-sm text-muted-foreground py-8 text-center">
                                        {t('Insufficient Data')}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )
                }
            )}
        </div>
    )
})
