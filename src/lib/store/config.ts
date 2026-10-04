import type { AppState } from './index'
import { StateCreator } from 'zustand'
import { GenerationConfig } from '@/lib/types'

const DEFAULT_CONFIG: GenerationConfig = {
    maxConcurrent: 4,
    temperature: 0.7,
    maxTokens: 4096,
    topP: 0.9,
    topK: undefined,
    frequencyPenalty: 0,
    presencePenalty: 0,
    repetitionPenalty: undefined,
    seed: undefined,
    stopSequences: undefined,
    minP: undefined,
    systemPrompt: 'You are a helpful AI assistant.',
    connectTimeout: 15000,
    readTimeout: 30000,
    timeout: {
        totalMs: 120000,
        stepMs: 60000,
        chunkMs: 10000
    },
    telemetry: {
        isEnabled: false,
        recordInputs: true,
        recordOutputs: true
    }
}

export interface ConfigSlice {
    globalConfig: GenerationConfig
    updateGlobalConfig: (updates: Partial<GenerationConfig>) => void
    language: 'en' | 'zh' | 'ja'
    setLanguage: (lang: 'en' | 'zh' | 'ja') => void
}

export const createConfigSlice: StateCreator<AppState, [], [], ConfigSlice> = (
    set
) => ({
    globalConfig: DEFAULT_CONFIG,
    language: 'en' as 'en' | 'zh' | 'ja',

    updateGlobalConfig: (updates) =>
        set((state) => ({
            globalConfig: { ...state.globalConfig, ...updates }
        })),

    setLanguage: (language) => set({ language })
})
