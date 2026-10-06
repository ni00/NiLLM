import { providerLabel } from '@/lib/providers/catalog'
import type { ModelStat } from '@/lib/statistics'
import type {
    ReportDocument,
    ReportModelSnapshot,
    ReportRecord,
    ReportRequestSnapshot
} from './report-types'

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
