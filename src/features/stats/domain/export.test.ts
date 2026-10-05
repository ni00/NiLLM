import { describe, expect, it } from 'vitest'
import type { BenchmarkResult, ExperimentRun } from '@/lib/types'
import { result, session } from '@/test/fixtures'
import {
    buildReportDocument,
    type ReportDocument,
    type ReportInput
} from './report'
import {
    exportReportHTML,
    exportReportMarkdown,
    exportResultsCSV,
    exportStatsCSV,
    formatUSD
} from './export'
import type { ModelStat } from './statistics'

const FINGERPRINT = 'b'.repeat(64)

const modelStatFixture = (overrides: Partial<ModelStat> = {}): ModelStat => ({
    id: 'a',
    name: 'Alpha',
    provider: 'DeepSeek',
    providerKey: JSON.stringify(['deepseek', 'https://api.test/v1', '']),
    mode: 'chat',
    avgTPS: 0,
    avgTTFT: 0,
    avgRating: 0,
    avgDuration: 0,
    medianTTFT: 0,
    p95TTFT: 0,
    totalTokens: 9,
    inputTokens: 3,
    outputTokens: 6,
    totalCount: 1,
    completedCount: 1,
    errorCount: 0,
    cancelledCount: 0,
    pendingCount: 0,
    successRate: 100,
    totalCost: 0,
    costSampleCount: 0,
    estimatedCount: 0,
    speedSampleCount: 0,
    latencySampleCount: 0,
    ratingCount: 0,
    medianDuration: 0,
    p95Duration: 0,
    durationSampleCount: 0,
    apiAvgTPS: 0,
    apiSpeedSampleCount: 0,
    estimatedAvgTPS: 0,
    estimatedSpeedSampleCount: 0,
    unknownSpeedSampleCount: 1,
    humanAvgRating: 0,
    humanRatingCount: 0,
    rulePassedCount: 0,
    ruleEvaluatedCount: 0,
    rulePassRate: 0,
    aiAccuracyMean: 0,
    aiInstructionFollowingMean: 0,
    aiCompletenessMean: 0,
    aiRatingCount: 0,
    ...overrides
})

const arenaResult = (
    id: string,
    overrides: Partial<BenchmarkResult> = {}
): BenchmarkResult =>
    result(id, {
        prompt: 'Say hi',
        response: 'Hi there',
        metrics: {
            ttft: 100,
            tps: 25,
            totalDuration: 800,
            tokenCount: 9,
            inputTokens: 3,
            outputTokens: 6,
            tokenSource: 'api',
            cost: 0.00000018
        },
        ...overrides
    })

/** Records without snapshots (legacy history) must never gain configs. */
const arenaDocument = (): ReportDocument => {
    const snapshotted = arenaResult('r1')
    snapshotted.requestSnapshot = {
        schemaVersion: 1,
        model: {
            id: 'a',
            name: 'Alpha',
            provider: 'deepseek',
            mode: 'chat',
            endpoint: 'https://api.test/v1',
            endpointFingerprint: FINGERPRINT
        },
        parameters: {
            requested: {
                temperature: 0.7,
                maxTokens: 100,
                topP: 1,
                systemPrompt: 'arena system',
                telemetry: { isEnabled: true, metadata: { secret: 'meta' } }
            },
            effective: { temperature: 0.7, maxTokens: 100 },
            sources: { temperature: 'global' },
            excludedParameters: ['seed']
        },
        context: 'conversation',
        capturedAt: 42
    }
    const legacy = arenaResult('r2', {
        prompt: '=SUM(1,2)',
        response: 'line1\nline2 "quoted"',
        timestamp: 1100,
        metrics: {
            ttft: 90,
            tps: 0,
            totalDuration: 700,
            tokenCount: 5,
            tokenSource: 'estimated'
        }
    })
    return buildReportDocument(
        {
            source: 'arena',
            models: [
                {
                    id: 'a',
                    name: 'Alpha',
                    provider: 'deepseek',
                    enabled: true
                }
            ],
            sessions: [session({ a: [snapshotted, legacy] }, { id: 's1' })],
            filter: {}
        },
        { includeContent: true, includeReasoning: false },
        9999
    )
}

const judgeFields = () => ({
    judgeCallId: 'j1',
    accuracy: 4,
    instructionFollowing: 3,
    completeness: 5,
    rationale: 'Reasoned choice',
    judge: {
        id: 'judge',
        name: 'Judge',
        provider: 'deepseek' as const,
        mode: 'chat' as const,
        endpointFingerprint: FINGERPRINT
    },
    judgeConfig: { temperature: 0.1 },
    judgePrompt: 'Judge prompt',
    judgedAt: 9000,
    usage: { inputTokens: 10, outputTokens: 5, cost: 0.00009 }
})

const experimentRun = (): ExperimentRun => ({
    id: 'run-1',
    name: 'Smoke <run> & "friends"',
    testSet: {
        id: 'ts',
        name: 'Smoke set',
        createdAt: 1,
        cases: [
            {
                id: 'c1',
                prompt: 'Pipe | and <b>bold</b> prompt',
                expected: 'OK',
                evaluation: { type: 'exact' }
            }
        ]
    },
    models: [
        {
            id: 'm1',
            name: 'Alpha',
            provider: 'deepseek',
            mode: 'chat',
            endpoint: 'https://api.test/v1',
            endpointFingerprint: FINGERPRINT
        }
    ],
    variants: [{ id: 'default', name: 'De|fault', overrides: {} }],
    configByModelVariant: {
        m1: {
            default: {
                requested: {
                    temperature: 0.7,
                    maxTokens: 100,
                    topP: 1,
                    telemetry: { isEnabled: true, metadata: { secret: 'm' } }
                },
                effective: { temperature: 0.7, maxTokens: 100 },
                sources: { temperature: 'global' },
                excludedParameters: ['seed']
            }
        }
    },
    repetitions: 3,
    maxConcurrent: 2,
    tasks: [
        {
            id: 't1',
            caseId: 'c1',
            modelId: 'm1',
            variantId: 'default',
            repeatIndex: 0,
            attempts: [
                result('att-1', {
                    modelId: 'm1',
                    status: 'error',
                    error: 'HTTP 500',
                    response: '',
                    metrics: {
                        ttft: 0,
                        tps: 0,
                        totalDuration: 40,
                        tokenCount: 0
                    }
                }),
                result('att-2', {
                    modelId: 'm1',
                    response: 'OK',
                    ruleEvaluation: {
                        type: 'exact',
                        passed: true,
                        evaluatedAt: 8000
                    },
                    judgeEvaluation: judgeFields(),
                    metrics: {
                        ttft: 120,
                        tps: 30,
                        totalDuration: 900,
                        tokenCount: 9,
                        inputTokens: 3,
                        outputTokens: 6,
                        tokenSource: 'api',
                        cost: 0.00000018
                    }
                })
            ]
        }
    ],
    pendingTaskIds: [],
    status: 'completed',
    createdAt: 5000,
    startedAt: 5010,
    finishedAt: 6000
})

const experimentDocument = (
    options = { includeContent: true, includeReasoning: false },
    overrides: Partial<Extract<ReportInput, { source: 'experiment' }>> = {}
): ReportDocument =>
    buildReportDocument(
        { source: 'experiment', run: experimentRun(), ...overrides },
        options,
        9999
    )

describe('formatUSD', () => {
    it('formats defined, tiny, zero and unknown amounts', () => {
        expect(formatUSD(undefined)).toBe('—')
        expect(formatUSD(Number.NaN)).toBe('—')
        expect(formatUSD(Infinity)).toBe('—')
        expect(formatUSD(-1)).toBe('—')
        expect(formatUSD(0)).toBe('$0.000000')
        expect(formatUSD(0.5)).toBe('$0.500000')
        expect(formatUSD(0.000001)).toBe('$0.000001')
        expect(formatUSD(0.0000001)).toBe('<$0.000001')
        expect(formatUSD(1)).toBe('$1.00')
        expect(formatUSD(1234.567)).toBe('$1234.57')
    })
})

describe('exportResultsCSV', () => {
    it('writes the exact ordered columns with BOM and CRLF', () => {
        const csv = exportResultsCSV(arenaDocument())
        const [bomAndHeader] = csv.split('\r\n')
        expect(bomAndHeader?.startsWith('\uFEFF')).toBe(true)
        expect(bomAndHeader?.replace('\uFEFF', '')).toBe(
            [
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
            ]
                .map((column) => `"${column}"`)
                .join(',')
        )
    })

    it('protects formula cells and preserves quotes and newlines', () => {
        const csv = exportResultsCSV(arenaDocument())
        expect(csv).toContain('"\'=SUM(1,2)"')
        expect(csv).toContain('"line1\nline2 ""quoted"""')
    })

    it('reconstructs the frozen independent request config from the manifest', () => {
        const csv = exportResultsCSV(experimentDocument())
        // csvCell doubles the JSON quotes inside the requestConfig cell.
        expect(csv).toContain('""context"":""independent""')
        expect(csv).toContain('""capturedAt"":5000')
        expect(csv).toContain('""temperature"":0.7')
        expect(csv).toContain('""excludedParameters"":[""seed""]')
        // Snapshot metadata is stripped even in raw requestConfig cells.
        expect(csv).not.toContain('""secret""')
        expect(csv).not.toContain('""metadata""')
    })

    it('keeps raw attempts with last-attempt selection flags', () => {
        const csv = exportResultsCSV(experimentDocument())
        const att1Row = csv
            .split('\r\n')
            .find((line) => line.includes('"att-1"'))
        expect(att1Row).toContain('"false"')
        const att2Row = csv
            .split('\r\n')
            .find((line) => line.includes('"att-2"'))
        // ratingSource empty, rulePassed true, aiAccuracy 4.
        expect(att2Row).toContain(',"","true","4",')
    })

    it('produces a valid header-only file for empty record sets', () => {
        const document = buildReportDocument(
            {
                source: 'arena',
                models: [],
                sessions: [],
                filter: {}
            },
            { includeContent: false, includeReasoning: false },
            9999
        )
        const csv = exportResultsCSV(document)
        expect(csv.endsWith('"response"')).toBe(true)
        expect(csv).not.toContain('NaN')
        expect(csv).not.toContain('Infinity')
    })
})

describe('exportStatsCSV', () => {
    it('accepts sanitized model stats without providerKey', () => {
        const document = experimentDocument()
        const csv = exportStatsCSV(document.modelComparison)
        expect(csv.startsWith('\uFEFF')).toBe(true)
        expect(csv).toContain('"Alpha"')
        expect(csv).not.toContain('https://api.test/v1')
    })

    it('blanks sample-gated metrics and keeps legacy columns', () => {
        const csv = exportStatsCSV([modelStatFixture()])
        const header = csv.split('\r\n')[0]?.split(',')
        const row = csv.split('\r\n')[1]?.split(',')
        const avgTPS = header?.indexOf('"Avg speed (tokens/s)"')
        expect(row?.[avgTPS ?? -1]).toBe('""')
        const avgDuration = header?.indexOf('"Avg duration (ms)"')
        expect(row?.[avgDuration ?? -1]).toBe('""')
        const totalCost = header?.indexOf('"Known cost (USD)"')
        expect(row?.[totalCost ?? -1]).toBe('""')
        const apiTPS = header?.indexOf('"Avg API speed (tokens/s)"')
        expect(row?.[apiTPS ?? -1]).toBe('""')
        const ruleRate = header?.indexOf('"Rule pass rate (%)"')
        expect(row?.[ruleRate ?? -1]).toBe('""')
        const aiAccuracy = header?.indexOf('"AI accuracy (1-5)"')
        expect(row?.[aiAccuracy ?? -1]).toBe('""')
        const estimated = header?.indexOf('"Estimated samples"')
        expect(row?.[estimated ?? -1]).toBe('"0"')
    })

    it('shows covered metrics at full value', () => {
        const csv = exportStatsCSV([
            modelStatFixture({
                avgTPS: 25.5,
                speedSampleCount: 1,
                apiAvgTPS: 25.5,
                apiSpeedSampleCount: 1,
                totalCost: 0.00000018,
                costSampleCount: 1,
                rulePassRate: 100,
                ruleEvaluatedCount: 1,
                rulePassedCount: 1,
                aiAccuracyMean: 4,
                aiRatingCount: 1
            })
        ])
        const header = csv.split('\r\n')[0]?.split(',')
        const row = csv.split('\r\n')[1]?.split(',')
        const apiTPS = header?.indexOf('"Avg API speed (tokens/s)"')
        expect(row?.[apiTPS ?? -1]).toBe('"25.5"')
        const ruleRate = header?.indexOf('"Rule pass rate (%)"')
        expect(row?.[ruleRate ?? -1]).toBe('"100"')
    })
})

describe('exportReportMarkdown', () => {
    it('escapes raw HTML and table separators in cells', () => {
        const markdown = exportReportMarkdown(experimentDocument())
        // Heading-level HTML escaping.
        expect(markdown).toContain('Smoke &lt;run&gt; &amp; "friends"')
        // Record bodies stay literal inside backtick fences.
        expect(markdown).toContain('<b>bold</b>')
        expect(markdown).toContain('```')
    })

    it('includes frozen experiment configuration and baseline status', () => {
        const baselineRun = experimentRun()
        baselineRun.id = 'run-0'
        baselineRun.testSet = {
            ...baselineRun.testSet,
            cases: [
                {
                    id: 'c9',
                    prompt: 'Different question entirely',
                    expected: 'NOPE',
                    evaluation: { type: 'exact' }
                }
            ]
        }
        const markdown = exportReportMarkdown(
            experimentDocument(
                { includeContent: false, includeReasoning: false },
                {
                    variantId: 'default',
                    baseline: { run: baselineRun, variantId: 'default' }
                }
            )
        )
        // Privacy: no case text or judge prompt without content.
        expect(markdown).not.toContain('Different question entirely')
        expect(markdown).not.toContain('Judge prompt')
        // Score numbers still visible.
        expect(markdown).toContain('| 4 |')
    })
})

describe('exportReportHTML', () => {
    it('escapes all content and contains no executable or remote resources', () => {
        const html = exportReportHTML(experimentDocument())
        const lowered = html.toLowerCase()
        expect(lowered).not.toContain('<script')
        expect(lowered).not.toContain('<img')
        expect(lowered).not.toContain('<link')
        expect(lowered).not.toContain('<iframe')
        expect(lowered).not.toContain('onerror')
        expect(lowered).not.toContain('src="http')
        expect(lowered).not.toContain('href="http')
        expect(html).toContain('Smoke &lt;run&gt; &amp; &quot;friends&quot;')
        expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;')
        expect(html).toContain('@media print')
        expect(html).toContain('<style>')
        expect(html).not.toContain('stylesheet')
    })

    it('keeps privacy defaults and score numbers', () => {
        const html = exportReportHTML(
            experimentDocument({
                includeContent: false,
                includeReasoning: false
            })
        )
        expect(html).not.toContain('Pipe | and')
        expect(html).not.toContain('Judge prompt')
        expect(html).not.toContain('"secret"')
        expect(html).toContain('AI accuracy')
        expect(html).toContain('<td>4</td>')
    })

    it('stays a valid document for empty record sets', () => {
        const document = buildReportDocument(
            { source: 'arena', models: [], sessions: [], filter: {} },
            { includeContent: false, includeReasoning: false },
            9999
        )
        const html = exportReportHTML(document)
        expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
        expect(html.trimEnd().endsWith('</html>')).toBe(true)
        expect(html).toContain('No records.')
    })
})
