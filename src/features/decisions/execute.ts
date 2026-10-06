import { generateObject } from 'ai'
import { z } from 'zod'
import { getProvider } from '@/lib/ai-provider'
import { resolveModelPricing } from '@/lib/providers/presets'
import {
    providerOptionsKey,
    samplingProviderOptions
} from '@/lib/providers/provider-options'
import type { LLMModel, Message } from '@/lib/types'
import type { StreamEvent } from '@/lib/streaming/protocol'
import {
    decisionOutputSchema,
    parseDecisionPrompt,
    validateDecisionResponse
} from '@/lib/decisions'
import {
    DECISION_SYSTEM_PROMPT,
    decisionEndpoint,
    resolveDecisionProtocol
} from '@/lib/providers/decisions'
import { requestDecisionResponse } from './responses'
import { normalizeUsage, usageMetrics, type TokenUsage } from '@/lib/usage'

const usageSchema = z.object({
    input_tokens: z.number().int().nonnegative().optional(),
    output_tokens: z.number().int().nonnegative().optional(),
    cost: z.number().finite().nonnegative().optional(),
    input_tokens_details: z
        .object({
            cached_tokens: z.number().int().nonnegative().optional()
        })
        .optional()
})

import { DecisionError } from '@/lib/errors'

export { DecisionError }

/** One independent decision request. Native Jev never enters a chat adapter. */
export async function executeDecision(
    model: LLMModel,
    messages: Message[],
    resultId: string,
    emit: (event: StreamEvent) => void,
    abortSignal?: AbortSignal
) {
    const prompt =
        messages.findLast((message) => message.role === 'user')?.content ?? ''
    let request
    try {
        request = parseDecisionPrompt(prompt)
    } catch {
        throw new DecisionError(
            'Decision input must be valid JSON with state and typed questions.'
        )
    }
    const start = performance.now()
    const config = model.config
    const pricing = resolveModelPricing(model)
    let value: unknown
    let measuredUsage: TokenUsage | undefined
    const protocol = resolveDecisionProtocol(model)
    const timeoutMs = config?.timeout?.totalMs ?? 120000
    const signal = abortSignal
        ? AbortSignal.any([abortSignal, AbortSignal.timeout(timeoutMs)])
        : AbortSignal.timeout(timeoutMs)
    signal.throwIfAborted()
    if (protocol === 'system-one') {
        const url = decisionEndpoint(model, protocol)
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${model.apiKey || ''}`,
                ...(model.provider === 'openrouter' && {
                    'HTTP-Referer': 'https://github.com/ni00/NiLLM',
                    'X-Title': 'NiLLM'
                })
            },
            body: JSON.stringify({
                ...request,
                model: model.providerId || model.id
            }),
            signal
        })
        if (!response.ok)
            throw new DecisionError(
                `Decision request failed (HTTP ${response.status}). Check the endpoint and API key.`
            )
        const body: unknown = await response.json()
        value = body
        const usage =
            body && typeof body === 'object' && 'usage' in body
                ? usageSchema.parse(body.usage)
                : undefined
        measuredUsage = normalizeUsage({
            inputTokens: usage?.input_tokens,
            outputTokens: usage?.output_tokens,
            raw: usage
        })
    } else if (protocol === 'openai-responses') {
        let result
        try {
            result = await requestDecisionResponse(
                model,
                request,
                config,
                signal
            )
        } catch {
            signal.throwIfAborted()
            throw new DecisionError(
                'Invalid decision response: the request was refused, incomplete or malformed.'
            )
        }
        if ('status' in result)
            throw new DecisionError(
                `Decision request failed (HTTP ${result.status}). Check the endpoint and API key.`
            )
        value = result.value
        measuredUsage = normalizeUsage({
            inputTokens: result.usage?.input_tokens,
            outputTokens: result.usage?.output_tokens,
            outputTokenDetails: {
                reasoningTokens:
                    result.usage?.output_tokens_details?.reasoning_tokens
            },
            raw: result.usage
        })
    } else {
        const schema = decisionOutputSchema(request)
        const provider = await getProvider(model)
        signal.throwIfAborted()
        const result = await generateObject({
            model: provider(model.providerId || model.id),
            schema,
            system: DECISION_SYSTEM_PROMPT,
            prompt: JSON.stringify(request),
            temperature: config?.temperature,
            topP: config?.topP,
            topK: config?.topK,
            maxOutputTokens: config?.maxTokens,
            frequencyPenalty: config?.frequencyPenalty,
            presencePenalty: config?.presencePenalty,
            seed: config?.seed,
            maxRetries: 0,
            abortSignal: signal,
            providerOptions: {
                [providerOptionsKey(model.provider)]:
                    samplingProviderOptions(config)
            },
            telemetry: {
                isEnabled: config?.telemetry?.isEnabled ?? false,
                functionId: config?.telemetry?.functionId ?? 'nillm-decision',
                recordInputs: config?.telemetry?.recordInputs ?? false,
                recordOutputs: config?.telemetry?.recordOutputs ?? false,
                ...(config?.telemetry?.metadata && {
                    metadata: config.telemetry.metadata
                })
            }
        })
        value = { ...result.object, model: result.response.modelId }
        measuredUsage = normalizeUsage(result.usage)
    }
    signal.throwIfAborted()
    let response
    try {
        response = validateDecisionResponse(request, value)
    } catch {
        throw new DecisionError(
            'Invalid decision response: check answer types, options and probabilities.'
        )
    }
    const duration = Math.max(0, performance.now() - start)
    const measured = usageMetrics(measuredUsage, pricing)
    emit({
        type: 'update',
        resultId,
        textDelta: JSON.stringify(
            {
                ...response,
                confidenceSource:
                    protocol === 'system-one' ? 'provider' : 'self-reported'
            },
            null,
            2
        ),
        metrics: {
            ttft: 0,
            tps: 0,
            totalDuration: duration,
            tokenCount: measured.outputTokens ?? 0,
            ...measured,
            tokenSource: measured.outputTokens !== undefined ? 'api' : undefined
        },
        isFinal: true
    })
}
