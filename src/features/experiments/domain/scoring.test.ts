import { describe, expect, it } from 'vitest'
import type { TestCase } from '@/lib/types'
import { testCaseSchema } from '@/lib/validation'
import { evaluateExpected } from './scoring'

const testCase = (
    expected?: string,
    type?: 'exact' | 'contains' | 'json'
): TestCase => ({
    id: 'case',
    prompt: 'A question',
    expected,
    ...(type && { evaluation: { type } })
})

describe('expected-answer evaluation', () => {
    it('does not score a case with no expected answer or rule', () => {
        expect(evaluateExpected(testCase(), 'Anything')).toBeUndefined()
    })

    it('defaults legacy expected answers to exact and normalizes line endings and margins', () => {
        expect(evaluateExpected(testCase(' a\r\nb '), '\na\nb\n')).toEqual({
            type: 'exact',
            passed: true
        })
        expect(evaluateExpected(testCase('OK'), 'ok')?.passed).toBe(false)
        expect(evaluateExpected(testCase(''), ' \r\n')?.passed).toBe(true)
        expect(evaluateExpected(testCase(''), 'text')?.passed).toBe(false)
    })

    it('uses case-sensitive literal contains, not regular expressions', () => {
        expect(
            evaluateExpected(testCase(' a+b ', 'contains'), 'prefix a+b suffix')
                ?.passed
        ).toBe(true)
        expect(
            evaluateExpected(testCase('a+b', 'contains'), 'aaab')?.passed
        ).toBe(false)
        expect(evaluateExpected(testCase('OK', 'contains'), 'ok')?.passed).toBe(
            false
        )
        expect(
            evaluateExpected(
                testCase('a\r\nb', 'contains'),
                'before a\nb after'
            )?.passed
        ).toBe(true)
    })

    it.each([
        ['{"a":1,"b":[2,{"x":true}]}', '{"b":[2,{"x":true}],"a":1}', true],
        ['[1,2]', '[2,1]', false],
        ['{"a":1}', '{"a":"1"}', false],
        ['{"a":null}', '{}', false],
        ['{"a":1}', '{"a":1,"b":2}', false],
        ['null', '"null"', false],
        ['-0', '0', true],
        ['{"__proto__":{"x":1}}', '{"__proto__":{"x":1}}', true],
        ['{"__proto__":{"x":1}}', '{"x":1}', false]
    ])(
        'compares JSON values without changing object/array/type semantics',
        (expected, response, passed) => {
            expect(
                evaluateExpected(testCase(expected, 'json'), response)
            ).toEqual({ type: 'json', passed })
        }
    )

    it('treats malformed or fenced JSON as a rule failure, not a generation failure', () => {
        for (const response of ['not JSON', '```json\n{"n":1}\n```'])
            expect(
                evaluateExpected(testCase('{"n":1}', 'json'), response)
            ).toEqual({
                type: 'json',
                passed: false,
                reason: 'Response is not valid JSON.'
            })
    })

    it('scores deep valid JSON without overflowing the call stack', () => {
        const nested = '['.repeat(12000) + '1' + ']'.repeat(12000)
        expect(evaluateExpected(testCase(nested, 'json'), nested)?.passed).toBe(
            true
        )
    })

    it.each([
        testCase(undefined, 'exact'),
        testCase(' \r\n', 'contains'),
        testCase('{broken}', 'json')
    ])('rejects invalid rules through the shared case schema', (value) => {
        expect(testCaseSchema.safeParse(value).success).toBe(false)
    })

    it('allows empty exact expectations through validation and scoring', () => {
        const parsed = testCaseSchema.parse(testCase('', 'exact'))
        expect(evaluateExpected(parsed, '')).toEqual({
            type: 'exact',
            passed: true
        })
    })
})
