import {
    wrapLanguageModel,
    extractReasoningMiddleware,
    simulateStreamingMiddleware,
    defaultSettingsMiddleware
} from 'ai'

export type MiddlewareType =
    | 'extract-reasoning'
    | 'simulate-streaming'
    | 'default-settings'

export interface MiddlewareConfig {
    type: MiddlewareType
    enabled: boolean
    options?: Record<string, unknown>
}

export const DEFAULT_MIDDLEWARE_CONFIGS: MiddlewareConfig[] = [
    {
        type: 'extract-reasoning',
        enabled: false,
        options: { tagName: 'think' }
    },
    {
        type: 'simulate-streaming',
        enabled: false
    }
]

export {
    wrapLanguageModel,
    extractReasoningMiddleware,
    simulateStreamingMiddleware,
    defaultSettingsMiddleware
}
