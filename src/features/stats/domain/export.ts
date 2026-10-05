import { providerLabel } from '@/lib/providers/catalog'
import type { ModelStat } from './statistics'
import type {
    ReportDocument,
    ReportModelSnapshot,
    ReportRecord,
    ReportRequestSnapshot
} from './report'

type StatRow = Omit<ModelStat, 'providerKey'> & {
    variantId?: string
    variantName?: string
}

interface StatColumn {
    label: string
    key: keyof StatRow
    /** When this sample count is zero the metric cell is blank. */
    coverage?: Exclude<keyof ModelStat, 'providerKey'>
}

const statColumns: StatColumn[] = [
    { label: 'Model', key: 'name' },
    { label: 'Provider', key: 'provider' },
    { label: 'Mode', key: 'mode' },
    {
        label: 'Avg speed (tokens/s)',
        key: 'avgTPS',
        coverage: 'speedSampleCount'
    },
    { label: 'Avg TTFT (ms)', key: 'avgTTFT', coverage: 'latencySampleCount' },
    {
        label: 'Median TTFT (ms)',
        key: 'medianTTFT',
        coverage: 'latencySampleCount'
    },
    { label: 'P95 TTFT (ms)', key: 'p95TTFT', coverage: 'latencySampleCount' },
    {
        label: 'Avg duration (ms)',
        key: 'avgDuration',
        coverage: 'durationSampleCount'
    },
    { label: 'Avg rating (1-5)', key: 'avgRating', coverage: 'ratingCount' },
    {
        label: 'Successful tokens (API or estimate)',
        key: 'totalTokens'
    },
    { label: 'Input tokens (API)', key: 'inputTokens' },
    { label: 'Output tokens (API)', key: 'outputTokens' },
    { label: 'Requests', key: 'totalCount' },
    { label: 'Completed', key: 'completedCount' },
    { label: 'Failed', key: 'errorCount' },
    { label: 'Cancelled', key: 'cancelledCount' },
    { label: 'Pending', key: 'pendingCount' },
    { label: 'Success rate (%)', key: 'successRate' },
    {
        label: 'Known cost (USD)',
        key: 'totalCost',
        coverage: 'costSampleCount'
    },
    { label: 'Priced samples', key: 'costSampleCount' },
    { label: 'Estimated samples', key: 'estimatedCount' },
    {
        label: 'Median duration (ms)',
        key: 'medianDuration',
        coverage: 'durationSampleCount'
    },
    {
        label: 'P95 duration (ms)',
        key: 'p95Duration',
        coverage: 'durationSampleCount'
    },
    { label: 'Duration samples', key: 'durationSampleCount' },
    {
        label: 'Avg API speed (tokens/s)',
        key: 'apiAvgTPS',
        coverage: 'apiSpeedSampleCount'
    },
    { label: 'API speed samples', key: 'apiSpeedSampleCount' },
    {
        label: 'Avg estimated speed (tokens/s)',
        key: 'estimatedAvgTPS',
        coverage: 'estimatedSpeedSampleCount'
    },
    { label: 'Estimated speed samples', key: 'estimatedSpeedSampleCount' },
    { label: 'Unknown speed samples', key: 'unknownSpeedSampleCount' },
    {
        label: 'Human avg rating (1-5)',
        key: 'humanAvgRating',
        coverage: 'humanRatingCount'
    },
    { label: 'Human ratings', key: 'humanRatingCount' },
    {
        label: 'Rule pass rate (%)',
        key: 'rulePassRate',
        coverage: 'ruleEvaluatedCount'
    },
    { label: 'Rule evaluated', key: 'ruleEvaluatedCount' },
    { label: 'Rule passed', key: 'rulePassedCount' },
    {
        label: 'AI accuracy (1-5)',
        key: 'aiAccuracyMean',
        coverage: 'aiRatingCount'
    },
    {
        label: 'AI instruction following (1-5)',
        key: 'aiInstructionFollowingMean',
        coverage: 'aiRatingCount'
    },
    {
        label: 'AI completeness (1-5)',
        key: 'aiCompletenessMean',
        coverage: 'aiRatingCount'
    },
    { label: 'AI ratings', key: 'aiRatingCount' },
    { label: 'Parameter group ID', key: 'variantId' },
    { label: 'Parameter group', key: 'variantName' }
]

export function csvCell(value: string | number) {
    // Prevent spreadsheet formula execution while preserving CSV quoting.
    const text =
        typeof value === 'string' && /^[\s]*[=+@-]/.test(value)
            ? `'${value}`
            : String(value)
    return `"${text.replace(/"/g, '""')}"`
}

export function exportStatsCSV(stats: readonly StatRow[]) {
    return (
        '\uFEFF' +
        [
            statColumns.map(({ label }) => csvCell(label)).join(','),
            ...stats.map((stat) =>
                statColumns
                    .map(({ key, coverage }) => {
                        if (coverage && !stat[coverage]) return '""'
                        if (
                            key === 'successRate' &&
                            !(
                                stat.completedCount +
                                stat.errorCount +
                                stat.cancelledCount
                            )
                        )
                            return '""'
                        const value = stat[key]
                        if (
                            value === undefined ||
                            (typeof value === 'number' &&
                                !Number.isFinite(value))
                        )
                            return '""'
                        return csvCell(value)
                    })
                    .join(',')
            )
        ].join('\r\n')
    )
}

/** USD: unknown → —, <1 → six decimals, ≥1 → two; preserve sub-micro amounts. */
export function formatUSD(value: number | undefined): string {
    if (value === undefined || !Number.isFinite(value) || value < 0) return '—'
    if (value === 0) return '$0.000000'
    if (value < 0.000001) return '<$0.000001'
    if (value < 1) return `$${value.toFixed(6)}`
    return `$${value.toFixed(2)}`
}

const RAW_COLUMNS = [
    'source',
    'runId',
    'sessionId',
    'taskId',
    'caseId',
    'modelId',
    'modelName',
    'provider',
    'variantId',
    'repeatIndex',
    'attempt',
    'resultId',
    'timestamp',
    'status',
    'selectedForSummary',
    'requestConfig',
    'ttft',
    'tps',
    'totalDuration',
    'inputTokens',
    'outputTokens',
    'tokenSource',
    'cost',
    'costSource',
    'cacheReadTokens',
    'cacheWriteTokens',
    'rating',
    'ratingSource',
    'rulePassed',
    'aiAccuracy',
    'aiInstructionFollowing',
    'aiCompleteness',
    'prompt',
    'expected',
    'response'
] as const

const EMPTY_CELL = '""'
const numberCell = (value: number | undefined) =>
    value === undefined ? EMPTY_CELL : csvCell(value)
const boolCell = (value: boolean | undefined) =>
    value === undefined ? EMPTY_CELL : csvCell(value ? 'true' : 'false')

function manifestModel(
    document: ReportDocument,
    modelId: string
): ReportModelSnapshot | undefined {
    return document.experiment?.models.find((model) => model.id === modelId)
}

/** Use frozen record/manifest identity, never current settings; unknown stays blank. */
function identityFor(document: ReportDocument, record: ReportRecord) {
    const model =
        record.requestSnapshot?.model ?? manifestModel(document, record.modelId)
    return model
        ? { name: model.name, provider: providerLabel(model) }
        : { name: '', provider: '' }
}

/** Export captured requests, or reconstruct independent requests from the
 * frozen experiment manifest; leave unknown configurations blank. */
function requestConfigCell(
    document: ReportDocument,
    record: ReportRecord
): string {
    const existing = record.requestSnapshot
    if (existing) return JSON.stringify(existing)
    const manifest = document.experiment
    if (!manifest || record.source !== 'experiment') return ''
    const model = manifestModel(document, record.modelId)
    const parameters = record.variantId
        ? manifest.configByModelVariant[record.modelId]?.[record.variantId]
        : undefined
    if (!model || !parameters) return ''
    const snapshot: ReportRequestSnapshot = {
        schemaVersion: 1,
        model,
        parameters,
        context: 'independent',
        capturedAt: manifest.createdAt
    }
    return JSON.stringify(snapshot)
}

function rawRecordRow(document: ReportDocument, record: ReportRecord): string {
    const identity = identityFor(document, record)
    const judge = record.judgeEvaluation
    return [
        csvCell(record.source),
        record.runId === undefined ? EMPTY_CELL : csvCell(record.runId),
        record.sessionId === undefined ? EMPTY_CELL : csvCell(record.sessionId),
        record.taskId === undefined ? EMPTY_CELL : csvCell(record.taskId),
        record.caseId === undefined ? EMPTY_CELL : csvCell(record.caseId),
        csvCell(record.modelId),
        identity.name === '' ? EMPTY_CELL : csvCell(identity.name),
        identity.provider === '' ? EMPTY_CELL : csvCell(identity.provider),
        record.variantId === undefined ? EMPTY_CELL : csvCell(record.variantId),
        numberCell(record.repeatIndex),
        numberCell(record.attempt),
        csvCell(record.resultId),
        numberCell(record.timestamp),
        csvCell(record.status),
        boolCell(record.selectedForSummary),
        csvCell(requestConfigCell(document, record)),
        numberCell(record.ttft),
        numberCell(record.tps),
        numberCell(record.totalDuration),
        numberCell(record.inputTokens),
        numberCell(record.outputTokens),
        record.tokenSource === undefined
            ? EMPTY_CELL
            : csvCell(record.tokenSource),
        numberCell(record.cost),
        record.costSource === undefined
            ? EMPTY_CELL
            : csvCell(record.costSource),
        numberCell(record.cacheReadTokens),
        numberCell(record.cacheWriteTokens),
        numberCell(record.rating),
        record.ratingSource === undefined
            ? EMPTY_CELL
            : csvCell(record.ratingSource),
        boolCell(record.ruleEvaluation?.passed),
        numberCell(judge?.accuracy),
        numberCell(judge?.instructionFollowing),
        numberCell(judge?.completeness),
        record.prompt === undefined ? EMPTY_CELL : csvCell(record.prompt),
        record.expected === undefined ? EMPTY_CELL : csvCell(record.expected),
        record.response === undefined ? EMPTY_CELL : csvCell(record.response)
    ].join(',')
}

/** Raw request CSV with full precision, including a header for empty reports. */
export function exportResultsCSV(document: ReportDocument): string {
    return (
        '\uFEFF' +
        [
            RAW_COLUMNS.map((column) => csvCell(column)).join(','),
            ...document.records.map((record) => rawRecordRow(document, record))
        ].join('\r\n')
    )
}

const DASH = '—'

function mdEscapeCell(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\|/g, '\\|')
        .replace(/\r?\n/g, ' ')
}

function mdTable(headers: string[], rows: string[][]): string {
    return [
        `| ${headers.join(' | ')} |`,
        `| ${headers.map(() => '---').join(' | ')} |`,
        ...rows.map((row) => `| ${row.join(' | ')} |`)
    ].join('\n')
}

function mdFence(text: string): string {
    const longestRun = Math.max(
        0,
        ...text.split('\n').map((line) => {
            const match = line.match(/^(`+)/)
            return match ? match[1].length : 0
        })
    )
    const fence = '`'.repeat(Math.max(3, longestRun + 1))
    return `${fence}\n${text}\n${fence}`
}

function mdMetric(
    value: number | undefined,
    samples: number | undefined,
    format: (value: number) => string = String
): string {
    if (!samples || value === undefined) return DASH
    return mdEscapeCell(format(value))
}

function mdCost(cost: number | undefined, samples: number | undefined) {
    if (!samples || cost === undefined) return DASH
    return mdEscapeCell(`${formatUSD(cost)} (${cost} USD)`)
}

function mdPercent(value: number | undefined, samples?: number) {
    return mdMetric(
        value,
        samples ?? (value === undefined ? 0 : 1),
        (v) => `${v.toFixed(1)}%`
    )
}

function filtersLine(document: ReportDocument): string {
    const entries = Object.entries(document.metadata.filters)
    if (!entries.length) return 'Filters: none'
    return `Filters: ${entries
        .map(([key, value]) => `${key}=${String(value)}`)
        .join(', ')}`
}

function markdownSummaryRows(document: ReportDocument): string[][] {
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

function markdownModelComparison(document: ReportDocument): string {
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

function markdownFrozenConfig(document: ReportDocument): string[] {
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

function markdownBaseline(document: ReportDocument): string[] {
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

function markdownTrials(document: ReportDocument): string[] {
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
function provenanceFacts(
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

function markdownRecords(document: ReportDocument): string[] {
    if (!document.records.length) return ['## Records', '', '_No records._']
    const parts: string[] = [
        '## Records',
        '',
        mdTable(
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
                mdEscapeCell(record.source),
                mdEscapeCell(record.resultId),
                mdEscapeCell(record.modelId),
                mdEscapeCell(record.variantId ?? DASH),
                record.attempt === undefined ? DASH : String(record.attempt),
                mdEscapeCell(record.status),
                record.selectedForSummary ? 'yes' : 'no',
                mdMetric(record.ttft, record.ttft === undefined ? 0 : 1),
                mdMetric(record.tps, record.tps === undefined ? 0 : 1),
                mdMetric(
                    record.totalDuration,
                    record.totalDuration === undefined ? 0 : 1
                ),
                record.inputTokens === undefined
                    ? DASH
                    : String(record.inputTokens),
                record.outputTokens === undefined
                    ? DASH
                    : String(record.outputTokens),
                mdEscapeCell(record.tokenSource ?? 'unknown'),
                record.cost === undefined ? DASH : String(record.cost),
                mdEscapeCell(record.costSource ?? 'unknown'),
                record.cacheReadTokens === undefined
                    ? DASH
                    : String(record.cacheReadTokens),
                record.cacheWriteTokens === undefined
                    ? DASH
                    : String(record.cacheWriteTokens),
                record.rating === undefined ? DASH : String(record.rating),
                record.ruleEvaluation
                    ? String(record.ruleEvaluation.passed)
                    : DASH,
                mdMetric(
                    record.judgeEvaluation?.accuracy,
                    record.judgeEvaluation === undefined ? 0 : 1
                )
            ])
        )
    ]
    for (const record of document.records) {
        const recordId = mdEscapeCell(record.resultId)
        parts.push(
            '',
            `### Record ${recordId}`,
            '',
            `- Source: ${record.source}`,
            ...(record.sessionId !== undefined
                ? [`- Session: ${mdEscapeCell(record.sessionId)}`]
                : []),
            ...(record.runId !== undefined
                ? [`- Run: ${mdEscapeCell(record.runId)}`]
                : []),
            ...(record.taskId !== undefined
                ? [
                      `- Task: ${mdEscapeCell(record.taskId)} (case ${record.caseId === undefined ? DASH : mdEscapeCell(record.caseId)}, repeat ${record.repeatIndex ?? DASH})`
                  ]
                : []),
            `- Status: ${record.status}`,
            ...provenanceFacts(document, record).map((fact) => `- ${fact}`),
            ...(record.prompt !== undefined
                ? ['', 'Prompt:', '', mdFence(record.prompt)]
                : []),
            ...(record.expected !== undefined
                ? ['', 'Expected:', '', mdFence(record.expected)]
                : []),
            ...(record.response !== undefined
                ? ['', 'Response:', '', mdFence(record.response)]
                : []),
            ...(record.reasoning !== undefined
                ? ['', 'Reasoning:', '', mdFence(record.reasoning)]
                : []),
            ...(record.judgeEvaluation?.rationale !== undefined
                ? [
                      '',
                      'Judge rationale:',
                      '',
                      mdFence(record.judgeEvaluation.rationale)
                  ]
                : [])
        )
    }
    return parts
}

/** Escape table HTML/pipes and fence record bodies to match their backticks. */
export function exportReportMarkdown(document: ReportDocument): string {
    const sections: string[] = [
        `# ${mdEscapeCell(document.metadata.title)}`,
        '',
        `Generated: ${document.metadata.generatedAt}  `,
        `NiLLM v${document.metadata.appVersion}  `,
        `Source: ${document.metadata.source}  `,
        filtersLine(document),
        '',
        '## Summary',
        '',
        mdTable(['Metric', 'Value'], markdownSummaryRows(document)),
        '',
        '## Model comparison',
        '',
        document.modelComparison.length
            ? markdownModelComparison(document)
            : '_No models with recorded results._'
    ]
    sections.push('', ...markdownFrozenConfig(document))
    sections.push('', ...markdownBaseline(document))
    sections.push('', ...markdownTrials(document))
    sections.push('', ...markdownRecords(document))
    return sections.join('\n').replace(/\n{3,}/g, '\n\n') + '\n'
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
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
    const rows = markdownSummaryRows(document).map(([metric, value]) => [
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
