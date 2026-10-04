import { streamText } from 'ai'
import { getProvider } from '@/lib/ai-provider'
import type { LLMModel, Message } from '@/lib/types'
import type { StreamEvent } from './protocol'
import { toModelMessages } from './messages'
import { estimateTokens, streamMetrics } from './metrics'

export async function streamModel(
    model: LLMModel,
    messages: Message[],
    resultId: string,
    emit: (event: StreamEvent) => void,
    abortSignal?: AbortSignal
) {
    const start = performance.now()
    let firstToken: number | undefined
    let text = '',
        reasoning = '',
        pendingText = '',
        pendingReasoning = ''
    let lastUpdate = start
    let finished = false
    const config = model.config
    const result = streamText({
        model: (await getProvider(model))(model.providerId || model.id),
        messages: toModelMessages(messages),
        allowSystemInMessages: true,
        temperature: config?.temperature,
        topP: config?.topP,
        topK: config?.topK,
        maxOutputTokens: config?.maxTokens,
        frequencyPenalty: config?.frequencyPenalty,
        presencePenalty: config?.presencePenalty,
        seed: config?.seed,
        stopSequences: config?.stopSequences,
        timeout: config?.timeout,
        maxRetries: 0,
        abortSignal,
        providerOptions: {
            [model.provider === 'other' ? 'custom' : model.provider]: {
                ...(config?.minP !== undefined ? { min_p: config.minP } : {}),
                ...(config?.repetitionPenalty !== undefined
                    ? { repetition_penalty: config.repetitionPenalty }
                    : {})
            }
        },
        telemetry: {
            isEnabled: config?.telemetry?.isEnabled ?? false,
            functionId: config?.telemetry?.functionId || 'nillm-stream',
            recordInputs: config?.telemetry?.recordInputs ?? false,
            recordOutputs: config?.telemetry?.recordOutputs ?? false
        },
        runtimeContext: config?.telemetry?.metadata
    })
    const reader = result.stream.getReader()
    try {
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const now = performance.now()
            if (value.type === 'error') throw value.error
            if (
                value.type === 'text-delta' ||
                value.type === 'reasoning-delta'
            ) {
                if (value.text && firstToken === undefined) {
                    firstToken = now
                    emit({ type: 'start', resultId })
                }
                if (value.type === 'text-delta') {
                    text += value.text
                    pendingText += value.text
                } else {
                    reasoning += value.text
                    pendingReasoning += value.text
                }
            }
            if (value.type === 'finish') {
                if (value.finishReason === 'error')
                    throw new Error(
                        'The provider failed to complete the response.'
                    )
                const usage = value.totalUsage
                emit({
                    type: 'update',
                    resultId,
                    textDelta: pendingText,
                    reasoningDelta: pendingReasoning || undefined,
                    metrics: streamMetrics(
                        start,
                        now,
                        firstToken,
                        estimateTokens(text + reasoning),
                        {
                            inputTokens: usage.inputTokens,
                            outputTokens: usage.outputTokens,
                            reasoningTokens:
                                usage.outputTokenDetails?.reasoningTokens
                        },
                        model.pricing
                    ),
                    isFinal: true
                })
                finished = true
                pendingText = ''
                pendingReasoning = ''
            } else if (
                now - lastUpdate >= 50 &&
                (pendingText || pendingReasoning)
            ) {
                emit({
                    type: 'update',
                    resultId,
                    textDelta: pendingText,
                    reasoningDelta: pendingReasoning || undefined,
                    metrics: streamMetrics(
                        start,
                        now,
                        firstToken,
                        estimateTokens(text + reasoning)
                    ),
                    isFinal: false
                })
                pendingText = ''
                pendingReasoning = ''
                lastUpdate = now
            }
        }
        if (!finished)
            throw new Error('The response stream ended before completion.')
    } finally {
        reader.releaseLock()
    }
}
