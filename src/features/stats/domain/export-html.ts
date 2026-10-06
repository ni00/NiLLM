import { providerLabel } from '@/lib/providers/catalog'
import type { ReportDocument, ReportRecord } from './report-types'
import { DASH, escapeBase } from './export-format'
import { filtersLine, provenanceFacts, summaryRows } from './report-rows'
import { formatUSD } from './export-csv'

function escapeHtml(value: string): string {
    return escapeBase(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

const HTML_STYLES = `
    :root { color-scheme: light dark; }
    body { font-family: system-ui, sans-serif; margin: 2rem auto; max-width: 72rem;
           padding: 0 1rem; line-height: 1.45; }
    table { border-collapse: collapse; margin: 0.75rem 0; width: 100%;
            font-variant-numeric: tabular-nums; }
    th, td { border: 1px solid color-mix(in oklab, currentColor 25%, transparent);
             padding: 0.3rem 0.5rem; text-align: left; vertical-align: top;
             font-size: 0.85rem; }
    th { background: color-mix(in oklab, currentColor 8%, transparent); }
    pre { background: color-mix(in oklab, currentColor 6%, transparent);
          padding: 0.6rem; overflow-x: auto; font-size: 0.8rem; }
    .meta { color: inherit; opacity: 0.75; font-size: 0.9rem; }
    section { margin: 1.5rem 0; }
    @media print {
        body { margin: 0; max-width: none; font-size: 10.5pt; }
        section { break-inside: avoid-page; }
        pre { white-space: pre-wrap; }
    }
`

function htmlTable(headers: string[], rows: string[][]): string {
    return [
        '<table>',
        '<thead>',
        `<tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr>`,
        '</thead>',
        '<tbody>',
        ...rows.map(
            (row) =>
                `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`
        ),
        '</tbody>',
        '</table>'
    ].join('\n')
}

function htmlMetric(
    value: number | undefined,
    samples: number | undefined,
    format: (value: number) => string = String
): string {
    if (!samples || value === undefined) return escapeHtml(DASH)
    return escapeHtml(format(value))
}

function htmlCost(cost: number | undefined, samples: number | undefined) {
    if (!samples || cost === undefined) return escapeHtml(DASH)
    return escapeHtml(`${formatUSD(cost)} (${cost} USD)`)
}

function htmlPercent(value: number | undefined, samples?: number) {
    return htmlMetric(
        value,
        samples ?? (value === undefined ? 0 : 1),
        (v) => `${v.toFixed(1)}%`
    )
}

function htmlSection(title: string, body: string): string {
    return `<section>\n<h2>${escapeHtml(title)}</h2>\n${body}\n</section>`
}

function htmlSummary(document: ReportDocument): string {
    const rows = summaryRows(document).map(([metric, value]) => [
        escapeHtml(metric),
        value
    ])
    return htmlTable(['Metric', 'Value'], rows)
}

function htmlModelComparison(document: ReportDocument): string {
    if (!document.modelComparison.length)
        return `<p>${escapeHtml('No models with recorded results.')}</p>`
    return htmlTable(
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
        document.modelComparison.map((stat) => [
            escapeHtml(stat.name),
            escapeHtml('variantId' in stat ? String(stat.variantId) : DASH),
            escapeHtml(stat.provider),
            escapeHtml(stat.mode),
            escapeHtml(String(stat.totalCount)),
            escapeHtml(String(stat.completedCount)),
            escapeHtml(String(stat.errorCount)),
            escapeHtml(String(stat.cancelledCount)),
            htmlPercent(stat.successRate),
            htmlMetric(stat.avgTPS, stat.speedSampleCount),
            htmlMetric(stat.avgTTFT, stat.latencySampleCount),
            htmlMetric(stat.p95TTFT, stat.latencySampleCount),
            htmlMetric(stat.avgDuration, stat.durationSampleCount),
            htmlCost(stat.totalCost, stat.costSampleCount),
            htmlMetric(
                stat.rulePassRate,
                stat.ruleEvaluatedCount,
                (value) => `${value.toFixed(1)}%`
            ),
            htmlMetric(stat.aiAccuracyMean, stat.aiRatingCount),
            htmlMetric(stat.aiInstructionFollowingMean, stat.aiRatingCount),
            htmlMetric(stat.aiCompletenessMean, stat.aiRatingCount),
            htmlMetric(stat.humanAvgRating, stat.humanRatingCount)
        ])
    )
}

function htmlFrozenConfig(document: ReportDocument): string[] {
    const manifest = document.experiment
    if (!manifest) return []
    const parts: string[] = []
    const facts = [
        `Repetitions: ${manifest.repetitions}`,
        `Max concurrency: ${manifest.maxConcurrent}`,
        `Status: ${manifest.status}`,
        `Created: ${new Date(manifest.createdAt).toISOString()}`
    ]
    parts.push(
        htmlSection(
            'Frozen experiment configuration',
            `<ul>${facts
                .map((fact) => `<li>${escapeHtml(fact)}</li>`)
                .join('')}</ul>`
        )
    )
    if (manifest.variants.length)
        parts.push(
            htmlSection(
                'Parameter variants',
                htmlTable(
                    ['Variant', 'Name', 'Overrides'],
                    manifest.variants.map((variant) => [
                        escapeHtml(variant.id),
                        escapeHtml(variant.name),
                        `<pre>${escapeHtml(JSON.stringify(variant.overrides))}</pre>`
                    ])
                )
            )
        )
    const configRows: string[][] = []
    for (const [modelId, byVariant] of Object.entries(
        manifest.configByModelVariant
    )) {
        for (const [variantId, config] of Object.entries(byVariant)) {
            configRows.push([
                escapeHtml(modelId),
                escapeHtml(variantId),
                `<pre>${escapeHtml(JSON.stringify(config))}</pre>`
            ])
        }
    }
    if (configRows.length)
        parts.push(
            htmlSection(
                'Effective request configuration (model × variant)',
                htmlTable(['Model', 'Variant', 'Config'], configRows)
            )
        )
    if (manifest.models.length)
        parts.push(
            htmlSection(
                'Frozen model identities',
                htmlTable(
                    ['Model', 'Provider', 'Mode', 'Endpoint', 'Fingerprint'],
                    manifest.models.map((model) => [
                        escapeHtml(model.name),
                        escapeHtml(providerLabel(model)),
                        escapeHtml(model.mode),
                        escapeHtml(model.endpoint ?? DASH),
                        `<code>${escapeHtml(model.endpointFingerprint)}</code>`
                    ])
                )
            )
        )
    if (manifest.cases.length)
        parts.push(
            htmlSection(
                'Frozen cases',
                htmlTable(
                    ['Case', 'Evaluation', 'Prompt', 'Expected'],
                    manifest.cases.map((kase) => [
                        escapeHtml(kase.id),
                        escapeHtml(kase.evaluation?.type ?? DASH),
                        kase.prompt === undefined
                            ? escapeHtml(DASH)
                            : `<pre>${escapeHtml(kase.prompt)}</pre>`,
                        kase.expected === undefined
                            ? escapeHtml(DASH)
                            : `<pre>${escapeHtml(kase.expected)}</pre>`
                    ])
                )
            )
        )
    return parts
}

function htmlBaseline(document: ReportDocument): string[] {
    const comparison = document.baselineComparison
    if (!comparison) return []
    const status = comparison.compatible
        ? 'Compatible: yes'
        : `Compatible: no (${comparison.reason ?? 'unknown reason'})`
    const parts: string[] = []
    const body: string[] = [`<p>${escapeHtml(status)}</p>`]
    if (comparison.differences.length)
        body.push(
            htmlTable(
                ['Field', 'Baseline', 'Target'],
                comparison.differences.map((difference) => [
                    escapeHtml(difference.field),
                    `<pre>${escapeHtml(JSON.stringify(difference.baseline) ?? '')}</pre>`,
                    `<pre>${escapeHtml(JSON.stringify(difference.target) ?? '')}</pre>`
                ])
            )
        )
    const metricRows: string[][] = []
    for (const model of comparison.models) {
        for (const [metric, values] of Object.entries(model.metrics ?? {})) {
            metricRows.push([
                `<code>${escapeHtml(model.identity)}</code>`,
                escapeHtml(metric),
                values.baseline === undefined
                    ? escapeHtml(DASH)
                    : escapeHtml(String(values.baseline)),
                values.target === undefined
                    ? escapeHtml(DASH)
                    : escapeHtml(String(values.target)),
                values.absolute === undefined
                    ? escapeHtml(DASH)
                    : escapeHtml(String(values.absolute)),
                values.relative === undefined
                    ? escapeHtml(DASH)
                    : htmlPercent(values.relative * 100)
            ])
        }
    }
    if (metricRows.length)
        body.push(
            htmlTable(
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
    parts.push(htmlSection('Baseline comparison', body.join('\n')))
    return parts
}

function htmlTrials(document: ReportDocument): string[] {
    if (!document.trialStats?.length) return []
    return [
        htmlSection(
            'Repeat stability (case × model × variant)',
            htmlTable(
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
                    escapeHtml(trial.caseId),
                    escapeHtml(trial.modelId),
                    escapeHtml(trial.variantId),
                    escapeHtml(String(trial.ttft.sampleCount)),
                    htmlMetric(trial.ttft.mean, trial.ttft.sampleCount),
                    htmlMetric(trial.ttft.sampleStdDev, trial.ttft.sampleCount),
                    escapeHtml(String(trial.tps.sampleCount)),
                    htmlMetric(trial.tps.mean, trial.tps.sampleCount),
                    htmlMetric(trial.tps.sampleStdDev, trial.tps.sampleCount),
                    escapeHtml(String(trial.totalDuration.sampleCount)),
                    htmlMetric(
                        trial.totalDuration.mean,
                        trial.totalDuration.sampleCount
                    ),
                    htmlMetric(
                        trial.totalDuration.sampleStdDev,
                        trial.totalDuration.sampleCount
                    )
                ])
            )
        )
    ]
}

function provenanceList(
    document: ReportDocument,
    record: ReportRecord
): string {
    return provenanceFacts(document, record)
        .map((fact) => `<li>${escapeHtml(fact)}</li>`)
        .join('')
}

function htmlRecords(document: ReportDocument): string {
    if (!document.records.length) return `<p>${escapeHtml('No records.')}</p>`
    const table = htmlTable(
        [
            'Source',
            'Result',
            'Model',
            'Variant',
            'Attempt',
            'Status',
            'Summary',
            'TTFT (ms)',
            'TPS',
            'Duration (ms)',
            'Tokens in',
            'Tokens out',
            'Token source',
            'Cost (USD)',
            'Cost source',
            'Cache read tokens',
            'Cache write tokens',
            'Rating',
            'Rule',
            'AI accuracy'
        ],
        document.records.map((record) => [
            escapeHtml(record.source),
            escapeHtml(record.resultId),
            escapeHtml(record.modelId),
            escapeHtml(record.variantId ?? DASH),
            record.attempt === undefined
                ? escapeHtml(DASH)
                : escapeHtml(String(record.attempt)),
            escapeHtml(record.status),
            record.selectedForSummary ? 'yes' : 'no',
            htmlMetric(record.ttft, record.ttft === undefined ? 0 : 1),
            htmlMetric(record.tps, record.tps === undefined ? 0 : 1),
            htmlMetric(
                record.totalDuration,
                record.totalDuration === undefined ? 0 : 1
            ),
            record.inputTokens === undefined
                ? escapeHtml(DASH)
                : escapeHtml(String(record.inputTokens)),
            record.outputTokens === undefined
                ? escapeHtml(DASH)
                : escapeHtml(String(record.outputTokens)),
            escapeHtml(record.tokenSource ?? 'unknown'),
            record.cost === undefined
                ? escapeHtml(DASH)
                : escapeHtml(String(record.cost)),
            escapeHtml(record.costSource ?? 'unknown'),
            record.cacheReadTokens === undefined
                ? escapeHtml(DASH)
                : escapeHtml(String(record.cacheReadTokens)),
            record.cacheWriteTokens === undefined
                ? escapeHtml(DASH)
                : escapeHtml(String(record.cacheWriteTokens)),
            record.rating === undefined
                ? escapeHtml(DASH)
                : escapeHtml(String(record.rating)),
            record.ruleEvaluation
                ? escapeHtml(String(record.ruleEvaluation.passed))
                : escapeHtml(DASH),
            htmlMetric(
                record.judgeEvaluation?.accuracy,
                record.judgeEvaluation === undefined ? 0 : 1
            )
        ])
    )
    const details = document.records.map((record) => {
        const blocks: string[] = [
            `<h3>Record ${escapeHtml(record.resultId)}</h3>`,
            '<ul>',
            `<li>${escapeHtml(`Source: ${record.source}`)}</li>`,
            ...(record.sessionId !== undefined
                ? [`<li>${escapeHtml(`Session: ${record.sessionId}`)}</li>`]
                : []),
            ...(record.runId !== undefined
                ? [`<li>${escapeHtml(`Run: ${record.runId}`)}</li>`]
                : []),
            ...(record.taskId !== undefined
                ? [
                      `<li>${escapeHtml(`Task: ${record.taskId} (case ${record.caseId ?? DASH}, repeat ${record.repeatIndex ?? DASH})`)}</li>`
                  ]
                : []),
            `<li>${escapeHtml(`Status: ${record.status}`)}</li>`,
            provenanceList(document, record),
            '</ul>',
            ...(record.prompt !== undefined
                ? [`<h4>Prompt</h4><pre>${escapeHtml(record.prompt)}</pre>`]
                : []),
            ...(record.expected !== undefined
                ? [`<h4>Expected</h4><pre>${escapeHtml(record.expected)}</pre>`]
                : []),
            ...(record.response !== undefined
                ? [`<h4>Response</h4><pre>${escapeHtml(record.response)}</pre>`]
                : []),
            ...(record.reasoning !== undefined
                ? [
                      `<h4>Reasoning</h4><pre>${escapeHtml(record.reasoning)}</pre>`
                  ]
                : []),
            ...(record.judgeEvaluation?.rationale !== undefined
                ? [
                      `<h4>Judge rationale</h4><pre>${escapeHtml(record.judgeEvaluation.rationale)}</pre>`
                  ]
                : [])
        ]
        return blocks.join('\n')
    })
    return `${table}\n${details.join('\n')}`
}

/** Offline HTML with escaped values and print styles; no scripts or remote assets. */
export function exportReportHTML(document: ReportDocument): string {
    const sections: string[] = [
        `<section>\n<h2>Summary</h2>\n${htmlSummary(document)}\n</section>`,
        htmlSection('Model comparison', htmlModelComparison(document))
    ]
    sections.push(...htmlFrozenConfig(document))
    sections.push(...htmlBaseline(document))
    sections.push(...htmlTrials(document))
    sections.push(htmlSection('Records', htmlRecords(document)))
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(document.metadata.title)}</title>
<style>${HTML_STYLES}</style>
</head>
<body>
<h1>${escapeHtml(document.metadata.title)}</h1>
<p class="meta">${escapeHtml(
        `Generated: ${document.metadata.generatedAt} · NiLLM v${document.metadata.appVersion} · Source: ${document.metadata.source} · ${filtersLine(document)}`
    )}</p>
${sections.join('\n')}
</body>
</html>
`
}
