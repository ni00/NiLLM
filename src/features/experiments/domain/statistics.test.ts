import { describe, expect, it } from 'vitest'
import { captureModelSnapshot } from '@/features/benchmark/snapshots'
import type {
    BenchmarkResult,
    ExperimentRun,
    ExperimentTask,
    GenerationConfig,
    JudgeEvaluation,
    LLMModel,
    ModelSnapshot,
    ResolvedGenerationConfig,
    TestCase,
    TestSet
} from '@/lib/types'
import {
    aggregateExperimentStatistics,
    compareExperiments,
    snapshotIdentityKey
} from './statistics'

const apiMetrics = {
    ttft: 100,
    tps: 20,
    totalDuration: 1000,
    tokenCount: 18,
    inputTokens: 3,
    outputTokens: 6,
    cost: 0.000015,
    tokenSource: 'api' as const
}

const attempt = (
    id: string,
    overrides: Partial<BenchmarkResult> = {}
): BenchmarkResult => ({
    id,
    modelId: 'm1',
    prompt: 'Reply OK.',
    response: 'OK',
    timestamp: 1000,
    status: 'completed',
    metrics: { ...apiMetrics },
    ...overrides
})

const task = (
    id: string,
    overrides: Partial<ExperimentTask> = {}
): ExperimentTask => ({
    id,
    caseId: 'c1',
    modelId: 'm1',
    variantId: 'default',
    repeatIndex: 0,
    attempts: [],
    ...overrides
})

const makeModel = (
    id: string,
    overrides: Partial<LLMModel> = {}
): LLMModel => ({
    id,
    name: id.toUpperCase(),
    provider: 'openai',
    providerId: id,
    enabled: true,
    baseURL: 'http://127.0.0.1:9/v1',
    ...overrides
})

const judgeEvaluation = (
    callId: string,
    overrides: Partial<JudgeEvaluation> = {}
): JudgeEvaluation => ({
    judgeCallId: callId,
    accuracy: 4,
    instructionFollowing: 3,
    completeness: 5,
    rationale: 'solid',
    judge: {
        id: 'judge',
        name: 'Judge',
        provider: 'openai',
        mode: 'chat',
        endpointFingerprint: 'a'.repeat(64)
    },
    judgeConfig: {},
    judgePrompt: 'Rate these',
    judgedAt: 1,
    usage: { inputTokens: 10, outputTokens: 5, cost: 0.000009 },
    ...overrides
})

function resolvedConfig(
    requested: Partial<GenerationConfig>
): ResolvedGenerationConfig {
    const config: GenerationConfig = {
        temperature: 0,
        maxTokens: 0,
        topP: 0,
        ...requested
    }
    return {
        requested: config,
        effective: config,
        sources: {},
        excludedParameters: []
    }
}

const exactCase = (id = 'c1'): TestCase => ({
    id,
    prompt: 'Reply OK.',
    expected: 'OK',
    evaluation: { type: 'exact' }
})

function runFixture(overrides: Partial<ExperimentRun>): ExperimentRun {
    const testSet: TestSet = {
        id: 'ts',
        name: 'Set',
        createdAt: 1,
        cases: [exactCase()]
    }
    return {
        id: 'run-1',
        name: 'Run 1',
        testSet,
        models: [],
        variants: [{ id: 'default', name: 'Default', overrides: {} }],
        configByModelVariant: {},
        repetitions: 1,
        maxConcurrent: 2,
        tasks: [],
        pendingTaskIds: [],
        status: 'completed',
        createdAt: 1000,
        ...overrides
    }
}

async function snapshots(...models: LLMModel[]): Promise<ModelSnapshot[]> {
    return Promise.all(models.map((m) => captureModelSnapshot(m)))
}

describe('aggregateExperimentStatistics', () => {
    it('summarizes only latest attempts for primary stats while counting all attempts', async () => {
        const [snapshot] = await snapshots(makeModel('m1'))
        const run = runFixture({
            models: [snapshot],
            repetitions: 3,
            tasks: [
                task('t0', { repeatIndex: 0, attempts: [attempt('a0')] }),
                task('t1', {
                    repeatIndex: 1,
                    attempts: [
                        attempt('a1-old', {
                            status: 'error',
                            error: 'boom',
                            metrics: { ...apiMetrics, cost: 0.000005 }
                        }),
                        attempt('a1', { metrics: { ...apiMetrics, tps: 30 } })
                    ]
                }),
                task('t2', { repeatIndex: 2 })
            ]
        })
        const stats = aggregateExperimentStatistics(run)
        expect(stats.plannedTaskCount).toBe(3)
        expect(stats.selectedTaskCount).toBe(3)
        expect(stats.executedTaskCount).toBe(2)
        expect(stats.recordedAttemptCount).toBe(3)
        expect(stats.failedAttemptCount).toBe(1)
        expect(stats.retriedTaskCount).toBe(1)
        expect(stats.modelStats).toHaveLength(1)
        const stat = stats.modelStats[0]
        expect(stat.variantId).toBe('default')
        expect(stat.variantName).toBe('Default')
        expect(stat.totalCount).toBe(2)
        expect(stat.completedCount).toBe(2)
        expect(stat.avgTPS).toBe(25)
        expect(stat.totalCost).toBeCloseTo(0.00003)
        expect(stat.costSampleCount).toBe(2)
        expect(stats.knownAllAttemptCost).toBeCloseTo(0.000035)
        expect(stats.knownAllAttemptCostSampleCount).toBe(3)
    })

    it('scopes selection to a variant while keeping planned task counts whole-run', async () => {
        const [s1, s2] = await snapshots(
            makeModel('m1'),
            makeModel('m2', { baseURL: 'http://127.0.0.1:10/v1' })
        )
        const run = runFixture({
            models: [s1, s2],
            variants: [
                { id: 'v1', name: 'Temp 0', overrides: {} },
                { id: 'v2', name: 'Temp 1', overrides: {} }
            ],
            tasks: [
                task('t0', { variantId: 'v1', attempts: [attempt('a0')] }),
                task('t1', {
                    modelId: 'm2',
                    variantId: 'v1',
                    repeatIndex: 0,
                    attempts: [attempt('a1', { modelId: 'm2' })]
                }),
                task('t2', { variantId: 'v2', repeatIndex: 0 })
            ]
        })
        const stats = aggregateExperimentStatistics(run, 'v1')
        expect(stats.plannedTaskCount).toBe(3)
        expect(stats.selectedTaskCount).toBe(2)
        expect(stats.totalSessions).toBe(0)
        expect(
            stats.modelStats.map((s) => [s.id, s.variantId, s.variantName])
        ).toEqual([
            ['m1', 'v1', 'Temp 0'],
            ['m2', 'v1', 'Temp 0']
        ])
    })

    it('deduplicates judge cost by judge call id across answers and attempts', async () => {
        const [snapshot] = await snapshots(makeModel('m1'))
        const run = runFixture({
            models: [snapshot],
            repetitions: 2,
            tasks: [
                task('t0', {
                    repeatIndex: 0,
                    attempts: [
                        attempt('a0-old', {
                            status: 'error',
                            error: 'x',
                            judgeEvaluation: judgeEvaluation('jc1')
                        }),
                        attempt('a0', {
                            judgeEvaluation: judgeEvaluation('jc1')
                        })
                    ]
                }),
                task('t1', {
                    repeatIndex: 1,
                    attempts: [
                        attempt('a1', {
                            judgeEvaluation: judgeEvaluation('jc2', {
                                usage: { inputTokens: 10, outputTokens: 5 }
                            })
                        })
                    ]
                })
            ]
        })
        const stats = aggregateExperimentStatistics(run)
        expect(stats.knownJudgeCost).toBeCloseTo(0.000009)
        expect(stats.knownJudgeCostSampleCount).toBe(1)
        const stat = stats.modelStats[0]
        expect(stat.aiRatingCount).toBe(2)
        expect(stat.aiAccuracyMean).toBe(4)
        expect(stat.aiInstructionFollowingMean).toBe(3)
        expect(stat.aiCompletenessMean).toBe(5)
    })

    it('computes repeated-trial stability from successful latest attempts only', async () => {
        const [snapshot] = await snapshots(makeModel('m1'))
        const sample = (id: string, ttft: number, tps: number) =>
            attempt(id, { metrics: { ...apiMetrics, ttft, tps } })
        const run = runFixture({
            models: [snapshot],
            repetitions: 4,
            tasks: [
                task('t0', { attempts: [sample('a0', 100, 20)] }),
                task('t1', {
                    repeatIndex: 1,
                    attempts: [sample('a1', 200, 30)]
                }),
                task('t2', {
                    repeatIndex: 2,
                    attempts: [
                        attempt('a2', {
                            metrics: {
                                ...apiMetrics,
                                ttft: 300,
                                tps: 500,
                                tokenSource: 'estimated' as const
                            }
                        })
                    ]
                }),
                task('t3', {
                    repeatIndex: 3,
                    attempts: [attempt('a3', { status: 'error', error: 'x' })]
                })
            ]
        })
        const stats = aggregateExperimentStatistics(run)
        expect(stats.trialStats).toHaveLength(1)
        const trial = stats.trialStats[0]
        expect(trial.caseId).toBe('c1')
        expect(trial.modelId).toBe('m1')
        expect(trial.variantId).toBe('default')
        // TTFT and duration accept every successful attempt; the estimated
        // TPS sample is excluded from API-only TPS stability.
        expect(trial.ttft).toEqual({
            sampleCount: 3,
            mean: 200,
            sampleStdDev: 100
        })
        expect(trial.tps).toEqual({
            sampleCount: 2,
            mean: 25,
            sampleStdDev: Math.sqrt(50)
        })
        expect(trial.totalDuration).toEqual({
            sampleCount: 3,
            mean: 1000,
            sampleStdDev: 0
        })
    })

    it('omits trial stddev and unknown costs for single sparse samples', async () => {
        const [snapshot] = await snapshots(makeModel('m1'))
        const run = runFixture({
            models: [snapshot],
            tasks: [
                task('t0', {
                    attempts: [
                        attempt('a0', {
                            metrics: { ...apiMetrics, cost: undefined }
                        })
                    ]
                })
            ]
        })
        const stats = aggregateExperimentStatistics(run)
        const trial = stats.trialStats[0]
        expect(trial.ttft).toEqual({ sampleCount: 1, mean: 100 })
        expect(trial.ttft.sampleStdDev).toBeUndefined()
        expect(stats.knownAllAttemptCost).toBeUndefined()
        expect(stats.knownAllAttemptCostSampleCount).toBe(0)
        expect(stats.knownJudgeCost).toBeUndefined()
        expect(stats.knownJudgeCostSampleCount).toBe(0)
        expect(stats.totalSessions).toBe(0)
    })

    it('keeps imported tuple identities distinct even when IDs contain separators', async () => {
        const models = await snapshots(makeModel('m\u0000v'), makeModel('m'))
        const run = runFixture({
            models,
            variants: [
                { id: 'g', name: 'Group G', overrides: {} },
                { id: 'v\u0000g', name: 'Group V', overrides: {} }
            ],
            tasks: [
                task('first', {
                    modelId: 'm\u0000v',
                    variantId: 'g',
                    attempts: [
                        attempt('first-answer', {
                            metrics: { ...apiMetrics, ttft: 100 }
                        })
                    ]
                }),
                task('second', {
                    modelId: 'm',
                    variantId: 'v\u0000g',
                    attempts: [
                        attempt('second-answer', {
                            metrics: { ...apiMetrics, ttft: 300 }
                        })
                    ]
                })
            ]
        })
        const stats = aggregateExperimentStatistics(run)
        expect(
            stats.modelStats.map((stat) => [
                stat.id,
                stat.variantId,
                stat.avgTTFT
            ])
        ).toEqual([
            ['m\u0000v', 'g', 100],
            ['m', 'v\u0000g', 300]
        ])
        expect(
            stats.trialStats.map((trial) => [
                trial.modelId,
                trial.variantId,
                trial.ttft.sampleCount,
                trial.ttft.mean
            ])
        ).toEqual([
            ['m\u0000v', 'g', 1, 100],
            ['m', 'v\u0000g', 1, 300]
        ])
    })
})

describe('compareExperiments', () => {
    it('matches frozen identities and diffs metrics, runs and request configs', async () => {
        const [base, target] = await Promise.all([
            snapshots(makeModel('m1', { name: 'Alpha' })),
            snapshots(
                makeModel('m1', {
                    name: 'Beta',
                    baseURL: 'http://127.0.0.1:9/v1'
                }),
                makeModel('m2', { baseURL: 'http://127.0.0.1:10/v1' })
            )
        ])
        const baseline = runFixture({
            id: 'base',
            models: base,
            variants: [{ id: 't0', name: 'Temp 0', overrides: {} }],
            repetitions: 3,
            configByModelVariant: {
                m1: { t0: resolvedConfig({ temperature: 0 }) }
            },
            tasks: [
                task('t0', {
                    variantId: 't0',
                    attempts: [
                        attempt('a0', {
                            ruleEvaluation: {
                                type: 'exact',
                                passed: false,
                                evaluatedAt: 1
                            }
                        })
                    ]
                })
            ]
        })
        const targetRun = runFixture({
            id: 'target',
            models: target,
            variants: [{ id: 't1', name: 'Temp 1', overrides: {} }],
            repetitions: 2,
            maxConcurrent: 4,
            configByModelVariant: {
                m1: { t1: resolvedConfig({ temperature: 1 }) }
            },
            tasks: [
                task('b0', {
                    modelId: 'm1',
                    variantId: 't1',
                    attempts: [
                        attempt('b0', {
                            metrics: {
                                ...apiMetrics,
                                ttft: 200,
                                tps: 30,
                                cost: undefined
                            },
                            ruleEvaluation: {
                                type: 'exact',
                                passed: true,
                                evaluatedAt: 1
                            }
                        })
                    ]
                }),
                task('b1', {
                    modelId: 'm2',
                    variantId: 't1',
                    attempts: [attempt('b1', { modelId: 'm2' })]
                })
            ]
        })
        const comparison = compareExperiments(baseline, targetRun, {
            baselineVariantId: 't0',
            targetVariantId: 't1'
        })
        expect(comparison.compatible).toBe(true)
        expect(comparison.models).toHaveLength(2)
        const matched = comparison.models.find((entry) => entry.baseline)!
        expect(matched.identity).toBe(snapshotIdentityKey(base[0]))
        expect(matched.baseline?.id).toBe('m1')
        expect(matched.target?.id).toBe('m1')
        const metrics = matched.metrics!
        expect(metrics.avgTTFT).toEqual({
            baseline: 100,
            target: 200,
            absolute: 100,
            relative: 1
        })
        expect(metrics.p95TTFT).toEqual({
            baseline: 100,
            target: 200,
            absolute: 100,
            relative: 1
        })
        expect(metrics.avgDuration).toEqual({
            baseline: 1000,
            target: 1000,
            absolute: 0,
            relative: 0
        })
        expect(metrics.avgTPS).toEqual({
            baseline: 20,
            target: 30,
            absolute: 10,
            relative: 0.5
        })
        expect(metrics.totalCost).toEqual({ baseline: 0.000015 })
        expect(metrics.rulePassRate).toEqual({
            baseline: 0,
            target: 100,
            absolute: 100
        })
        expect('relative' in metrics.rulePassRate!).toBe(false)
        expect(metrics.rulePassRate!.relative).toBeUndefined()
        expect(metrics.aiAccuracyMean).toBeUndefined()
        expect(comparison.differences).toEqual([
            { field: 'repetitions', baseline: 3, target: 2 },
            { field: 'maxConcurrent', baseline: 2, target: 4 },
            { field: 'config.m1.temperature', baseline: 0, target: 1 }
        ])
        const sideBySide = comparison.models.find((entry) => !entry.baseline)!
        expect(sideBySide.target?.id).toBe('m2')
        expect(sideBySide.metrics).toBeUndefined()
    })

    it('refuses missing variants before comparing', async () => {
        const [base] = await snapshots(makeModel('m1'))
        const baseline = runFixture({
            models: [base],
            variants: [{ id: 't0', name: 'Temp 0', overrides: {} }]
        })
        const comparison = compareExperiments(baseline, baseline, {
            baselineVariantId: 't0',
            targetVariantId: 'nope'
        })
        expect(comparison).toEqual({
            compatible: false,
            reason: 'missing-variant',
            differences: [],
            models: []
        })
    })

    it('refuses different case sequences by content, not case ids', async () => {
        const [base, target] = await Promise.all([
            snapshots(makeModel('m1')),
            snapshots(makeModel('m1', { name: 'Beta' }))
        ])
        const baseline = runFixture({
            models: base,
            variants: [{ id: 't0', name: 'Temp 0', overrides: {} }],
            tasks: [task('t0', { variantId: 't0', attempts: [attempt('a0')] })]
        })
        const changedExpected = runFixture({
            id: 'changed',
            models: target,
            testSet: {
                id: 'ts2',
                name: 'Set 2',
                createdAt: 1,
                cases: [{ ...exactCase('x1'), expected: 'OK!' }]
            },
            variants: [{ id: 't1', name: 'Temp 1', overrides: {} }],
            tasks: [
                task('b0', {
                    modelId: 'm1',
                    variantId: 't1',
                    attempts: [attempt('b0')]
                })
            ]
        })
        expect(
            compareExperiments(baseline, changedExpected, {
                baselineVariantId: 't0',
                targetVariantId: 't1'
            })
        ).toMatchObject({ compatible: false, reason: 'different-test-set' })

        const reordered = runFixture({
            id: 'reordered',
            models: target,
            testSet: {
                id: 'ts3',
                name: 'Set 3',
                createdAt: 1,
                cases: [
                    {
                        id: 'c2',
                        prompt: 'Reply JSON.',
                        expected: '{"n":1}',
                        evaluation: { type: 'json' }
                    },
                    exactCase('c1')
                ]
            },
            variants: [{ id: 't1', name: 'Temp 1', overrides: {} }],
            tasks: [
                task('b0', {
                    modelId: 'm1',
                    variantId: 't1',
                    attempts: [attempt('b0')]
                })
            ]
        })
        expect(
            compareExperiments(baseline, reordered, {
                baselineVariantId: 't0',
                targetVariantId: 't1'
            })
        ).toMatchObject({ compatible: false, reason: 'different-test-set' })

        const renamedIds = runFixture({
            id: 'renamed',
            models: target,
            testSet: {
                id: 'ts4',
                name: 'Set 4',
                createdAt: 1,
                cases: [exactCase('x1')]
            },
            variants: [{ id: 't1', name: 'Temp 1', overrides: {} }],
            tasks: [
                task('b0', {
                    modelId: 'm1',
                    variantId: 't1',
                    attempts: [attempt('b0')]
                })
            ]
        })
        expect(
            compareExperiments(baseline, renamedIds, {
                baselineVariantId: 't0',
                targetVariantId: 't1'
            }).compatible
        ).toBe(true)
    })

    it('refuses duplicated identities inside either run', async () => {
        const [base, target] = await Promise.all([
            snapshots(makeModel('m1')),
            snapshots(
                makeModel('dup-a', { providerId: 'same' }),
                makeModel('dup-b', { providerId: 'same' })
            )
        ])
        const baseline = runFixture({
            models: base,
            variants: [{ id: 't0', name: 'Temp 0', overrides: {} }],
            tasks: [task('t0', { variantId: 't0', attempts: [attempt('a0')] })]
        })
        const targetRun = runFixture({
            id: 'dup',
            models: target,
            variants: [{ id: 't1', name: 'Temp 1', overrides: {} }],
            tasks: [
                task('b0', {
                    modelId: 'dup-a',
                    variantId: 't1',
                    attempts: [attempt('b0', { modelId: 'dup-a' })]
                }),
                task('b1', {
                    modelId: 'dup-b',
                    variantId: 't1',
                    attempts: [attempt('b1', { modelId: 'dup-b' })]
                })
            ]
        })
        const comparison = compareExperiments(baseline, targetRun, {
            baselineVariantId: 't0',
            targetVariantId: 't1'
        })
        expect(comparison.compatible).toBe(false)
        expect(comparison.reason).toBe('ambiguous-model-identity')
        expect(comparison.models.every((entry) => !entry.metrics)).toBe(true)
    })

    it('keeps unmatched models side-by-side without deltas', async () => {
        const [base, target] = await Promise.all([
            snapshots(makeModel('m1')),
            snapshots(makeModel('m9', { baseURL: 'http://127.0.0.1:10/v1' }))
        ])
        const baseline = runFixture({
            models: base,
            variants: [{ id: 't0', name: 'Temp 0', overrides: {} }],
            repetitions: 3,
            tasks: [task('t0', { variantId: 't0', attempts: [attempt('a0')] })]
        })
        const targetRun = runFixture({
            id: 'other',
            models: target,
            variants: [{ id: 't1', name: 'Temp 1', overrides: {} }],
            repetitions: 2,
            tasks: [
                task('b0', {
                    modelId: 'm9',
                    variantId: 't1',
                    attempts: [attempt('b0', { modelId: 'm9' })]
                })
            ]
        })
        const comparison = compareExperiments(baseline, targetRun, {
            baselineVariantId: 't0',
            targetVariantId: 't1'
        })
        expect(comparison.compatible).toBe(false)
        expect(comparison.reason).toBe('no-matching-models')
        expect(comparison.models).toHaveLength(2)
        expect(comparison.models.every((entry) => !entry.metrics)).toBe(true)
        expect(comparison.differences).toEqual([
            { field: 'repetitions', baseline: 3, target: 2 }
        ])
    })

    it('treats different endpoint fingerprints as different models', async () => {
        const [base, target] = await Promise.all([
            snapshots(makeModel('m1')),
            snapshots(
                makeModel('m1', {
                    baseURL: 'http://127.0.0.1:9/v1?api-version=2024-01-01'
                })
            )
        ])
        const baseline = runFixture({
            models: base,
            variants: [{ id: 't0', name: 'Temp 0', overrides: {} }],
            tasks: [task('t0', { variantId: 't0', attempts: [attempt('a0')] })]
        })
        const targetRun = runFixture({
            id: 'versioned',
            models: target,
            variants: [{ id: 't1', name: 'Temp 1', overrides: {} }],
            tasks: [
                task('b0', {
                    modelId: 'm1',
                    variantId: 't1',
                    attempts: [attempt('b0')]
                })
            ]
        })
        const comparison = compareExperiments(baseline, targetRun, {
            baselineVariantId: 't0',
            targetVariantId: 't1'
        })
        expect(comparison.reason).toBe('no-matching-models')
        expect(target[0].endpoint).toBe(base[0].endpoint)
        expect(target[0].endpointFingerprint).not.toBe(
            base[0].endpointFingerprint
        )
    })
})
