import { describe, expect, it } from 'vitest'
import { getDecisionTests } from '@/data/builtin-tests/decisions'
import { evaluateExpected } from '@/features/experiments/domain/scoring'
import { testSetSchema } from '@/lib/validation'
import { DECISION_EXAMPLE } from '@/lib/decisions'
import {
    decisionOutputSchema,
    parseDecisionPrompt,
    validateDecisionResponse
} from '@/lib/decisions'

import { exampleResponse } from '@/test/decision-fixtures'

describe('typed decision contracts', () => {
    it('accepts all three question types and structured state', () => {
        const request = parseDecisionPrompt(
            JSON.stringify({
                ...DECISION_EXAMPLE,
                state: { message: 'Help', history: ['One', 'Two'] }
            })
        )
        expect(validateDecisionResponse(request, exampleResponse)).toEqual(
            exampleResponse
        )
        expect(
            decisionOutputSchema(request).parse({
                answers: exampleResponse.answers
            })
        ).toEqual({ answers: exampleResponse.answers })
    })
    it.each([
        'Tell me something',
        JSON.stringify({ state: 'x', questions: {} }),
        JSON.stringify({
            state: 'x',
            questions: {
                x: { type: 'score', instructions: 'Rate', criteria: ['One'] }
            }
        }),
        JSON.stringify({
            ...DECISION_EXAMPLE,
            model: 'should-not-override-config'
        })
    ])('rejects invalid tasks before dispatch', (prompt) => {
        expect(() => parseDecisionPrompt(prompt)).toThrow('Decision input')
    })
    it.each([
        {
            ...exampleResponse,
            answers: {
                ...exampleResponse.answers,
                extra: { type: 'noul', noul: 0.5 }
            }
        },
        {
            ...exampleResponse,
            answers: {
                ...exampleResponse.answers,
                department: {
                    ...exampleResponse.answers.department,
                    choice: 'unknown'
                }
            }
        },
        {
            ...exampleResponse,
            answers: {
                ...exampleResponse.answers,
                department: {
                    ...exampleResponse.answers.department,
                    probabilities: { billing: 0.8, technical: 0.1, sales: 0 }
                }
            }
        },
        {
            ...exampleResponse,
            answers: {
                ...exampleResponse.answers,
                urgency: { ...exampleResponse.answers.urgency, score: 2.5 }
            }
        },
        {
            ...exampleResponse,
            answers: {
                ...exampleResponse.answers,
                urgent: { type: 'noul', noul: -0.1 }
            }
        }
    ])('rejects invalid answer values or distributions', (value) => {
        expect(() =>
            validateDecisionResponse(DECISION_EXAMPLE, value)
        ).toThrow()
    })
    it('scores decision values without matching confidence or probability text', () => {
        const testCase = getDecisionTests('en').cases[0]
        expect(
            evaluateExpected(testCase, JSON.stringify(exampleResponse))
        ).toMatchObject({ type: 'decision', passed: true })
        expect(
            evaluateExpected(
                { ...testCase, expected: '{"department":"sales"}' },
                JSON.stringify(exampleResponse)
            )
        ).toMatchObject({ passed: false })
        expect(
            evaluateExpected(
                {
                    ...testCase,
                    expected: '{"urgency":2}',
                    evaluation: { type: 'decision', tolerance: 0.01 }
                },
                JSON.stringify(exampleResponse)
            )
        ).toMatchObject({ passed: false })
        expect(evaluateExpected(testCase, '{}')).toMatchObject({
            passed: false,
            reason: 'Response is not a valid decision answer.'
        })
    })
    it('validates built-in cases and rejects expectations outside the question contract', () => {
        for (const language of ['en', 'zh', 'ja'] as const)
            expect(
                testSetSchema.parse(getDecisionTests(language)).cases
            ).toHaveLength(3)
        const tests = getDecisionTests('en')
        expect(() =>
            testSetSchema.parse({
                ...tests,
                cases: [
                    { ...tests.cases[0], expected: '{"department":"unknown"}' }
                ]
            })
        ).toThrow()
    })
})
