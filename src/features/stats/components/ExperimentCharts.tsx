import { useMemo, useState } from 'react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ScatterChart,
    Scatter,
    Legend
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { useI18n } from '@/lib/i18n'
import type { BenchmarkResult } from '@/lib/types'
import type { ExperimentModelStat } from '@/features/experiments/domain/statistics'
import { formatStatCost as formatUSD, formatStatNumber } from '../display'

interface ChartTrial {
    result: BenchmarkResult
    variantName: string
}

function histogram(trials: ChartTrial[], field: 'ttft' | 'totalDuration') {
    let maximum = 0
    for (const { result } of trials) {
        const value = result.metrics[field]
        if (Number.isFinite(value) && value > maximum) maximum = value
    }
    if (!maximum) return []
    const width = maximum / 20
    const bins = Array.from({ length: 20 }, (_, index) => ({
        count: 0,
        estimated: 0,
        groups: [] as string[],
        range: `${(index * width).toFixed(1)}–${((index + 1) * width).toFixed(1)}`
    }))
    for (const { result, variantName } of trials) {
        const value = result.metrics[field]
        if (!Number.isFinite(value) || value <= 0) continue
        const bin = bins[Math.min(19, Math.floor((value / maximum) * 20))]
        bin.count++
        if (result.metrics.tokenSource === 'estimated') bin.estimated++
        if (!bin.groups.includes(variantName)) bin.groups.push(variantName)
    }
    return bins
}

export function ExperimentCharts({
    modelStats,
    results
}: {
    modelStats: ExperimentModelStat[]
    results: ChartTrial[]
}) {
    const t = useI18n()
    const [quality, setQuality] = useState('ai')
    const distributions = useMemo(
        () => [
            {
                label: 'TTFT distribution (ms)',
                bins: histogram(results, 'ttft')
            },
            {
                label: 'Duration distribution (ms)',
                bins: histogram(results, 'totalDuration')
            }
        ],
        [results]
    )
    const qualityRows = useMemo(
        () =>
            modelStats.map((stat) => ({
                name: `${stat.name} · ${stat.variantName}`,
                accuracy: stat.aiRatingCount ? stat.aiAccuracyMean : undefined,
                instruction: stat.aiRatingCount
                    ? stat.aiInstructionFollowingMean
                    : undefined,
                completeness: stat.aiRatingCount
                    ? stat.aiCompletenessMean
                    : undefined,
                human: stat.humanRatingCount ? stat.humanAvgRating : undefined,
                rule: stat.ruleEvaluatedCount ? stat.rulePassRate : undefined,
                aiN: stat.aiRatingCount,
                humanN: stat.humanRatingCount,
                ruleN: stat.ruleEvaluatedCount,
                variant: stat.variantName,
                estimated: stat.estimatedSpeedSampleCount,
                speedN: stat.speedSampleCount
            })),
        [modelStats]
    )
    const scatterRows = useMemo(
        () =>
            modelStats.flatMap((stat) => {
                const n =
                    quality === 'ai'
                        ? stat.aiRatingCount
                        : quality === 'human'
                          ? stat.humanRatingCount
                          : stat.ruleEvaluatedCount
                if (!n || !stat.costSampleCount) return []
                return [
                    {
                        id: JSON.stringify([stat.id, stat.variantId]),
                        name: stat.name,
                        variant: stat.variantName,
                        cost: stat.totalCost / stat.costSampleCount,
                        quality:
                            quality === 'ai'
                                ? stat.aiAccuracyMean
                                : quality === 'human'
                                  ? stat.humanAvgRating
                                  : stat.rulePassRate,
                        n,
                        priced: stat.costSampleCount,
                        estimated: stat.estimatedSpeedSampleCount,
                        speedN: stat.speedSampleCount
                    }
                ]
            }),
        [modelStats, quality]
    )
    const insufficient = (
        <p className="text-sm text-muted-foreground py-6">
            {t('Insufficient Data')}
        </p>
    )
    const hasStars = qualityRows.some((row) => row.aiN || row.humanN)
    const hasRules = qualityRows.some((row) => row.ruleN)

    return (
        <div className="space-y-6 min-w-0">
            <div className="grid gap-6 lg:grid-cols-2 min-w-0">
                {distributions.map(({ label, bins }) => (
                    <Card key={label} className="min-w-0">
                        <CardHeader>
                            <CardTitle className="text-base">
                                {t(label)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!bins.length ? (
                                insufficient
                            ) : (
                                <>
                                    <div
                                        className="h-56 min-w-0"
                                        aria-hidden="true"
                                    >
                                        <ResponsiveContainer
                                            width="100%"
                                            height="100%"
                                            minWidth={0}
                                        >
                                            <BarChart data={bins}>
                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                    stroke="var(--border)"
                                                />
                                                <XAxis
                                                    dataKey="range"
                                                    fontSize={10}
                                                    interval={4}
                                                />
                                                <YAxis
                                                    tickFormatter={
                                                        formatStatNumber
                                                    }
                                                    allowDecimals={false}
                                                    width={35}
                                                />
                                                <Tooltip
                                                    content={({
                                                        active,
                                                        payload
                                                    }) => {
                                                        const bin = payload?.[0]
                                                            ?.payload as
                                                            | (typeof bins)[number]
                                                            | undefined
                                                        return active && bin ? (
                                                            <div className="rounded-lg border bg-background p-3 text-xs space-y-1">
                                                                <p>
                                                                    {bin.range}{' '}
                                                                    ms · n=
                                                                    {bin.count}
                                                                </p>
                                                                <p>
                                                                    {t(
                                                                        'Parameter groups'
                                                                    )}
                                                                    :{' '}
                                                                    {bin.groups.join(
                                                                        ', '
                                                                    ) || '—'}
                                                                </p>
                                                                <p>
                                                                    {t(
                                                                        'Estimated token measurements'
                                                                    )}
                                                                    :{' '}
                                                                    {
                                                                        bin.estimated
                                                                    }
                                                                    /{bin.count}
                                                                </p>
                                                            </div>
                                                        ) : null
                                                    }}
                                                />
                                                <Bar
                                                    dataKey="count"
                                                    name={t('Samples')}
                                                    fill="var(--primary)"
                                                    isAnimationActive={false}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <details className="text-xs mt-3">
                                        <summary className="cursor-pointer min-h-11 flex items-center">
                                            {t('View chart data')}
                                        </summary>
                                        <table className="w-full text-left tabular-nums">
                                            <thead>
                                                <tr>
                                                    <th>{t('Range (ms)')}</th>
                                                    <th>{t('Samples')}</th>
                                                    <th>
                                                        {t('Parameter groups')}
                                                    </th>
                                                    <th>
                                                        {t(
                                                            'Estimated token measurements'
                                                        )}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {bins.map((bin, index) => (
                                                    <tr key={index}>
                                                        <td>{bin.range}</td>
                                                        <td>{bin.count}</td>
                                                        <td>
                                                            {bin.groups.join(
                                                                ', '
                                                            ) || '—'}
                                                        </td>
                                                        <td>
                                                            {bin.estimated}/
                                                            {bin.count}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </details>
                                </>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Card className="min-w-0">
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <CardTitle className="text-base">
                            {t('Quality versus known cost')}
                        </CardTitle>
                        <SelectDropdown
                            ariaLabel={t('Quality dimension')}
                            value={quality}
                            onChange={setQuality}
                            width="w-56"
                            options={[
                                { value: 'ai', label: t('AI accuracy') },
                                { value: 'human', label: t('Human stars') },
                                { value: 'rule', label: t('Rule pass rate') }
                            ]}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {t(
                            'Only groups with the selected quality signal and known generation cost are plotted. Missing signals do not fall back to another score.'
                        )}
                    </p>
                </CardHeader>
                <CardContent>
                    {!scatterRows.length ? (
                        insufficient
                    ) : (
                        <>
                            <div className="h-64 min-w-0" aria-hidden="true">
                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                    minWidth={0}
                                >
                                    <ScatterChart
                                        margin={{
                                            top: 10,
                                            right: 15,
                                            left: 0,
                                            bottom: 25
                                        }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="var(--border)"
                                        />
                                        <XAxis
                                            type="number"
                                            dataKey="cost"
                                            name={t(
                                                'Mean known generation cost (USD)'
                                            )}
                                            tickFormatter={(value: number) =>
                                                formatUSD(value)
                                            }
                                            fontSize={10}
                                        />
                                        <YAxis
                                            tickFormatter={formatStatNumber}
                                            type="number"
                                            dataKey="quality"
                                            domain={
                                                quality === 'rule'
                                                    ? [0, 100]
                                                    : [1, 5]
                                            }
                                            name={
                                                quality === 'ai'
                                                    ? t('AI accuracy')
                                                    : quality === 'human'
                                                      ? t('Human stars')
                                                      : t('Rule pass rate')
                                            }
                                        />
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                const row = payload?.[0]
                                                    ?.payload as
                                                    | (typeof scatterRows)[number]
                                                    | undefined
                                                return active && row ? (
                                                    <div className="rounded-lg border bg-background p-3 text-xs space-y-1">
                                                        <p>
                                                            {row.name} ·{' '}
                                                            {row.variant}
                                                        </p>
                                                        <p>
                                                            {t('Quality')}:{' '}
                                                            {row.quality.toFixed(
                                                                2
                                                            )}{' '}
                                                            · n={row.n}
                                                        </p>
                                                        <p>
                                                            {t(
                                                                'Mean known generation cost (USD)'
                                                            )}
                                                            :{' '}
                                                            {formatUSD(
                                                                row.cost
                                                            )}{' '}
                                                            · n={row.priced}
                                                        </p>
                                                        <p>
                                                            {t(
                                                                'Estimated TPS samples'
                                                            )}
                                                            : {row.estimated}/
                                                            {row.speedN}
                                                        </p>
                                                    </div>
                                                ) : null
                                            }}
                                        />
                                        <Scatter
                                            data={scatterRows}
                                            fill="var(--primary)"
                                            isAnimationActive={false}
                                        />
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left tabular-nums whitespace-nowrap">
                                    <thead>
                                        <tr>
                                            <th className="p-2">
                                                {t('Model / parameter group')}
                                            </th>
                                            <th className="p-2">
                                                {t('Quality')}
                                            </th>
                                            <th className="p-2">n</th>
                                            <th className="p-2">
                                                {t(
                                                    'Mean known generation cost (USD)'
                                                )}
                                            </th>
                                            <th className="p-2">
                                                {t('Priced samples')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {scatterRows.map((row) => (
                                            <tr key={row.id}>
                                                <td className="p-2">
                                                    {row.name} · {row.variant}
                                                </td>
                                                <td className="p-2">
                                                    {row.quality.toFixed(2)}
                                                </td>
                                                <td className="p-2">{row.n}</td>
                                                <td className="p-2">
                                                    {formatUSD(row.cost)}
                                                </td>
                                                <td className="p-2">
                                                    {row.priced}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
            <div className="grid gap-6 lg:grid-cols-2 min-w-0">
                <Card className="min-w-0">
                    <CardHeader>
                        <CardTitle className="text-base">
                            {t('AI dimensions and human stars')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!hasStars ? (
                            insufficient
                        ) : (
                            <div className="h-72 min-w-0" aria-hidden="true">
                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                    minWidth={0}
                                >
                                    <BarChart data={qualityRows}>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="var(--border)"
                                        />
                                        <XAxis
                                            dataKey="name"
                                            fontSize={10}
                                            tickFormatter={(value: string) =>
                                                value.length > 20
                                                    ? value.slice(0, 17) + '…'
                                                    : value
                                            }
                                        />
                                        <YAxis
                                            tickFormatter={formatStatNumber}
                                            domain={[1, 5]}
                                        />
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                const row = payload?.[0]
                                                    ?.payload as
                                                    | (typeof qualityRows)[number]
                                                    | undefined
                                                return active && row ? (
                                                    <div className="rounded-lg border bg-background p-3 text-xs">
                                                        <p>{row.name}</p>
                                                        <p>
                                                            {t('AI samples')}:{' '}
                                                            {row.aiN} ·{' '}
                                                            {t('Human samples')}
                                                            : {row.humanN}
                                                        </p>
                                                        <p>
                                                            {t(
                                                                'Estimated TPS samples'
                                                            )}
                                                            : {row.estimated}/
                                                            {row.speedN}
                                                        </p>
                                                        {payload?.map(
                                                            (entry) => (
                                                                <p
                                                                    key={String(
                                                                        entry.dataKey
                                                                    )}
                                                                >
                                                                    {entry.name}
                                                                    :{' '}
                                                                    {Number(
                                                                        entry.value
                                                                    ).toFixed(
                                                                        2
                                                                    )}
                                                                </p>
                                                            )
                                                        )}
                                                    </div>
                                                ) : null
                                            }}
                                        />
                                        <Legend />
                                        <Bar
                                            dataKey="accuracy"
                                            name={t('Accuracy')}
                                            fill="var(--primary)"
                                            isAnimationActive={false}
                                        />
                                        <Bar
                                            dataKey="instruction"
                                            name={t('Instruction following')}
                                            fill="var(--info)"
                                            isAnimationActive={false}
                                        />
                                        <Bar
                                            dataKey="completeness"
                                            name={t('Completeness')}
                                            fill="var(--success)"
                                            isAnimationActive={false}
                                        />
                                        <Bar
                                            dataKey="human"
                                            name={t('Human stars')}
                                            fill="var(--warning)"
                                            isAnimationActive={false}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-3">
                            {t(
                                'The metric table below contains the same quality values and sample counts. Signals are not combined into a capability score.'
                            )}
                        </p>
                    </CardContent>
                </Card>
                <Card className="min-w-0">
                    <CardHeader>
                        <CardTitle className="text-base">
                            {t('Rule pass rate')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!hasRules ? (
                            insufficient
                        ) : (
                            <div className="h-72 min-w-0" aria-hidden="true">
                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                    minWidth={0}
                                >
                                    <BarChart data={qualityRows}>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="var(--border)"
                                        />
                                        <XAxis
                                            dataKey="name"
                                            fontSize={10}
                                            tickFormatter={(value: string) =>
                                                value.length > 20
                                                    ? value.slice(0, 17) + '…'
                                                    : value
                                            }
                                        />
                                        <YAxis
                                            tickFormatter={formatStatNumber}
                                            domain={[0, 100]}
                                            unit="%"
                                        />
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                const row = payload?.[0]
                                                    ?.payload as
                                                    | (typeof qualityRows)[number]
                                                    | undefined
                                                return active && row ? (
                                                    <div className="rounded-lg border bg-background p-3 text-xs space-y-1">
                                                        <p>{row.name}</p>
                                                        <p>
                                                            {t(
                                                                'Rule pass rate'
                                                            )}
                                                            :{' '}
                                                            {row.rule?.toFixed(
                                                                1
                                                            )}
                                                            % · n={row.ruleN}
                                                        </p>
                                                        <p>
                                                            {t(
                                                                'Estimated TPS samples'
                                                            )}
                                                            : {row.estimated}/
                                                            {row.speedN}
                                                        </p>
                                                    </div>
                                                ) : null
                                            }}
                                        />
                                        <Bar
                                            dataKey="rule"
                                            name={t('Rule pass rate')}
                                            fill="var(--primary)"
                                            isAnimationActive={false}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-3">
                            {t(
                                'Only evaluated completed text answers enter the rule denominator.'
                            )}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
