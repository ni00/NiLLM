import type { GenerationWorkerRequest } from '../streaming/protocol'
import { executeGeneration } from './generate'

const requests = new Map<string, AbortController>()
self.onmessage = async ({ data }: MessageEvent<GenerationWorkerRequest>) => {
    if (data.type === 'cancel') {
        requests.get(data.requestId)?.abort()
        return
    }
    const { requestId } = data
    const controller = new AbortController()
    requests.set(requestId, controller)
    try {
        await executeGeneration(
            data,
            (event) => self.postMessage({ ...event, requestId }),
            controller
        )
    } finally {
        requests.delete(requestId)
    }
}
