import type { AppState } from './index'
import { StateCreator } from 'zustand'
import { mergeGenerationConfig } from '@/features/benchmark/config'
import { GenerationConfig, GlobalConfigUpdate } from '@/lib/types'

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

export type AppLanguage = 'en' | 'zh' | 'ja'
export type AppTheme = 'system' | 'light' | 'dark'

export interface ConfigSlice {
    globalConfig: GenerationConfig
    updateGlobalConfig: (updates: GlobalConfigUpdate) => void
    language: AppLanguage
    setLanguage: (lang: AppLanguage) => void
    benchmarkLanguage: AppLanguage | null
    setBenchmarkLanguage: (language: AppLanguage | null) => void
    theme: AppTheme
    setTheme: (theme: AppTheme) => void
}

export const createConfigSlice: StateCreator<AppState, [], [], ConfigSlice> = (
    set
) => ({
    globalConfig: DEFAULT_CONFIG,
    language: 'en',
    benchmarkLanguage: null,
    theme: 'system',
    // Scalars assign directly (clearing an optional field unsets it); nested
    // timeout/telemetry fold through mergeGenerationConfig so sibling fields
    // never get frozen by a partial nested update.
    updateGlobalConfig: (updates) =>
        set((state) => {
            const { timeout, telemetry, ...scalars } = updates
            return {
                globalConfig: mergeGenerationConfig(
                    { ...state.globalConfig, ...scalars },
                    { timeout, telemetry }
                )
            }
        }),

    setLanguage: (language) => set({ language }),
    setBenchmarkLanguage: (benchmarkLanguage) => set({ benchmarkLanguage }),
    setTheme: (theme) => set({ theme })
})
