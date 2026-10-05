import type {
    GenerationWorkerRequest,
    StreamEvent
} from '../streaming/protocol'
import { DecisionError } from '@/features/decisions/errors'

const requests = new Map<string, AbortController>()
self.onmessage = async ({ data }: MessageEvent<GenerationWorkerRequest>) => {
    if (data.type === 'cancel') {
        requests.get(data.requestId)?.abort()
        return
    }
    const { model, messages, resultId, requestId } = data
    const controller = new AbortController()
    requests.set(requestId, controller)
    const emit = (event: StreamEvent) =>
        self.postMessage({ ...event, requestId })
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
                controller.signal
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
    } finally {
        requests.delete(requestId)
    }
}
