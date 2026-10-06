import { z } from 'zod'
import type { GenerationConfigPatch, LLMModel } from '@/lib/types'
import { decisionOutputSchema, type DecisionRequest } from '@/lib/decisions'
import {
    DECISION_SYSTEM_PROMPT,
    decisionEndpoint
} from '@/lib/providers/decisions'

const responseSchema = z.object({
    status: z.literal('completed'),
    model: z.string(),
    output: z.array(
        z.object({
            type: z.string(),
            content: z
                .array(
                    z.discriminatedUnion('type', [
                        z.object({
                            type: z.literal('output_text'),
                            text: z.string()
                        }),
                        z.object({
                            type: z.literal('refusal'),
                            refusal: z.string()
                        })
                    ])
                )
                .optional()
        })
    ),
    usage: z
        .object({
            input_tokens: z.number().int().nonnegative(),
            output_tokens: z.number().int().nonnegative(),
            input_tokens_details: z
                .object({
                    cached_tokens: z.number().int().nonnegative().optional()
                })
                .optional(),
            output_tokens_details: z
                .object({
                    reasoning_tokens: z.number().int().nonnegative().optional()
                })
                .optional()
        })
        .nullish()
})

/** Stateless Responses request. Refusals and truncated output are failed attempts. */
export async function requestDecisionResponse(
    model: LLMModel,
    request: DecisionRequest,
    config: GenerationConfigPatch | undefined,
    signal: AbortSignal
) {
    const schema = z.toJSONSchema(decisionOutputSchema(request), {
        target: 'draft-7'
    })
    delete schema.$schema
    const response = await fetch(decisionEndpoint(model, 'openai-responses'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${model.apiKey || ''}`
        },
        body: JSON.stringify({
            model: model.providerId || model.id,
            instructions: DECISION_SYSTEM_PROMPT,
            input: [
                {
                    role: 'user',
                    content: [
                        { type: 'input_text', text: JSON.stringify(request) }
                    ]
                }
            ],
            text: {
                format: {
                    type: 'json_schema',
                    name: 'decision_answers',
                    strict: true,
                    schema
                }
            },
            store: false,
            stream: false,
            max_output_tokens: config?.maxTokens,
            temperature: config?.temperature,
            top_p: config?.topP
        }),
        signal
    })
    if (!response.ok) return { status: response.status } as const
    const body = responseSchema.parse(await response.json())
    const content = body.output
        .filter((item) => item.type === 'message')
        .flatMap((item) => item.content ?? [])
    if (content.some((item) => item.type === 'refusal'))
        throw new Error('Decision request was refused.')
    const text = content
        .filter((item) => item.type === 'output_text')
        .map((item) => item.text)
        .join('')
    const value: unknown = JSON.parse(text)
    // Do not let text override the version reported by the response envelope.
    const answers = decisionOutputSchema(request).parse(value)
    return {
        value: { ...answers, model: body.model },
        usage: body.usage
    } as const
}
