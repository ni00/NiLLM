import { StateCreator } from 'zustand'
import { GenerationConfig } from '@/lib/types'

const DEFAULT_CONFIG: GenerationConfig = {
    temperature: 0.7,
    maxTokens: 100000,
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
    readTimeout: 30000
}

export interface ConfigSlice {
    globalConfig: GenerationConfig
    updateGlobalConfig: (updates: Partial<GenerationConfig>) => void
    language: 'en' | 'zh' | 'ja'
    setLanguage: (lang: 'en' | 'zh' | 'ja') => void
}

export const createConfigSlice: StateCreator<
    ConfigSlice,
    [],
    [],
    ConfigSlice
> = (set) => ({
    globalConfig: DEFAULT_CONFIG,
    language: 'en' as 'en' | 'zh' | 'ja',

    updateGlobalConfig: (updates) =>
        set((state) => ({
            globalConfig: { ...state.globalConfig, ...updates }
        })),

    setLanguage: (language) => set({ language })
})
