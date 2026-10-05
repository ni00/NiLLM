import type { RuleEvaluation, TestCase } from '@/lib/types'
import { parseDecisionPrompt, scoreDecision } from '@/features/decisions/domain'

function normalizeText(value: string): string {
    return value.replace(/\r\n/g, '\n').trim()
}

/** Compare parsed JSON without key sorting or a recursive call-stack limit. */
function equalJsonValues(left: unknown, right: unknown): boolean {
    const pending: unknown[] = [left, right]
    while (pending.length > 0) {
        const second = pending.pop()
        const first = pending.pop()
        if (first === second) continue
        if (
            first === null ||
            second === null ||
            typeof first !== 'object' ||
            typeof second !== 'object'
        )
            return false
        if (Array.isArray(first) || Array.isArray(second)) {
            if (
                !Array.isArray(first) ||
                !Array.isArray(second) ||
                first.length !== second.length
            )
                return false
            for (let index = 0; index < first.length; index++)
                pending.push(first[index], second[index])
        } else {
            const firstObject = first as Record<string, unknown>
            const secondObject = second as Record<string, unknown>
            const keys = Object.keys(firstObject)
            if (keys.length !== Object.keys(secondObject).length) return false
            for (const key of keys) {
                if (!Object.hasOwn(secondObject, key)) return false
                pending.push(firstObject[key], secondObject[key])
            }
        }
    }
    return true
}

/** Rules are validated on import/edit/planning; missing rules are not zero scores. */
export function evaluateExpected(
    testCase: TestCase,
    response: string
): Omit<RuleEvaluation, 'evaluatedAt'> | undefined {
    if (testCase.expected === undefined) {
        if (testCase.evaluation)
            throw new Error(
                'An expected answer is required for the scoring rule.'
            )
        return undefined
    }
    const type = testCase.evaluation?.type ?? 'exact'
    if (type === 'decision') {
        const request = parseDecisionPrompt(testCase.prompt)
        const expected: unknown = JSON.parse(testCase.expected)
        try {
            return {
                type,
                passed: scoreDecision(
                    request,
                    JSON.parse(response),
                    expected,
                    testCase.evaluation?.tolerance
                )
            }
        } catch {
            return {
                type,
                passed: false,
                reason: 'Response is not a valid decision answer.'
            }
        }
    }
    if (type === 'json') {
        const expected: unknown = JSON.parse(testCase.expected)
        let actual: unknown
        try {
            actual = JSON.parse(response)
        } catch {
            return {
                type,
                passed: false,
                reason: 'Response is not valid JSON.'
            }
        }
        return { type, passed: equalJsonValues(expected, actual) }
    }
    const expected = normalizeText(testCase.expected)
    const actual = normalizeText(response)
    if (type === 'contains' && !expected)
        throw new Error(
            'Contains scoring requires a non-empty expected answer.'
        )
    return {
        type,
        passed:
            type === 'exact' ? actual === expected : actual.includes(expected)
    }
}
