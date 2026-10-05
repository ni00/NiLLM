import { describe, expect, it } from 'vitest'
import { version as appVersion } from '../../../../package.json'
import type {
    BenchmarkResult,
    ExperimentRun,
    JudgeEvaluation,
    LLMModel,
    ModelSnapshot,
    RequestSnapshot,
    ResolvedGenerationConfig
} from '@/lib/types'
import { result, session } from '@/test/fixtures'
import {
    buildReportDocument,
    sanitizeReportIdentity,
    type ReportInput
} from './report'

const FINGERPRINT = 'a'.repeat(64)

const modelSnapshot = (
    id: string,
    overrides: Partial<ModelSnapshot> = {}
): ModelSnapshot => ({
    id,
    name: `Model ${id}`,
    provider: 'deepseek',
    mode: 'chat',
    endpoint: 'https://api.test/v1',
    endpointFingerprint: FINGERPRINT,
    ...overrides
})

const resolved = (
    overrides: Partial<ResolvedGenerationConfig> = {}
): ResolvedGenerationConfig => ({
    requested: {
        temperature: 0.7,
        maxTokens: 100,
        topP: 1,
        systemPrompt: 'global system',
        timeout: { totalMs: 120000, chunkMs: 10000 },
        telemetry: {
            isEnabled: true,
            functionId: 'chat',
            metadata: { secret: 'meta-value' }
        }
    },
    effective: {
        temperature: 0.7,
        maxTokens: 100,
        telemetry: { isEnabled: true }
    },
    sources: { temperature: 'global', 'timeout.totalMs': 'model' },
    excludedParameters: ['seed'],
    ...overrides
})

const requestSnapshot = (modelId: string): RequestSnapshot => ({
    schemaVersion: 1,
    model: modelSnapshot(modelId, { name: 'Alpha' }),
    parameters: resolved(),
    context: 'conversation',
    capturedAt: 42
})

const judgeEvaluation = (): JudgeEvaluation => ({
    judgeCallId: 'j1',
    accuracy: 4,
    instructionFollowing: 3,
    completeness: 5,
    rationale: 'Solid answer',
    judge: modelSnapshot('judge', { name: 'Judge' }),
    judgeConfig: {
        temperature: 0.1,
        systemPrompt: 'judge system',
        telemetry: { isEnabled: true, metadata: { secret: 'judge-meta' } }
    },
    judgePrompt: 'Judge prompt text',
    judgedAt: 9000,
    usage: { inputTokens: 10, outputTokens: 5, cost: 0.00009 }
})

const metrics = (overrides: Partial<BenchmarkResult['metrics']> = {}) => ({
    ttft: 120,
    tps: 30,
    totalDuration: 900,
    tokenCount: 9,
    inputTokens: 3,
    outputTokens: 6,
    tokenSource: 'api' as const,
    cost: 0.00000018,
    ...overrides
})

const modelA: LLMModel = {
    id: 'a',
    name: 'Alpha',
    provider: 'deepseek',
    enabled: true,
    apiKey: 'sk-secret',
    config: { temperature: 0.2 }
}
const modelB: LLMModel = {
    ...modelA,
    id: 'b',
    name: 'Beta',
    apiKey: undefined,
    config: undefined
}

const arenaSession = () => {
    const snapshotted: BenchmarkResult = result('r1', {
        modelId: 'a',
        prompt: 'Arena prompt one',
        response: 'Arena response one',
        reasoning: 'thinking out loud',
        rating: 4,
        ratingSource: 'human',
        metrics: metrics()
    })
    snapshotted.requestSnapshot = requestSnapshot('a')
    const legacy: BenchmarkResult = result('r2', {
        modelId: 'a',
        prompt: 'Arena prompt two',
        response: 'Arena response two',
        timestamp: 1100,
        metrics: metrics({ tokenSource: 'estimated', cost: undefined })
    })
    const failed: BenchmarkResult = result('r3', {
        modelId: 'b',
        prompt: 'Arena prompt three',
        response: '',
        status: 'error',
        error: 'HTTP 500',
        timestamp: 1200,
        metrics: metrics({
            ttft: 0,
            tps: 0,
            totalDuration: 40,
            cost: undefined
        })
    })
    return session({ a: [snapshotted, legacy], b: [failed] }, { id: 's1' })
}

const arenaInput = (): Extract<ReportInput, { source: 'arena' }> => ({
    source: 'arena',
    models: [modelA, modelB],
    sessions: [arenaSession()],
    filter: { since: 100 }
})

const PRIVATE = { includeContent: false, includeReasoning: false }
const FULL = { includeContent: true, includeReasoning: true }

const goodAttempt = (id: string): BenchmarkResult =>
    result(id, {
        modelId: 'm1',
        prompt: 'Reply with exactly OK.',
        response: 'OK',
        ruleEvaluation: { type: 'exact', passed: true, evaluatedAt: 8000 },
        judgeEvaluation: judgeEvaluation(),
        metrics: metrics()
    })

const experimentRun = (): ExperimentRun => {
    const olderFailure: BenchmarkResult = result('att-1', {
        modelId: 'm1',
        prompt: 'Reply with exactly OK.',
        response: '',
        status: 'error',
        error: 'HTTP 500',
        metrics: metrics({
            ttft: 0,
            tps: 0,
            totalDuration: 40,
            cost: undefined
        })
    })
    return {
        id: 'run-1',
        name: 'Smoke run',
        testSet: {
            id: 'ts',
            name: 'Smoke set',
            createdAt: 1,
            cases: [
                {
                    id: 'c1',
                    prompt: 'Reply with exactly OK.',
                    expected: 'OK',
                    evaluation: { type: 'exact' }
                },
                {
                    id: 'c2',
                    prompt: 'Reply with JSON.',
                    evaluation: { type: 'json' }
                }
            ]
        },
        models: [modelSnapshot('m1', { name: 'Alpha' })],
        variants: [
            { id: 'default', name: 'Default', overrides: {} },
            { id: 'hot', name: 'Hot', overrides: { temperature: 1.5 } }
        ],
        configByModelVariant: {
            m1: {
                default: resolved(),
                hot: resolved({
                    requested: { temperature: 1.5, maxTokens: 100, topP: 1 },
                    effective: { temperature: 1.5, maxTokens: 100 },
                    sources: { temperature: 'variant' }
                })
            }
        },
        repetitions: 1,
        maxConcurrent: 2,
        tasks: [
            {
                id: 't1',
                caseId: 'c1',
                modelId: 'm1',
                variantId: 'default',
                repeatIndex: 0,
                attempts: [goodAttempt('att-2')]
            },
            {
                id: 't2',
                caseId: 'c1',
                modelId: 'm1',
                variantId: 'hot',
                repeatIndex: 0,
                attempts: [olderFailure, goodAttempt('att-3')]
            }
        ],
        pendingTaskIds: [],
        status: 'completed',
        createdAt: 5000,
        startedAt: 5010,
        finishedAt: 6000
    }
}

const experimentInput = (
    overrides: Partial<Extract<ReportInput, { source: 'experiment' }>> = {}
): ReportInput => ({
    source: 'experiment',
    run: experimentRun(),
    ...overrides
})

describe('buildReportDocument: arena', () => {
    it('records schemaVersion 3, ISO timestamp, app version and absolute filters', () => {
        const document = buildReportDocument(arenaInput(), PRIVATE, 9999)
        expect(document.metadata.schemaVersion).toBe(3)
        expect(document.metadata.generatedAt).toBe(new Date(9999).toISOString())
        expect(document.metadata.appVersion).toBe(appVersion)
        expect(document.metadata.filters).toEqual({ since: 100 })
        expect(document.metadata.units.cost).toBe('USD')
        expect(document.metadata.omittedFields).toContain('prompt')
    })

    it('never exports telemetry.metadata and gates systemPrompt on content', () => {
        const privateDocument = buildReportDocument(arenaInput(), PRIVATE, 9999)
        const raw = JSON.stringify(privateDocument)
        expect(raw).not.toContain('meta-value')
        const snapshot = privateDocument.records.find(
            (record) => record.resultId === 'r1'
        )?.requestSnapshot
        expect(snapshot?.parameters.requested.telemetry).toEqual({
            isEnabled: true,
            functionId: 'chat'
        })
        expect(snapshot?.parameters.requested.systemPrompt).toBeUndefined()
        expect(snapshot?.parameters.effective.telemetry).toEqual({
            isEnabled: true
        })
        expect(snapshot?.parameters.sources['timeout.totalMs']).toBe('model')
        expect(snapshot?.parameters.excludedParameters).toEqual(['seed'])
        expect(snapshot?.parameters.requested.temperature).toBe(0.7)
        expect(snapshot?.parameters.requested.timeout).toEqual({
            totalMs: 120000,
            chunkMs: 10000
        })
        expect(snapshot?.capturedAt).toBe(42)
        expect(snapshot?.context).toBe('conversation')

        const openDocument = buildReportDocument(arenaInput(), FULL, 9999)
        const openSnapshot = openDocument.records.find(
            (record) => record.resultId === 'r1'
        )?.requestSnapshot
        expect(openSnapshot?.parameters.requested.systemPrompt).toBe(
            'global system'
        )
        expect(JSON.stringify(openDocument)).not.toContain('meta-value')
    })

    it('strips content from records by default and keeps metrics and scores', () => {
        const document = buildReportDocument(arenaInput(), PRIVATE, 9999)
        const raw = JSON.stringify(document)
        expect(raw).not.toContain('Arena prompt one')
        expect(raw).not.toContain('Arena response two')
        expect(raw).not.toContain('thinking out loud')
        const record = document.records.find((r) => r.resultId === 'r1')
        expect(record?.ttft).toBe(120)
        expect(record?.cost).toBe(0.00000018)
        expect(record?.tokenSource).toBe('api')
        expect(record?.rating).toBe(4)
        expect(record?.status).toBe('completed')

        const partial = buildReportDocument(
            arenaInput(),
            {
                includeContent: true,
                includeReasoning: false
            },
            9999
        )
        const partialRaw = JSON.stringify(partial)
        expect(partialRaw).toContain('Arena prompt one')
        expect(partialRaw).toContain('Arena response two')
        expect(partialRaw).not.toContain('thinking out loud')
        expect(partial.metadata.omittedFields).not.toContain('prompt')
        expect(partial.metadata.omittedFields).toContain('reasoning')

        const fullRaw = JSON.stringify(
            buildReportDocument(arenaInput(), FULL, 9999)
        )
        expect(fullRaw).toContain('thinking out loud')
    })

    it('never leaks api keys, current configs or raw provider keys', () => {
        const document = buildReportDocument(arenaInput(), FULL, 9999)
        const raw = JSON.stringify(document)
        expect(raw).not.toContain('sk-secret')
        expect(raw).not.toContain('providerKey')
        expect(document.modelComparison[0]).not.toHaveProperty('providerKey')
        // Identity in records comes from the captured snapshot, never the
        // live model entry.
        expect(raw).not.toContain('"temperature":0.2')
    })

    it('redacts providerKey filter values', () => {
        const groupKey = JSON.stringify([
            'deepseek',
            'https://api.test/v1?api-version=2&key=x',
            'Custom'
        ])
        const document = buildReportDocument(
            {
                source: 'arena',
                models: [modelA],
                sessions: [arenaSession()],
                filter: { providerKey: groupKey }
            },
            PRIVATE,
            9999
        )
        expect(document.metadata.filters.providerKey).toBeDefined()
        expect(JSON.stringify(document.metadata.filters)).not.toContain('key=x')
    })

    it('keeps failed and legacy records with resolved statuses', () => {
        const document = buildReportDocument(arenaInput(), PRIVATE, 9999)
        const failed = document.records.find((r) => r.resultId === 'r3')
        expect(failed?.status).toBe('error')
        const legacy = document.records.find((r) => r.resultId === 'r2')
        expect(legacy?.requestSnapshot).toBeUndefined()
        expect(legacy?.tokenSource).toBe('estimated')
    })
})

describe('buildReportDocument: experiment', () => {
    it('traces every retained attempt and selects only the last attempt', () => {
        const document = buildReportDocument(experimentInput(), PRIVATE, 9999)
        expect(document.records).toHaveLength(3)
        const t2 = document.records.filter((record) => record.taskId === 't2')
        expect(t2.map((record) => [record.attempt, record.status])).toEqual([
            [1, 'error'],
            [2, 'completed']
        ])
        expect(t2.map((record) => record.selectedForSummary)).toEqual([
            false,
            true
        ])
        const t1 = document.records.find((record) => record.taskId === 't1')
        expect(t1).toMatchObject({
            runId: 'run-1',
            caseId: 'c1',
            modelId: 'm1',
            variantId: 'default',
            repeatIndex: 0,
            attempt: 1,
            selectedForSummary: true
        })
    })

    it('links frozen configuration through the manifest without per-record snapshots', () => {
        const document = buildReportDocument(experimentInput(), PRIVATE, 9999)
        expect(
            document.records.every(
                (record) => record.requestSnapshot === undefined
            )
        ).toBe(true)
        const manifest = document.experiment
        expect(manifest).toMatchObject({
            id: 'run-1',
            name: 'Smoke run',
            status: 'completed',
            createdAt: 5000,
            repetitions: 1,
            maxConcurrent: 2
        })
        const config = manifest?.configByModelVariant.m1.default
        expect(config?.requested.temperature).toBe(0.7)
        expect(config?.requested.timeout).toEqual({
            totalMs: 120000,
            chunkMs: 10000
        })
        expect(config?.requested.telemetry).toEqual({
            isEnabled: true,
            functionId: 'chat'
        })
        expect(config?.sources['timeout.totalMs']).toBe('model')
        expect(manifest?.variants[1]?.overrides).toEqual({ temperature: 1.5 })
        expect(manifest?.cases.map((kase) => kase.id)).toEqual(['c1', 'c2'])
        expect(JSON.stringify(document)).not.toContain('meta-value')
    })

    it('applies content gating to cases, judge prompts and rationale but keeps scores', () => {
        const privateDocument = buildReportDocument(
            experimentInput(),
            PRIVATE,
            9999
        )
        const privateRaw = JSON.stringify(privateDocument)
        expect(privateRaw).not.toContain('Reply with exactly OK.')
        expect(privateRaw).not.toContain('Judge prompt text')
        expect(privateRaw).not.toContain('Solid answer')
        expect(privateRaw).not.toContain('judge-meta')
        const judged = privateDocument.records.find(
            (record) => record.resultId === 'att-2'
        )?.judgeEvaluation
        expect(judged).toMatchObject({
            judgeCallId: 'j1',
            accuracy: 4,
            instructionFollowing: 3,
            completeness: 5
        })
        expect(judged?.usage).toEqual({
            inputTokens: 10,
            outputTokens: 5,
            cost: 0.00009
        })

        const fullDocument = buildReportDocument(experimentInput(), FULL, 9999)
        const fullRaw = JSON.stringify(fullDocument)
        expect(fullRaw).toContain('Reply with exactly OK.')
        expect(fullRaw).toContain('Judge prompt text')
        expect(fullRaw).toContain('Solid answer')
        expect(fullDocument.experiment?.cases[0]).toMatchObject({
            id: 'c1',
            prompt: 'Reply with exactly OK.',
            expected: 'OK',
            evaluation: { type: 'exact' }
        })
    })

    it('exposes experiment counters and scopes selection to the variant', () => {
        const all = buildReportDocument(experimentInput(), PRIVATE, 9999)
        expect(all.summary.plannedTaskCount).toBe(2)
        expect(all.summary.selectedTaskCount).toBe(2)
        expect(all.summary.recordedAttemptCount).toBe(3)
        expect(all.summary.failedAttemptCount).toBe(1)
        expect(all.summary.retriedTaskCount).toBe(1)
        expect(all.summary.totalSessions).toBe(0)
        expect(all.summary.knownJudgeCost).toBeDefined()

        const scoped = buildReportDocument(
            experimentInput({ variantId: 'default' }),
            PRIVATE,
            9999
        )
        expect(scoped.summary.selectedTaskCount).toBe(1)
        expect(scoped.summary.recordedAttemptCount).toBe(1)
        expect(
            scoped.records.every((record) => record.variantId === 'default')
        ).toBe(true)
        expect(scoped.experiment?.selectedVariantId).toBe('default')
        expect(scoped.metadata.filters).toMatchObject({
            runId: 'run-1',
            variantId: 'default'
        })
    })

    it('embeds baseline comparison with redacted identities and config differences', () => {
        const baselineRun = experimentRun()
        baselineRun.id = 'run-0'
        baselineRun.models = [
            modelSnapshot('m1', {
                name: 'Alpha',
                endpoint:
                    'https://api.example.com/v1?api-version=1&key=topsecret'
            })
        ]
        baselineRun.configByModelVariant = {
            m1: {
                default: resolved({
                    requested: {
                        temperature: 0.9,
                        maxTokens: 100,
                        topP: 1,
                        telemetry: {
                            isEnabled: true,
                            metadata: { secret: 'baseline-secret' }
                        }
                    },
                    effective: { temperature: 0.9, maxTokens: 100 },
                    sources: {}
                })
            }
        }
        const targetRun = experimentRun()
        targetRun.models = baselineRun.models
        const document = buildReportDocument(
            experimentInput({
                variantId: 'default',
                run: targetRun,
                baseline: { run: baselineRun, variantId: 'default' }
            }),
            PRIVATE,
            9999
        )
        expect(document.metadata.filters).toMatchObject({
            baselineRunId: 'run-0',
            baselineVariantId: 'default'
        })
        const comparison = document.baselineComparison
        expect(comparison).toBeDefined()
        const raw = JSON.stringify(comparison)
        // Endpoint query strings and telemetry metadata never surface,
        // including inside difference values.
        expect(raw).not.toContain('topsecret')
        expect(raw).not.toContain('baseline-secret')
        expect(raw).toContain('api.example.com/v1')
        const temperatureDifference = comparison?.differences.find(
            (difference) => difference.field === 'config.m1.temperature'
        )
        expect(temperatureDifference).toMatchObject({
            baseline: 0.9,
            target: 0.7
        })
    })

    it('reports an unselected target parameter group instead of silently dropping the baseline', () => {
        const document = buildReportDocument(
            experimentInput({
                baseline: { run: experimentRun(), variantId: 'default' }
            }),
            PRIVATE,
            9999
        )
        expect(document.baselineComparison).toMatchObject({
            compatible: false,
            reason: 'missing-variant',
            models: []
        })
    })

    it('reports different test sets without deltas', () => {
        const baselineRun = experimentRun()
        baselineRun.id = 'run-0'
        baselineRun.testSet = {
            ...baselineRun.testSet,
            cases: [
                {
                    id: 'c9',
                    prompt: 'Different question',
                    expected: 'NOPE',
                    evaluation: { type: 'exact' }
                }
            ]
        }
        const document = buildReportDocument(
            experimentInput({
                variantId: 'default',
                baseline: { run: baselineRun, variantId: 'default' }
            }),
            PRIVATE,
            9999
        )
        expect(document.baselineComparison).toMatchObject({
            compatible: false,
            reason: 'different-test-set',
            differences: [],
            models: []
        })
        expect(JSON.stringify(document)).not.toContain('Different question')
    })
})

describe('report redaction helpers', () => {
    it('redacts endpoints inside identity strings and keeps fingerprints', () => {
        const groupKey = JSON.stringify([
            'deepseek',
            'https://api.test/v1?api-version=2&key=x',
            'Custom'
        ])
        const identity = `${JSON.stringify([groupKey, 'provider-id', 'chat'])}|${FINGERPRINT}`
        const redacted = sanitizeReportIdentity(identity)
        expect(redacted).toContain('https://api.test/v1')
        expect(redacted).not.toContain('key=x')
        expect(redacted.endsWith(`|${FINGERPRINT}`)).toBe(true)
    })

    it('drops unparseable endpoints instead of exposing the raw string', () => {
        const groupKey = JSON.stringify(['deepseek', 'http://', ''])
        const redacted = sanitizeReportIdentity(groupKey)
        expect(redacted).not.toContain('http://')
        expect(JSON.parse(redacted)).toEqual(['deepseek', '', ''])
    })
})
