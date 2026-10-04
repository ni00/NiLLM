import { describe, expect, it } from 'vitest'
import {
    recoverInterruptedExperiment,
    recoverInterruptedSession
} from './recovery'
import type {
    BenchmarkResult,
    ChatSession,
    ExperimentRun,
    TestSet
} from '@/lib/types'
import { experimentRunSchema } from '@/lib/validation'

const testSet: TestSet = {
    id: 'ts',
    name: 'T',
    cases: [{ id: 'c1', prompt: 'p', expected: 'OK' }],
    createdAt: 1
}

function result(
    id: string,
    overrides: Partial<BenchmarkResult> = {}
): BenchmarkResult {
    return {
        id,
        modelId: 'a',
        prompt: 'p',
        response: '',
        timestamp: 1,
        metrics: { ttft: 0, tps: 0, totalDuration: 0, tokenCount: 0 },
        ...overrides
    }
}

function run(overrides: Partial<ExperimentRun> = {}): ExperimentRun {
    return {
        id: 'r1',
        name: 'Run',
        testSet,
        models: [
            {
                id: 'a',
                name: 'A',
                provider: 'openai',
                mode: 'chat',
                endpointFingerprint: 'f'
            }
        ],
        variants: [{ id: 'default', name: 'Default', overrides: {} }],
        configByModelVariant: {
            a: {
                default: {
                    requested: {
                        temperature: 0.7,
                        maxTokens: 100,
                        topP: 0.9
                    },
                    effective: { temperature: 0.7 },
                    sources: { temperature: 'global' },
                    excludedParameters: []
                }
            }
        },
        repetitions: 1,
        maxConcurrent: 2,
        tasks: [
            {
                id: 't1',
                caseId: 'c1',
                modelId: 'a',
                variantId: 'default',
                repeatIndex: 0,
                attempts: []
            }
        ],
        pendingTaskIds: [],
        status: 'queued',
        createdAt: 1,
        ...overrides
    }
}

describe('recoverInterruptedExperiment', () => {
    it('marks queued/running runs interrupted and recovers pending attempts', () => {
        const pendingAttempt = result('x', {
            status: 'pending',
            response: 'partial',
            experiment: { runId: 'r1', taskId: 't1', attempt: 1 }
        })
        const recovered = recoverInterruptedExperiment(
            run({
                status: 'running',
                tasks: [
                    {
                        id: 't1',
                        caseId: 'c1',
                        modelId: 'a',
                        variantId: 'default',
                        repeatIndex: 0,
                        attempts: [pendingAttempt]
                    }
                ],
                pendingTaskIds: []
            })
        )
        expect(recovered.status).toBe('interrupted')
        expect(recovered.error).toBe(
            'Application closed before the request finished.'
        )
        expect(recovered.tasks[0].attempts[0]).toMatchObject({
            status: 'cancelled',
            response: 'partial'
        })
        expect(recovered.pendingTaskIds).toEqual(['t1'])
    })

    it('keeps paused runs paused but still recovers in-flight attempts', () => {
        const recovered = recoverInterruptedExperiment(
            run({
                status: 'paused',
                pendingTaskIds: ['t1'],
                tasks: [
                    {
                        id: 't1',
                        caseId: 'c1',
                        modelId: 'a',
                        variantId: 'default',
                        repeatIndex: 0,
                        attempts: [
                            result('x', {
                                status: 'pending',
                                experiment: {
                                    runId: 'r1',
                                    taskId: 't1',
                                    attempt: 1
                                }
                            })
                        ]
                    }
                ]
            })
        )
        expect(recovered.status).toBe('paused')
        expect(recovered.tasks[0].attempts[0].status).toBe('cancelled')
        expect(recovered.pendingTaskIds).toEqual(['t1'])
    })

    it('leaves terminal runs and their results untouched', () => {
        const completed = result('x', {
            status: 'completed',
            experiment: { runId: 'r1', taskId: 't1', attempt: 1 }
        })
        const recovered = recoverInterruptedExperiment(
            run({
                status: 'completed',
                tasks: [
                    {
                        id: 't1',
                        caseId: 'c1',
                        modelId: 'a',
                        variantId: 'default',
                        repeatIndex: 0,
                        attempts: [completed]
                    }
                ]
            })
        )
        expect(recovered.status).toBe('completed')
        expect(recovered.tasks[0].attempts[0].status).toBe('completed')
        expect(recovered.pendingTaskIds).toEqual([])
    })

    it('does not duplicate pending entries for unfinished tasks', () => {
        const recovered = recoverInterruptedExperiment(
            run({
                status: 'running',
                pendingTaskIds: ['t1'],
                tasks: [
                    {
                        id: 't1',
                        caseId: 'c1',
                        modelId: 'a',
                        variantId: 'default',
                        repeatIndex: 0,
                        attempts: [
                            result('x', {
                                status: 'pending',
                                experiment: {
                                    runId: 'r1',
                                    taskId: 't1',
                                    attempt: 1
                                }
                            })
                        ]
                    }
                ]
            })
        )
        expect(recovered.pendingTaskIds).toEqual(['t1'])
    })
})

describe('recoverInterruptedSession', () => {
    it('cancels pending arena results and keeps completed ones', () => {
        const session: ChatSession = {
            id: 's',
            title: 'S',
            models: ['a'],
            messages: [],
            results: {
                a: [
                    result('p1', { status: 'pending', response: 'partial' }),
                    result('p2', { status: 'completed' })
                ]
            },
            createdAt: 1
        }
        const recovered = recoverInterruptedSession(session)
        expect(recovered.results.a[0]).toMatchObject({
            status: 'cancelled',
            response: 'partial'
        })
        expect(recovered.results.a[1].status).toBe('completed')
    })
})

describe('experimentRunSchema', () => {
    it('accepts a structurally valid run and rejects broken references', () => {
        expect(() =>
            experimentRunSchema.parse(
                run({
                    tasks: [
                        {
                            id: 't1',
                            caseId: 'missing-case',
                            modelId: 'a',
                            variantId: 'default',
                            repeatIndex: 0,
                            attempts: []
                        }
                    ]
                })
            )
        ).toThrow(/unknown case/)
        expect(() => experimentRunSchema.parse(run())).not.toThrow()
    })
})
