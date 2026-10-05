import { useMemo } from 'react'
import { Link } from 'react-router'
import { useI18n } from '@/lib/i18n'
import type { ExperimentRun } from '@/lib/types'
import {
    aggregateExperimentStatistics,
    compareExperiments,
    type ExperimentModelStat,
    type ComparisonMetric
} from '@/features/experiments/domain/statistics'
import { resultStatus } from '../domain/statistics'
import { formatStatCost as formatUSD } from '../display'
import { ExperimentCharts } from './ExperimentCharts'

const measured = (value: number, n: number, digits = 2) =>
    n && Number.isFinite(value) ? `${value.toFixed(digits)} (n=${n})` : '—'

const metricColumns: Array<{
    label: string
    value: (stat: ExperimentModelStat) => string
}> = [
    {
        label: 'Model / parameter group',
        value: (s) => `${s.name} · ${s.variantName} · ${s.provider}`
    },
    {
        label: 'Completed / executed',
        value: (s) => `${s.completedCount}/${s.totalCount}`
    },
    {
        label: 'Mean TTFT (ms)',
        value: (s) => measured(s.avgTTFT, s.latencySampleCount)
    },
    {
        label: 'Median / P95 TTFT (ms)',
        value: (s) =>
            s.latencySampleCount
                ? `${s.medianTTFT.toFixed(2)} / ${s.p95TTFT.toFixed(2)} (n=${s.latencySampleCount})`
                : '—'
    },
    {
        label: 'Mean duration (ms)',
        value: (s) => measured(s.avgDuration, s.durationSampleCount)
    },
    {
        label: 'Median / P95 duration (ms)',
        value: (s) =>
            s.durationSampleCount
                ? `${s.medianDuration.toFixed(2)} / ${s.p95Duration.toFixed(2)} (n=${s.durationSampleCount})`
                : '—'
    },
    {
        label: 'Mixed TPS',
        value: (s) => measured(s.avgTPS, s.speedSampleCount)
    },
    {
        label: 'API TPS',
        value: (s) => measured(s.apiAvgTPS, s.apiSpeedSampleCount)
    },
    {
        label: 'Estimated TPS',
        value: (s) => measured(s.estimatedAvgTPS, s.estimatedSpeedSampleCount)
    },
    {
        label: 'Unknown-source TPS samples',
        value: (s) => String(s.unknownSpeedSampleCount)
    },
    {
        label: 'Input / output tokens',
        value: (s) => `${s.inputTokens} / ${s.outputTokens}`
    },
    {
        label: 'Known generation cost (USD)',
        value: (s) =>
            `${formatUSD(s.costSampleCount ? s.totalCost : undefined)} (n=${s.costSampleCount})`
    },
    {
        label: 'Human stars',
        value: (s) => measured(s.humanAvgRating, s.humanRatingCount)
    },
    {
        label: 'Rule pass rate',
        value: (s) =>
            s.ruleEvaluatedCount
                ? `${s.rulePassRate.toFixed(1)}% (${s.rulePassedCount}/${s.ruleEvaluatedCount})`
                : '—'
    },
    {
        label: 'AI accuracy',
        value: (s) => measured(s.aiAccuracyMean, s.aiRatingCount)
    },
    {
        label: 'AI instruction following',
        value: (s) => measured(s.aiInstructionFollowingMean, s.aiRatingCount)
    },
    {
        label: 'AI completeness',
        value: (s) => measured(s.aiCompletenessMean, s.aiRatingCount)
    }
]

const comparisonMetrics: Array<[ComparisonMetric, string]> = [
    ['avgTTFT', 'Mean TTFT (ms)'],
    ['p95TTFT', 'P95 TTFT (ms)'],
    ['avgDuration', 'Mean duration (ms)'],
    ['avgTPS', 'Mixed TPS'],
    ['totalCost', 'Known generation cost (USD)'],
    ['rulePassRate', 'Rule pass rate'],
    ['aiAccuracyMean', 'AI accuracy'],
    ['aiInstructionFollowingMean', 'AI instruction following'],
    ['aiCompletenessMean', 'AI completeness']
]

const comparisonReason = {
    'missing-variant': 'Choose one parameter group on each side to compare.',
    'different-test-set':
        'Different test sets: results are shown side by side, without improvement claims.',
    'ambiguous-model-identity':
        'Ambiguous model identity: duplicate model identities cannot be aligned.',
    'no-matching-models':
        'No matching model identities and endpoints. Results cannot be directly compared.'
}

function comparisonValue(value: number | undefined, field: ComparisonMetric) {
    if (value === undefined || !Number.isFinite(value)) return '—'
    return field === 'totalCost'
        ? formatUSD(value)
        : `${value.toFixed(2)}${field === 'rulePassRate' ? '%' : ''}`
}

export function ExperimentReport({
    run,
    variantId,
    baseline
}: {
    run: ExperimentRun
    variantId?: string
    baseline?: { run: ExperimentRun; variantId: string }
}) {
    const t = useI18n()
    const stats = useMemo(
        () => aggregateExperimentStatistics(run, variantId),
        [run, variantId]
    )
    const completedResults = useMemo(
        () =>
            run.tasks
                .filter((task) => !variantId || task.variantId === variantId)
                .flatMap((task) => {
                    const result = task.attempts.at(-1)
                    return result &&
                        resultStatus(result) === 'completed' &&
                        !result.error
                        ? [
                              {
                                  result,
                                  variantName:
                                      run.variants.find(
                                          (variant) =>
                                              variant.id === task.variantId
                                      )?.name ?? task.variantId
                              }
                          ]
                        : []
                }),
        [run, variantId]
    )
    const comparison = useMemo(
        () =>
            baseline
                ? compareExperiments(baseline.run, run, {
                      baselineVariantId: baseline.variantId,
                      targetVariantId: variantId ?? ''
                  })
                : undefined,
        [run, variantId, baseline]
    )
    const baselineStats = useMemo(
        () =>
            baseline &&
            baseline.run.variants.some(
                (variant) => variant.id === baseline.variantId
            )
                ? aggregateExperimentStatistics(
                      baseline.run,
                      baseline.variantId
                  )
                : undefined,
        [baseline]
    )
    const counts = [
        ['Planned tasks (entire run)', stats.plannedTaskCount],
        ['Selected tasks', stats.selectedTaskCount],
        ['Executed tasks', stats.executedTaskCount],
        ['Recorded attempts', stats.recordedAttemptCount],
        ['Historical failed attempts', stats.failedAttemptCount],
        ['Retried tasks', stats.retriedTaskCount]
    ] as const

    return (
        <div className="space-y-6 pb-8 min-w-0 max-w-full">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-lg font-semibold break-words">
                        {run.name}
                    </h2>
                    <p className="text-xs text-muted-foreground break-words">
                        {t(run.status)} ·{' '}
                        {new Date(run.createdAt).toLocaleString()} ·{' '}
                        {t('Frozen configuration')}
                    </p>
                </div>
                <Link
                    className="min-h-11 inline-flex items-center text-sm underline underline-offset-4"
                    to={`/experiments/${encodeURIComponent(run.id)}`}
                >
                    {t('View experiment')}
                </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {counts.map(([label, count]) => (
                    <div className="rounded-xl border p-3" key={label}>
                        <p className="text-xs text-muted-foreground">
                            {t(label)}
                        </p>
                        <p className="text-2xl font-semibold tabular-nums">
                            {count}
                        </p>
                    </div>
                ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">
                        {t('Success rate')}
                    </p>
                    <p className="text-xl font-semibold tabular-nums">
                        {stats.completedCount +
                        stats.errorCount +
                        stats.cancelledCount
                            ? `${stats.successRate.toFixed(1)}%`
                            : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {t(
                            '{completed} completed · {failed} failed · {cancelled} cancelled',
                            {
                                completed: stats.completedCount,
                                failed: stats.errorCount,
                                cancelled: stats.cancelledCount
                            }
                        )}
                    </p>
                </div>
                <div className="rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">
                        {t('Known generation cost (latest attempts)')}
                    </p>
                    <p className="text-xl font-semibold tabular-nums">
                        {formatUSD(
                            stats.costSampleCount ? stats.totalCost : undefined
                        )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        n={stats.costSampleCount} · {t('Input / output tokens')}
                        :{' '}
                        {stats.modelStats.reduce(
                            (sum, stat) => sum + stat.inputTokens,
                            0
                        )}{' '}
                        /{' '}
                        {stats.modelStats.reduce(
                            (sum, stat) => sum + stat.outputTokens,
                            0
                        )}
                    </p>
                </div>
                <div className="rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">
                        {t('Known cost (all attempts)')}
                    </p>
                    <p className="text-xl font-semibold tabular-nums">
                        {formatUSD(stats.knownAllAttemptCost)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        n={stats.knownAllAttemptCostSampleCount} /{' '}
                        {stats.recordedAttemptCount}
                    </p>
                </div>
                <div className="rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">
                        {t('Retained judging cost')}
                    </p>
                    <p className="text-xl font-semibold tabular-nums">
                        {formatUSD(stats.knownJudgeCost)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {t('{count} distinct priced judge calls', {
                            count: stats.knownJudgeCostSampleCount
                        })}
                    </p>
                </div>
            </div>
            <p className="text-xs text-muted-foreground">
                {t(
                    'Primary metrics use only the latest attempt of each trial. Failed and cancelled attempts do not enter performance or quality averages. Unknown cost is not zero; retained judging cost is not a lifetime bill.'
                )}
            </p>
            <ExperimentCharts
                modelStats={stats.modelStats}
                results={completedResults}
            />
            <section className="space-y-3 min-w-0">
                <h3 className="font-semibold">
                    {t('Experiment metric comparison')}
                </h3>
                <p className="text-xs text-muted-foreground">
                    {t(
                        'Mixed TPS includes API, estimated and unknown-source samples. Quality signals retain separate denominators; missing samples are shown as unknown.'
                    )}
                </p>
                <div
                    className="overflow-x-auto rounded-xl border"
                    tabIndex={0}
                    role="region"
                    aria-label={t('Experiment metric comparison')}
                >
                    <table className="w-full text-xs text-left whitespace-nowrap tabular-nums">
                        <thead className="bg-muted/50">
                            <tr>
                                {metricColumns.map((column) => (
                                    <th
                                        key={column.label}
                                        className="p-3 font-medium"
                                    >
                                        {t(column.label)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {stats.modelStats.map((stat) => (
                                <tr
                                    key={JSON.stringify([
                                        stat.id,
                                        stat.variantId
                                    ])}
                                    className="border-t"
                                >
                                    {metricColumns.map((column) => (
                                        <td key={column.label} className="p-3">
                                            {column.value(stat)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!stats.modelStats.length && (
                        <p className="p-4 text-sm text-muted-foreground">
                            {t('No executed tasks in this selection.')}
                        </p>
                    )}
                </div>
            </section>
            <section className="space-y-3 min-w-0">
                <h3 className="font-semibold">
                    {t('Repeated-trial stability')}
                </h3>
                <p className="text-xs text-muted-foreground">
                    {t(
                        'Each row is one case, model and parameter group across repetitions. Standard deviation uses n−1 and is unknown for n<2. TPS stability uses API measurements only, not estimates or cross-question variation.'
                    )}
                </p>
                <div
                    className="overflow-x-auto rounded-xl border"
                    tabIndex={0}
                    role="region"
                    aria-label={t('Repeated-trial stability')}
                >
                    <table className="w-full text-xs text-left whitespace-nowrap tabular-nums">
                        <thead className="bg-muted/50">
                            <tr>
                                {[
                                    'Case / model / parameter group',
                                    'Metric',
                                    'Samples',
                                    'Mean',
                                    'Sample standard deviation'
                                ].map((label) => (
                                    <th key={label} className="p-3">
                                        {t(label)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {stats.trialStats.flatMap((trial) =>
                                (['ttft', 'tps', 'totalDuration'] as const).map(
                                    (field) => (
                                        <tr
                                            key={JSON.stringify([
                                                trial.caseId,
                                                trial.modelId,
                                                trial.variantId,
                                                field
                                            ])}
                                            className="border-t"
                                        >
                                            <td className="p-3">
                                                {trial.caseId} ·{' '}
                                                {run.models.find(
                                                    (model) =>
                                                        model.id ===
                                                        trial.modelId
                                                )?.name ?? trial.modelId}{' '}
                                                ·{' '}
                                                {run.variants.find(
                                                    (variant) =>
                                                        variant.id ===
                                                        trial.variantId
                                                )?.name ?? trial.variantId}
                                            </td>
                                            <td className="p-3">
                                                {field === 'tps'
                                                    ? 'TPS (API)'
                                                    : field === 'ttft'
                                                      ? 'TTFT (ms)'
                                                      : t('Duration (ms)')}
                                            </td>
                                            <td className="p-3">
                                                {trial[field].sampleCount}
                                            </td>
                                            <td className="p-3">
                                                {trial[field].mean?.toFixed(
                                                    2
                                                ) ?? '—'}
                                            </td>
                                            <td className="p-3">
                                                {trial[
                                                    field
                                                ].sampleStdDev?.toFixed(2) ??
                                                    '—'}
                                            </td>
                                        </tr>
                                    )
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
            {comparison && (
                <section className="space-y-3 min-w-0">
                    <h3 className="font-semibold">
                        {t('Explicit baseline comparison')}
                    </h3>
                    <p className="text-sm">
                        {t('Baseline')}: {baseline?.run.name} · {t('Target')}:{' '}
                        {run.name}
                    </p>
                    {!comparison.compatible && (
                        <p
                            role="status"
                            className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm"
                        >
                            {t(
                                comparisonReason[
                                    comparison.reason ?? 'missing-variant'
                                ]
                            )}
                        </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        {t(
                            'Differences are target minus baseline. Relative differences require a positive baseline. Repetition, concurrency and parameter changes are reported, not normalized or interpreted as causal effects.'
                        )}
                    </p>
                    {comparison.models.length > 0 && (
                        <div
                            className="overflow-x-auto rounded-xl border"
                            tabIndex={0}
                            role="region"
                            aria-label={t('Baseline metric differences')}
                        >
                            <table className="w-full text-xs text-left whitespace-nowrap tabular-nums">
                                <thead className="bg-muted/50">
                                    <tr>
                                        {[
                                            'Model',
                                            'Metric',
                                            'Baseline',
                                            'Target',
                                            'Absolute difference',
                                            'Relative difference'
                                        ].map((label) => (
                                            <th key={label} className="p-3">
                                                {t(label)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {comparison.models.flatMap((pair) =>
                                        comparisonMetrics.map(
                                            ([field, label]) => {
                                                const metric =
                                                    comparison.compatible
                                                        ? pair.metrics?.[field]
                                                        : undefined
                                                const countField =
                                                    field === 'avgTTFT' ||
                                                    field === 'p95TTFT'
                                                        ? 'latencySampleCount'
                                                        : field ===
                                                            'avgDuration'
                                                          ? 'durationSampleCount'
                                                          : field === 'avgTPS'
                                                            ? 'speedSampleCount'
                                                            : field ===
                                                                'totalCost'
                                                              ? 'costSampleCount'
                                                              : field ===
                                                                  'rulePassRate'
                                                                ? 'ruleEvaluatedCount'
                                                                : 'aiRatingCount'
                                                const base = pair.baseline?.[
                                                    countField
                                                ]
                                                    ? pair.baseline[field]
                                                    : undefined
                                                const target = pair.target?.[
                                                    countField
                                                ]
                                                    ? pair.target[field]
                                                    : undefined
                                                const delta = metric?.absolute
                                                return (
                                                    <tr
                                                        key={JSON.stringify([
                                                            pair.identity,
                                                            field
                                                        ])}
                                                        className="border-t"
                                                    >
                                                        <td className="p-3">
                                                            {pair.target
                                                                ?.name ??
                                                                pair.baseline
                                                                    ?.name}
                                                        </td>
                                                        <td className="p-3">
                                                            {t(label)}
                                                        </td>
                                                        <td className="p-3">
                                                            {comparisonValue(
                                                                base,
                                                                field
                                                            )}
                                                        </td>
                                                        <td className="p-3">
                                                            {comparisonValue(
                                                                target,
                                                                field
                                                            )}
                                                        </td>
                                                        <td className="p-3">
                                                            {delta === undefined
                                                                ? '—'
                                                                : field ===
                                                                    'totalCost'
                                                                  ? `${delta < 0 ? '−' : '+'}${formatUSD(Math.abs(delta))}`
                                                                  : `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`}
                                                        </td>
                                                        <td className="p-3">
                                                            {metric?.relative ===
                                                            undefined
                                                                ? '—'
                                                                : `${metric.relative >= 0 ? '+' : ''}${(metric.relative * 100).toFixed(1)}%`}
                                                        </td>
                                                    </tr>
                                                )
                                            }
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {!comparison.compatible && baselineStats && (
                        <div
                            className="overflow-x-auto rounded-xl border"
                            tabIndex={0}
                            role="region"
                            aria-label={t('Baseline side-by-side metrics')}
                        >
                            <table className="w-full text-xs text-left whitespace-nowrap tabular-nums">
                                <thead className="bg-muted/50">
                                    <tr>
                                        {metricColumns.map((column) => (
                                            <th
                                                key={column.label}
                                                className="p-3"
                                            >
                                                {t(column.label)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {baselineStats.modelStats.map((stat) => (
                                        <tr
                                            key={JSON.stringify([
                                                stat.id,
                                                stat.variantId
                                            ])}
                                            className="border-t"
                                        >
                                            {metricColumns.map((column) => (
                                                <td
                                                    key={column.label}
                                                    className="p-3"
                                                >
                                                    {column.value(stat)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <ul className="space-y-2 text-xs">
                        {comparison.differences.map((difference) => (
                            <li
                                key={difference.field}
                                className="rounded-lg border p-3 break-words"
                            >
                                <span className="font-medium">
                                    {difference.field}
                                </span>
                                : {JSON.stringify(difference.baseline) ?? '—'} →{' '}
                                {JSON.stringify(difference.target) ?? '—'}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
            <details className="rounded-xl border p-4">
                <summary className="font-semibold cursor-pointer min-h-11 flex items-center">
                    {t('Frozen experiment manifest')}
                </summary>
                <p className="text-xs text-muted-foreground my-3">
                    {t('Repetitions')}: {run.repetitions} · {t('Concurrency')}:{' '}
                    {run.maxConcurrent} · {t('Cases')}:{' '}
                    {run.testSet.cases.length}
                </p>
                <div className="space-y-3">
                    {run.models.flatMap((model) =>
                        run.variants
                            .filter(
                                (variant) =>
                                    !variantId || variant.id === variantId
                            )
                            .map((variant) => (
                                <details
                                    key={JSON.stringify([model.id, variant.id])}
                                    className="rounded-lg border p-3"
                                >
                                    <summary className="text-sm cursor-pointer min-h-11 flex items-center break-words">
                                        {model.name} · {variant.name} ·{' '}
                                        {model.providerName ?? model.provider}
                                    </summary>
                                    <p className="text-xs text-muted-foreground break-all my-2">
                                        {model.endpoint ??
                                            t('Endpoint unknown')}
                                    </p>
                                    <pre className="text-xs whitespace-pre-wrap break-all max-h-72 overflow-auto select-text">
                                        {JSON.stringify(
                                            run.configByModelVariant[
                                                model.id
                                            ]?.[variant.id],
                                            null,
                                            2
                                        )}
                                    </pre>
                                </details>
                            ))
                    )}
                </div>
            </details>
        </div>
    )
}
