import type { StreamRequest, StreamEvent } from '../streaming/protocol'
import { DecisionError } from '../errors'

export async function executeGeneration(
    { model, messages, resultId, sessionId }: StreamRequest,
    emit: (event: StreamEvent) => void,
    controller: AbortController
) {
    try {
        if (model.mode === 'decision' || model.provider === 'typesafe') {
            const { executeDecision } =
                await import('@/features/decisions/execute')
            controller.signal.throwIfAborted()
            await executeDecision(
                model,
                messages,
                resultId,
                emit,
                controller.signal
            )
        } else if (model.mode === 'image') {
            const {
                generateImage,
                buildImageResponse,
                extractPromptFromMessages
            } = await import('./imageGeneration')
            controller.signal.throwIfAborted()
            const start = performance.now()
            const { text, imageUrls } = await generateImage(
                model,
                extractPromptFromMessages(messages),
                controller.signal
            )
            const duration = performance.now() - start
            emit({
                type: 'update',
                resultId,
                textDelta: buildImageResponse(text, imageUrls),
                metrics: {
                    ttft: duration,
                    totalDuration: duration,
                    tps: 0,
                    tokenCount: 0
                },
                isFinal: true
            })
        } else {
            const { streamModel } = await import('../streaming/stream')
            controller.signal.throwIfAborted()
            await streamModel(
                model,
                messages,
                resultId,
                emit,
                controller.signal,
                sessionId
            )
        }
        emit({ type: 'done', resultId })
    } catch (error) {
        const status =
            error && typeof error === 'object' && 'statusCode' in error
                ? error.statusCode
                : undefined
        emit({
            type: 'error',
            resultId,
            error:
                error instanceof DecisionError
                    ? error.message
                    : typeof status === 'number'
                      ? `Provider request failed (HTTP ${status}).`
                      : 'Generation failed. Check provider settings, network access and timeouts.'
        })
    }
}
