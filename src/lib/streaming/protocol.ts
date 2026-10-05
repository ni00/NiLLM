import type { BenchmarkMetrics, LLMModel, Message } from '@/lib/types'

export interface StreamRequest {
    model: LLMModel
    messages: Message[]
    resultId: string
}
export type GenerationWorkerRequest =
    | (StreamRequest & { type: 'generate'; requestId: string })
    | { type: 'cancel'; requestId: string }
export type GenerationWorkerEvent = StreamEvent & { requestId: string }
export type StreamEvent =
    | { type: 'start' | 'done'; resultId: string }
    | { type: 'error'; resultId: string; error: string }
    | {
          type: 'update'
          resultId: string
          textDelta: string
          reasoningDelta?: string
          metrics: BenchmarkMetrics
          isFinal: boolean
      }
