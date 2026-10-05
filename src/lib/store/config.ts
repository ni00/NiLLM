import type { AppState } from './index'
import { StateCreator } from 'zustand'
import { mergeGenerationConfig } from '@/features/benchmark/config'
import { parameterPresetSchema } from '@/lib/validation'
import {
    GenerationConfig,
    GenerationConfigPatch,
    GlobalConfigUpdate
} from '@/lib/types'

/** A saved parameter patch users can re-apply to any layer. */
export interface ParameterPreset {
    id: string
    name: string
    config: GenerationConfigPatch
    createdAt: number
    updatedAt: number
}

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
export type AppDensity = 'comfortable' | 'compact'

export interface ConfigSlice {
    globalConfig: GenerationConfig
    updateGlobalConfig: (updates: GlobalConfigUpdate) => void
    language: AppLanguage
    setLanguage: (lang: AppLanguage) => void
    benchmarkLanguage: AppLanguage | null
    setBenchmarkLanguage: (language: AppLanguage | null) => void
    theme: AppTheme
    setTheme: (theme: AppTheme) => void
    density: AppDensity
    setDensity: (density: AppDensity) => void
    parameterPresets: ParameterPreset[]
    saveParameterPreset: (preset: ParameterPreset) => void
    deleteParameterPreset: (id: string) => void
}

export const createConfigSlice: StateCreator<AppState, [], [], ConfigSlice> = (
    set
) => ({
    globalConfig: DEFAULT_CONFIG,
    language: 'en',
    benchmarkLanguage: null,
    theme: 'system',
    density: 'comfortable',
    parameterPresets: [],
    // Partial nested patches must not freeze inherited sibling fields.

    updateGlobalConfig: (updates) =>
        set((state) => {
            const { timeout, telemetry, ...scalars } = updates
            const base = { ...state.globalConfig, ...scalars }
            if (timeout) {
                const next = { ...base.timeout }
                for (const key of Object.keys(
                    timeout
                ) as (keyof typeof timeout)[]) {
                    if (timeout[key] === undefined) delete next[key]
                }
                base.timeout = Object.keys(next).length ? next : undefined
            }
            if (telemetry) {
                const next = { ...base.telemetry }
                for (const key of Object.keys(
                    telemetry
                ) as (keyof typeof telemetry)[]) {
                    if (telemetry[key] === undefined) delete next[key]
                }
                base.telemetry = Object.keys(next).length
                    ? { ...next, isEnabled: next.isEnabled ?? false }
                    : undefined
            }
            return {
                globalConfig: mergeGenerationConfig(base, {
                    timeout,
                    telemetry
                })
            }
        }),

    setLanguage: (language) => set({ language }),
    setBenchmarkLanguage: (benchmarkLanguage) => set({ benchmarkLanguage }),
    setTheme: (theme) => set({ theme }),
    setDensity: (density) => set({ density }),

    saveParameterPreset: (preset) => {
        const parsed = parameterPresetSchema.parse(preset)
        const config = structuredClone(parsed.config)
        set((state) => {
            const existing = state.parameterPresets.find(
                (candidate) => candidate.id === parsed.id
            )
            const saved: ParameterPreset = {
                ...parsed,
                config,
                createdAt: existing?.createdAt ?? parsed.createdAt,
                updatedAt: Date.now()
            }
            return {
                parameterPresets: existing
                    ? state.parameterPresets.map((candidate) =>
                          candidate.id === saved.id ? saved : candidate
                      )
                    : [...state.parameterPresets, saved]
            }
        })
    },

    deleteParameterPreset: (id) =>
        set((state) => ({
            parameterPresets: state.parameterPresets.filter(
                (preset) => preset.id !== id
            )
        }))
})
