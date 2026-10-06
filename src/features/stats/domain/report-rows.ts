import { providerLabel } from '@/lib/providers/catalog'
import type { ReportDocument, ReportRecord } from './report-types'
import {
    DASH,
    mdCost,
    mdEscapeCell,
    mdMetric,
    mdPercent,
    mdTable
} from './export-format'

export function filtersLine(document: ReportDocument): string {
    const entries = Object.entries(document.metadata.filters)
    if (!entries.length) return 'Filters: none'
    return `Filters: ${entries
        .map(([key, value]) => `${key}=${String(value)}`)
        .join(', ')}`
}

export function summaryRows(document: ReportDocument): string[][] {
    const summary = document.summary
    const rows: string[][] = [
        ['Requests', mdEscapeCell(String(summary.totalMessages))],
        ['Completed', mdEscapeCell(String(summary.completedCount))],
        ['Failed', mdEscapeCell(String(summary.errorCount))],
        ['Cancelled', mdEscapeCell(String(summary.cancelledCount))],
        ['Success rate', mdPercent(summary.successRate)],
        [
            'Successful tokens (API or estimate)',
            mdEscapeCell(String(summary.totalTokensAcrossModels))
        ],
        [
            'Avg global speed (tokens/s)',
            mdMetric(summary.avgGlobalTPS, summary.avgGlobalTPS > 0 ? 1 : 0)
        ],
        ['Known cost', mdCost(summary.totalCost, summary.costSampleCount)],
        [
            'Estimated-token requests',
            mdEscapeCell(String(summary.estimatedCount))
        ]
    ]
    if (document.metadata.source === 'arena')
        rows.splice(1, 0, [
            'Sessions',
            mdEscapeCell(String(summary.totalSessions))
        ])
    if (document.metadata.source === 'experiment') {
        rows.push(
            [
                'Planned tasks',
                mdEscapeCell(String(summary.plannedTaskCount ?? 0))
            ],
            [
                'Selected tasks',
                mdEscapeCell(String(summary.selectedTaskCount ?? 0))
            ],
            [
                'Executed tasks',
                mdEscapeCell(String(summary.executedTaskCount ?? 0))
            ],
            [
                'Recorded attempts',
                mdEscapeCell(String(summary.recordedAttemptCount ?? 0))
            ],
            [
                'Failed attempts',
                mdEscapeCell(String(summary.failedAttemptCount ?? 0))
            ],
            [
                'Retried tasks',
                mdEscapeCell(String(summary.retriedTaskCount ?? 0))
            ],
            [
                'Known all-attempt cost',
                mdCost(
                    summary.knownAllAttemptCost,
                    summary.knownAllAttemptCostSampleCount
                )
            ],
            [
                'Known judge cost',
                mdCost(
                    summary.knownJudgeCost,
                    summary.knownJudgeCostSampleCount
                )
            ]
        )
    }
    return rows
}

export function modelComparisonRows(document: ReportDocument): string {
    const rows = document.modelComparison.map((stat) => [
        mdEscapeCell(stat.name),
        mdEscapeCell('variantId' in stat ? String(stat.variantId) : DASH),
        mdEscapeCell(stat.provider),
        mdEscapeCell(stat.mode),
        mdEscapeCell(String(stat.totalCount)),
        mdEscapeCell(String(stat.completedCount)),
        mdEscapeCell(String(stat.errorCount)),
        mdEscapeCell(String(stat.cancelledCount)),
        mdPercent(stat.successRate),
        mdMetric(stat.avgTPS, stat.speedSampleCount),
        mdMetric(stat.avgTTFT, stat.latencySampleCount),
        mdMetric(stat.p95TTFT, stat.latencySampleCount),
        mdMetric(stat.avgDuration, stat.durationSampleCount),
        mdCost(stat.totalCost, stat.costSampleCount),
        mdMetric(
            stat.rulePassRate,
            stat.ruleEvaluatedCount,
            (value) => `${value.toFixed(1)}%`
        ),
        mdMetric(stat.aiAccuracyMean, stat.aiRatingCount),
        mdMetric(stat.aiInstructionFollowingMean, stat.aiRatingCount),
        mdMetric(stat.aiCompletenessMean, stat.aiRatingCount),
        mdMetric(stat.humanAvgRating, stat.humanRatingCount)
    ])
    return mdTable(
        [
            'Model',
            'Variant',
            'Provider',
            'Mode',
            'Requests',
            'Completed',
            'Failed',
            'Cancelled',
            'Success rate',
            'Avg TPS',
            'Avg TTFT (ms)',
            'P95 TTFT (ms)',
            'Avg duration (ms)',
            'Known cost',
            'Rule pass rate',
            'AI accuracy',
            'AI instr. following',
            'AI completeness',
            'Human rating'
        ],
        rows
    )
}

export function frozenConfigRows(document: ReportDocument): string[] {
    const manifest = document.experiment
    if (!manifest) return []
    const parts: string[] = [
        '## Frozen experiment configuration',
        '',
        `- Repetitions: ${manifest.repetitions}`,
        `- Max concurrency: ${manifest.maxConcurrent}`,
        `- Status: ${manifest.status}`,
        `- Created: ${new Date(manifest.createdAt).toISOString()}`,
        '',
        '### Parameter variants',
        '',
        mdTable(
            ['Variant', 'Name', 'Overrides'],
            manifest.variants.map((variant) => [
                mdEscapeCell(variant.id),
                mdEscapeCell(variant.name),
                mdEscapeCell(JSON.stringify(variant.overrides))
            ])
        ),
        '',
        '### Effective request configuration (model × variant)',
        ''
    ]
    const configRows: string[][] = []
    for (const [modelId, byVariant] of Object.entries(
        manifest.configByModelVariant
    )) {
        for (const [variantId, config] of Object.entries(byVariant)) {
            configRows.push([
                mdEscapeCell(modelId),
                mdEscapeCell(variantId),
                mdEscapeCell(JSON.stringify(config))
            ])
        }
    }
    if (configRows.length)
        parts.push(mdTable(['Model', 'Variant', 'Config'], configRows))
    else parts.push('_No frozen configuration recorded._')
    if (manifest.models.length) {
        parts.push(
            '',
            '### Frozen model identities',
            '',
            mdTable(
                ['Model', 'Provider', 'Mode', 'Endpoint', 'Fingerprint'],
                manifest.models.map((model) => [
                    mdEscapeCell(model.name),
                    mdEscapeCell(providerLabel(model)),
                    mdEscapeCell(model.mode),
                    mdEscapeCell(model.endpoint ?? DASH),
                    mdEscapeCell(model.endpointFingerprint)
                ])
            )
        )
    }
    if (manifest.cases.length) {
        parts.push(
            '',
            '### Frozen cases',
            '',
            mdTable(
                ['Case', 'Evaluation', 'Expected'],
                manifest.cases.map((kase) => [
                    mdEscapeCell(kase.id),
                    mdEscapeCell(kase.evaluation?.type ?? DASH),
                    kase.expected === undefined
                        ? DASH
                        : mdEscapeCell(kase.expected)
                ])
            )
        )
    }
    return parts
}

export function baselineRows(document: ReportDocument): string[] {
    const comparison = document.baselineComparison
    if (!comparison) return []
    const parts: string[] = [
        '## Baseline comparison',
        '',
        comparison.compatible
            ? 'Compatible: yes'
            : `Compatible: no (${comparison.reason ?? 'unknown reason'})`,
        ''
    ]
    if (comparison.differences.length) {
        parts.push(
            '### Run differences',
            '',
            mdTable(
                ['Field', 'Baseline', 'Target'],
                comparison.differences.map((difference) => [
                    mdEscapeCell(difference.field),
                    mdEscapeCell(JSON.stringify(difference.baseline) ?? ''),
                    mdEscapeCell(JSON.stringify(difference.target) ?? '')
                ])
            ),
            ''
        )
    }
    const metricRows: string[][] = []
    for (const model of comparison.models) {
        for (const [metric, values] of Object.entries(model.metrics ?? {})) {
            metricRows.push([
                mdEscapeCell(model.identity),
                mdEscapeCell(metric),
                values.baseline === undefined
                    ? DASH
                    : mdEscapeCell(String(values.baseline)),
                values.target === undefined
                    ? DASH
                    : mdEscapeCell(String(values.target)),
                values.absolute === undefined
                    ? DASH
                    : mdEscapeCell(String(values.absolute)),
                values.relative === undefined
                    ? DASH
                    : mdPercent(values.relative * 100)
            ])
        }
    }
    if (metricRows.length)
        parts.push(
            '### Model metrics (target − baseline)',
            '',
            mdTable(
                [
                    'Identity',
                    'Metric',
                    'Baseline',
                    'Target',
                    'Absolute',
                    'Relative'
                ],
                metricRows
            )
        )
    return parts
}

export function trialRows(document: ReportDocument): string[] {
    if (!document.trialStats?.length) return []
    return [
        '## Repeat stability (case × model × variant)',
        '',
        mdTable(
            [
                'Case',
                'Model',
                'Variant',
                'TTFT n',
                'TTFT mean',
                'TTFT σ',
                'TPS n',
                'TPS mean',
                'TPS σ',
                'Duration n',
                'Duration mean',
                'Duration σ'
            ],
            document.trialStats.map((trial) => [
                mdEscapeCell(trial.caseId),
                mdEscapeCell(trial.modelId),
                mdEscapeCell(trial.variantId),
                String(trial.ttft.sampleCount),
                mdMetric(trial.ttft.mean, trial.ttft.sampleCount),
                mdMetric(trial.ttft.sampleStdDev, trial.ttft.sampleCount),
                String(trial.tps.sampleCount),
                mdMetric(trial.tps.mean, trial.tps.sampleCount),
                mdMetric(trial.tps.sampleStdDev, trial.tps.sampleCount),
                String(trial.totalDuration.sampleCount),
                mdMetric(
                    trial.totalDuration.mean,
                    trial.totalDuration.sampleCount
                ),
                mdMetric(
                    trial.totalDuration.sampleStdDev,
                    trial.totalDuration.sampleCount
                )
            ])
        )
    ]
}

/** Use the captured snapshot or frozen experiment manifest; otherwise unknown. */
export function provenanceFacts(
    document: ReportDocument,
    record: ReportRecord
): string[] {
    const snapshot = record.requestSnapshot
    if (snapshot) {
        const sources = Object.entries(snapshot.parameters.sources)
        const sourceText = sources.length
            ? sources.map(([path, origin]) => `${path}=${origin}`).join(', ')
            : 'defaults'
        const excluded = snapshot.parameters.excludedParameters
        return [
            `Request parameters: captured ${new Date(snapshot.capturedAt).toISOString()} (${snapshot.context})`,
            `Parameter sources: ${sourceText}`,
            excluded.length
                ? `Excluded by model capabilities: ${excluded.join(', ')}`
                : 'Excluded by model capabilities: none'
        ]
    }
    const manifest = document.experiment
    const parameters =
        record.source === 'experiment' && manifest && record.variantId
            ? manifest.configByModelVariant[record.modelId]?.[record.variantId]
            : undefined
    if (manifest && parameters) {
        const sources = Object.entries(parameters.sources)
        const sourceText = sources.length
            ? sources.map(([path, origin]) => `${path}=${origin}`).join(', ')
            : 'defaults'
        const excluded = parameters.excludedParameters
        return [
            `Request parameters: frozen at experiment creation ${new Date(manifest.createdAt).toISOString()} (independent, linked via manifest)`,
            `Parameter sources: ${sourceText}`,
            excluded.length
                ? `Excluded by model capabilities: ${excluded.join(', ')}`
                : 'Excluded by model capabilities: none'
        ]
    }
    return [
        'Request parameters: unknown (no snapshot recorded for this result)'
    ]
}
