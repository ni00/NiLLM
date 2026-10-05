import { z } from 'zod'

const description = z.union([
    z.string(),
    z.record(z.string(), z.json()),
    z.array(z.json())
])
const probability = z.number().finite().min(0).max(1)
const instructions = { instructions: description }
export const decisionQuestionSchema = z.discriminatedUnion('type', [
    z
        .object({
            type: z.literal('noul'),
            ...instructions,
            criteria: z
                .object({
                    true: description.optional(),
                    false: description.optional()
                })
                .optional()
        })
        .strict(),
    z
        .object({
            type: z.literal('choice'),
            ...instructions,
            criteria: z
                .record(z.string().min(1), description.nullable())
                .refine(
                    (values) =>
                        Object.keys(values).length >= 1 &&
                        Object.keys(values).length <= 255,
                    'Choice needs 1–255 options.'
                )
        })
        .strict(),
    z
        .object({
            type: z.literal('score'),
            ...instructions,
            criteria: z.array(description).min(2).max(10)
        })
        .strict()
])
export const decisionRequestSchema = z
    .object({
        state: description,
        questions: z
            .record(z.string().min(1), decisionQuestionSchema)
            .refine(
                (values) => Object.keys(values).length > 0,
                'Add at least one decision question.'
            )
    })
    .strict()
export type DecisionRequest = z.infer<typeof decisionRequestSchema>
export type DecisionQuestion = z.infer<typeof decisionQuestionSchema>

const answerSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('noul'), noul: probability }),
    z.object({
        type: z.literal('choice'),
        choice: z.string(),
        probabilities: z.record(z.string(), probability),
        confidence: probability
    }),
    z.object({
        type: z.literal('score'),
        score: z.number().finite(),
        probabilities: z.record(z.string(), probability),
        confidence: probability,
        legend: z.record(z.string(), description)
    })
])
export const decisionResponseSchema = z.object({
    answers: z.record(z.string(), answerSchema),
    model: z.string().optional(),
    confidenceSource: z.enum(['provider', 'self-reported']).optional()
})
export type DecisionAnswer = z.infer<typeof answerSchema>
export type DecisionResponse = z.infer<typeof decisionResponseSchema>

/** Native and LLM answers share the same runtime checks; never repair probabilities. */
export function validateDecisionResponse(
    request: DecisionRequest,
    value: unknown
): DecisionResponse {
    const result = decisionResponseSchema.parse(value)
    const questionIds = Object.keys(request.questions)
    if (Object.keys(result.answers).length !== questionIds.length)
        throw new Error('Decision answer IDs do not match the questions.')
    for (const id of questionIds) {
        const question = request.questions[id]
        const answer = Object.hasOwn(result.answers, id)
            ? result.answers[id]
            : undefined
        if (!answer || question.type !== answer.type)
            throw new Error('Decision answer type does not match the question.')
        if (answer.type === 'noul') continue
        const keys =
            question.type === 'choice'
                ? Object.keys(question.criteria)
                : (
                      question as Extract<DecisionQuestion, { type: 'score' }>
                  ).criteria.map((_, index) => String(index))
        const probabilities = answer.probabilities
        if (
            Object.keys(probabilities).length !== keys.length ||
            keys.some((key) => !Object.hasOwn(probabilities, key))
        )
            throw new Error(
                'Decision probabilities must cover exactly the defined options.'
            )
        const sum = Object.values(probabilities).reduce(
            (total, p) => total + p,
            0
        )
        if (Math.abs(sum - 1) > 0.00001)
            throw new Error('Decision probabilities must sum to 1.')
        if (answer.type === 'choice') {
            if (
                !keys.includes(answer.choice) ||
                probabilities[answer.choice] <
                    Math.max(...Object.values(probabilities)) - 0.00001
            )
                throw new Error(
                    'Decision choice must be a highest-probability option.'
                )
        } else {
            const weighted = keys.reduce(
                (total, key) => total + Number(key) * probabilities[key],
                0
            )
            if (
                answer.score < 0 ||
                answer.score > keys.length - 1 ||
                Math.abs(answer.score - weighted) > 0.0001
            )
                throw new Error(
                    'Decision score must match its probability-weighted levels.'
                )
            if (
                Object.keys(answer.legend).length !== keys.length ||
                keys.some((key) => !Object.hasOwn(answer.legend, key))
            )
                throw new Error(
                    'Decision score legend must cover the defined levels.'
                )
            // Rubrics come from the request, not provider-invented descriptions.
            answer.legend = Object.fromEntries(
                (
                    question as Extract<DecisionQuestion, { type: 'score' }>
                ).criteria.map((level, index) => [String(index), level])
            )
        }
    }
    return result
}

/** Exact per-question schema for providers supporting structured generation. */
export function decisionOutputSchema(request: DecisionRequest) {
    const answers = Object.fromEntries(
        Object.entries(request.questions).map(([id, question]) => {
            if (question.type === 'noul')
                return [
                    id,
                    z
                        .object({ type: z.literal('noul'), noul: probability })
                        .strict()
                ]
            const levels =
                question.type === 'choice'
                    ? Object.keys(question.criteria)
                    : question.criteria.map((_, index) => String(index))
            const probabilities = z
                .object(
                    Object.fromEntries(levels.map((key) => [key, probability]))
                )
                .strict()
            const common = {
                type: z.literal(question.type),
                probabilities,
                confidence: probability
            }
            return [
                id,
                question.type === 'choice'
                    ? z
                          .object({
                              ...common,
                              choice: z.enum(levels as [string, ...string[]])
                          })
                          .strict()
                    : z
                          .object({
                              ...common,
                              score: z
                                  .number()
                                  .min(0)
                                  .max(levels.length - 1),
                              legend: z
                                  .object(
                                      Object.fromEntries(
                                          levels.map((key, index) => [
                                              key,
                                              z.literal(
                                                  typeof question.criteria[
                                                      index
                                                  ] === 'string'
                                                      ? question.criteria[index]
                                                      : JSON.stringify(
                                                            question.criteria[
                                                                index
                                                            ]
                                                        )
                                              )
                                          ])
                                      )
                                  )
                                  .strict()
                          })
                          .strict()
            ]
        })
    )
    return z.object({ answers: z.object(answers).strict() }).strict()
}

export function parseDecisionPrompt(prompt: string): DecisionRequest {
    try {
        return decisionRequestSchema.parse(JSON.parse(prompt))
    } catch {
        throw new Error(
            'Decision input must be valid JSON with state and typed questions.'
        )
    }
}

export const DECISION_EXAMPLE: DecisionRequest = {
    state: 'I was charged twice. Please refund the duplicate payment today.',
    questions: {
        department: {
            type: 'choice',
            instructions: 'Which team should handle this request?',
            criteria: {
                billing: 'Payments, invoicing and refunds',
                technical: 'Bugs and outages',
                sales: 'Pricing and upgrades'
            }
        },
        urgent: {
            type: 'noul',
            instructions: 'Does the customer request action today?'
        },
        urgency: {
            type: 'score',
            instructions: 'Rate the urgency using the defined levels.',
            criteria: ['No deadline', 'This week', 'Today']
        }
    }
}

export const decisionExpectedSchema = z
    .record(
        z.string().min(1),
        z.union([z.string(), z.number().finite(), z.boolean()])
    )
    .refine(
        (value) => Object.keys(value).length > 0,
        'Add at least one expected decision.'
    )

export function validateDecisionExpected(
    request: DecisionRequest,
    value: unknown
) {
    const expected = decisionExpectedSchema.parse(value)
    for (const [id, target] of Object.entries(expected)) {
        const question = Object.hasOwn(request.questions, id)
            ? request.questions[id]
            : undefined
        if (!question)
            throw new Error('Expected decision refers to an unknown question.')
        if (
            question.type === 'choice' &&
            (typeof target !== 'string' ||
                !Object.hasOwn(question.criteria, target))
        )
            throw new Error(
                'Expected choice must be one of the defined options.'
            )
        if (
            question.type === 'score' &&
            (typeof target !== 'number' ||
                target < 0 ||
                target > question.criteria.length - 1)
        )
            throw new Error('Expected score must be within the defined levels.')
        if (
            question.type === 'noul' &&
            typeof target !== 'boolean' &&
            (typeof target !== 'number' || target < 0 || target > 1)
        )
            throw new Error('Expected Noul must be a boolean or a probability.')
    }
    return expected
}

export function scoreDecision(
    request: DecisionRequest,
    value: unknown,
    expectedValue: unknown,
    tolerance = 0.1
): boolean {
    const expected = validateDecisionExpected(request, expectedValue)
    const response = validateDecisionResponse(request, value)
    return Object.entries(expected).every(([id, target]) => {
        const answer = response.answers[id]
        if (answer.type === 'choice') return answer.choice === target
        if (answer.type === 'noul' && typeof target === 'boolean')
            return answer.noul >= 0.5 === target
        const actual = answer.type === 'noul' ? answer.noul : answer.score
        return Math.abs(actual - Number(target)) <= tolerance + Number.EPSILON
    })
}
