import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GenerationConfig, LLMModel } from '@/lib/types'
import { judgeResponses, resolveJudgeExecutionModel } from './judge'
import type { JudgeResponsesOptions } from './judge'

const generateObjectMock = vi.hoisted(() => vi.fn())
const getProviderMock = vi.hoisted(() => vi.fn())

// Stub only the transport boundary: generateObject + provider factory.
vi.mock('ai', () => ({ generateObject: generateObjectMock }))
vi.mock('@/lib/ai-provider', () => ({ getProvider: getProviderMock }))

const judgeModel: LLMModel = {
    id: 'judge-secret-id',
    name: 'SecretJudgeName',
    provider: 'openai',
    enabled: true,
    config: { temperature: 0.1 },
    pricing: { input: 1, output: 2 }
}

function makeOptions(
    overrides: Partial<JudgeResponsesOptions> = {}
): JudgeResponsesOptions {
    return {
        judgeModel,
        prompt: 'What is 2+2?',
        answers: [
            { resultId: 'result-a', response: 'four' },
            { resultId: 'result-b', response: '4' }
        ],
        orderKey: 'run-1:case-9:variant-2:repeat-0',
        judgePrompt: 'Score strictly.',
        ...overrides
    }
}

/** Fixed FNV-1a vector for the fixture orderKey; no copy of the production hash. */
function expectedOrder(
    answers: { resultId: string }[]
): Record<string, string> {
    const ids = new Set(answers.map((answer) => answer.resultId))
    return Object.fromEntries(
        ['result-b', 'result-c', 'result-a']
            .filter((id) => ids.has(id))
            .map((id, index) => [`answer_${index + 1}`, id])
    )
}

function sentPayload(): {
    system: string
    user: Record<string, unknown>
} {
    const { messages } = generateObjectMock.mock.calls[0][0] as {
        messages: { role: string; content: string }[]
    }
    return {
        system: messages[0].content,
        user: JSON.parse(messages[1].content)
    }
}

function ratingsFor(mapping: Record<string, string>) {
    return Object.keys(mapping).map((answerId, index) => ({
        answerId,
        accuracy: index + 1,
        instructionFollowing: index + 2,
        completeness: index + 3,
        rationale: `rationale for answer ${index + 1}`
    }))
}

beforeEach(() => {
    generateObjectMock.mockReset()
    getProviderMock.mockReset()
    getProviderMock.mockResolvedValue(() => 'model-token')
})

afterEach(() => {
    vi.restoreAllMocks()
})

describe('judgeResponses', () => {
    it('orders answers anonymously by FNV-1a and maps ratings back to result IDs', async () => {
        const options = makeOptions({
            expected: '4',
            answers: [
                { resultId: 'result-a', response: 'four' },
                { resultId: 'result-b', response: '4' },
                { resultId: 'result-c', response: 'IV' }
            ]
        })
        const mapping = expectedOrder(options.answers)
        generateObjectMock.mockResolvedValue({
            object: { ratings: ratingsFor(mapping) },
            usage: {}
        })

        const outcomes = await judgeResponses(options)

        const { user } = sentPayload()
        expect(user).toEqual({
            prompt: 'What is 2+2?',
            expected: '4',
            answers: Object.entries(mapping)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([answerId]) => ({
                    answerId,
                    response: options.answers.find(
                        (answer) => mapping[answerId] === answer.resultId
                    )?.response
                }))
        })

        for (const outcome of outcomes) {
            const answerId = Object.keys(mapping).find(
                (id) => mapping[id] === outcome.resultId
            )
            const rating = ratingsFor(mapping).find(
                (entry) => entry.answerId === answerId
            )!
            expect(outcome.evaluation.accuracy).toBe(rating.accuracy)
            expect(outcome.evaluation.instructionFollowing).toBe(
                rating.instructionFollowing
            )
            expect(outcome.evaluation.completeness).toBe(rating.completeness)
            expect(outcome.evaluation.rationale).toBe(rating.rationale)
        }
    })

    it('sends no real model, provider or result identities to the judge', async () => {
        generateObjectMock.mockResolvedValue({
            object: {
                ratings: ratingsFor(expectedOrder(makeOptions().answers))
            },
            usage: {}
        })

        await judgeResponses(makeOptions())

        const { system, user } = sentPayload()
        const wire = `${system}\n${JSON.stringify(user)}`
        expect(wire).not.toContain('judge-secret-id')
        expect(wire).not.toContain('SecretJudgeName')
        expect(wire).not.toContain('result-a')
        expect(wire).not.toContain('result-b')
        expect(wire).not.toContain('run-1')
    })

    it('rejects the whole group when the judge repeats an answer ID', async () => {
        generateObjectMock.mockResolvedValue({
            object: {
                ratings: [
                    ...ratingsFor({ answer_1: 'x' }),
                    { ...ratingsFor({ answer_1: 'x' })[0], rationale: 'dupe' }
                ]
            },
            usage: {}
        })

        await expect(judgeResponses(makeOptions())).rejects.toThrow(
            'Judge returned invalid ratings.'
        )
        expect(generateObjectMock).toHaveBeenCalledTimes(1)
    })

    it('rejects the whole group on unknown or missing answer IDs', async () => {
        generateObjectMock.mockResolvedValue({
            object: {
                ratings: [
                    ratingsFor({ answer_1: 'a' })[0],
                    {
                        ...ratingsFor({ answer_1: 'a' })[0],
                        answerId: 'answer_9'
                    }
                ]
            },
            usage: {}
        })
        await expect(judgeResponses(makeOptions())).rejects.toThrow(
            'Judge returned invalid ratings.'
        )

        generateObjectMock.mockResolvedValue({
            object: { ratings: ratingsFor({ answer_1: 'a' }) },
            usage: {}
        })
        await expect(judgeResponses(makeOptions())).rejects.toThrow(
            'Judge returned invalid ratings.'
        )
    })

    it('treats schema-invalid dimensions as a rejected group, not a crash', async () => {
        const schemaError = new Error('score 9 out of range')
        schemaError.name = 'NoObjectGeneratedError'
        generateObjectMock.mockRejectedValue(schemaError)

        await expect(judgeResponses(makeOptions())).rejects.toThrow(
            'Judge returned invalid ratings.'
        )
    })

    it('never calls the API with a pre-aborted signal', async () => {
        const controller = new AbortController()
        controller.abort()

        await expect(
            judgeResponses(makeOptions({ signal: controller.signal }))
        ).rejects.toThrow('Judge request was cancelled')
        expect(generateObjectMock).not.toHaveBeenCalled()
    })

    it('shares one judgeCallId and derives cost from frozen pricing', async () => {
        generateObjectMock.mockResolvedValue({
            object: {
                ratings: ratingsFor(expectedOrder(makeOptions().answers))
            },
            usage: { inputTokens: 10, outputTokens: 20 }
        })

        const [first, second] = await judgeResponses(makeOptions())

        expect(first.evaluation.judgeCallId).toBe(second.evaluation.judgeCallId)
        expect(first.evaluation.judge.id).toBe('judge-secret-id')
        expect(first.evaluation.judgePrompt).toBe('Score strictly.')
        expect(first.evaluation.judgedAt).toBeTypeOf('number')
        expect(first.evaluation.usage).toEqual({
            inputTokens: 10,
            outputTokens: 20,
            cost: 0.00005
        })
        expect(generateObjectMock.mock.calls[0][0]).toMatchObject({
            maxRetries: 0,
            temperature: 0.1
        })
    })

    it('omits usage and cost when the API reports none', async () => {
        generateObjectMock.mockResolvedValue({
            object: {
                ratings: ratingsFor(expectedOrder(makeOptions().answers))
            },
            usage: undefined
        })

        const [outcome] = await judgeResponses(makeOptions())
        expect(outcome.evaluation.usage).toBeUndefined()
    })

    it('returns an empty result for an empty group without any request', async () => {
        await expect(
            judgeResponses(makeOptions({ answers: [] }))
        ).resolves.toEqual([])
        expect(generateObjectMock).not.toHaveBeenCalled()
    })
})

describe('resolveJudgeExecutionModel', () => {
    it('layers global → judge model → temperature 0.1, then capability exclusion', () => {
        const global: GenerationConfig = {
            temperature: 0.7,
            maxTokens: 4096,
            topP: 0.9,
            seed: 7
        }
        const { model, resolved } = resolveJudgeExecutionModel(global, {
            ...judgeModel,
            config: { temperature: 0, maxTokens: 100 }
        })
        expect(resolved.effective.temperature).toBe(0.1)
        expect(resolved.effective.maxTokens).toBe(100)
        expect(model.config).toEqual(resolved.effective)

        const excluded = resolveJudgeExecutionModel(global, {
            ...judgeModel,
            config: { temperature: 0 },
            capabilities: { unsupportedParameters: ['temperature', 'seed'] }
        })
        expect(excluded.resolved.effective.temperature).toBeUndefined()
        expect(excluded.resolved.effective.seed).toBeUndefined()
        expect(excluded.resolved.excludedParameters).toEqual(
            expect.arrayContaining(['temperature', 'seed'])
        )
        expect(excluded.resolved.requested.seed).toBe(7)
    })
})
