import type { StreamRequest, StreamEvent } from '../streaming/protocol'
import { streamModel } from '../streaming/stream'
import {
    generateImage,
    buildImageResponse,
    extractPromptFromMessages
} from './imageGeneration'

const emit = (event: StreamEvent) => self.postMessage(event)
self.onmessage = async ({ data }: MessageEvent<StreamRequest>) => {
    const { model, messages, resultId } = data
    try {
        if (model.mode === 'image') {
            const start = performance.now()
            const { text, imageUrls } = await generateImage(
                model,
                extractPromptFromMessages(messages)
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
        } else await streamModel(model, messages, resultId, emit)
        emit({ type: 'done', resultId })
    } catch (error) {
        // Never post SDK error objects: request headers may contain credentials.
        const status =
            error && typeof error === 'object' && 'statusCode' in error
                ? error.statusCode
                : undefined
        emit({
            type: 'error',
            resultId,
            error:
                typeof status === 'number'
                    ? `Provider request failed (HTTP ${status}).`
                    : 'Generation failed. Check provider settings, network access and timeouts.'
        })
    }
}
