import type { TestSet } from '@/lib/types'
import { DECISION_EXAMPLE } from '@/features/decisions/domain'

export function getDecisionTests(language: 'en' | 'zh' | 'ja'): TestSet {
    return {
        id: `builtin-decisions-${language}`,
        name:
            language === 'zh'
                ? '决策模型：客服路由与紧急程度'
                : language === 'ja'
                  ? '意思決定：問い合わせ分類と緊急度'
                  : 'Decision models: support routing and urgency',
        createdAt: 0,
        cases: [
            {
                state: 'I was charged twice. Please refund the duplicate payment today.',
                expected: { department: 'billing', urgent: true, urgency: 2 }
            },
            {
                state: 'The API returns a server error for every request. Please fix it tomorrow.',
                expected: { department: 'technical', urgent: false, urgency: 1 }
            },
            {
                state: 'I would like pricing information for an upgrade. There is no rush.',
                expected: { department: 'sales', urgent: false, urgency: 0 }
            }
        ].map((example, index) => ({
            id: `decision-${index}`,
            prompt: JSON.stringify(
                { ...DECISION_EXAMPLE, state: example.state },
                null,
                2
            ),
            expected: JSON.stringify(example.expected),
            evaluation: { type: 'decision', tolerance: 0.5 }
        }))
    }
}
