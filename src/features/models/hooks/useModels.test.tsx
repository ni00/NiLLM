import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore, storeHydration } from '@/lib/store'
import { applyModelPreset, getModelPresets } from '@/lib/providers/presets'
import { useModels } from './useModels'

describe('model page subscriptions', () => {
    it('does not rerender for unrelated streaming changes', async () => {
        await storeHydration
        let renders = 0
        const { result } = renderHook(() => {
            renders++
            return useModels()
        })
        const initial = renders
        act(() => {
            for (let i = 0; i < 100; i++)
                useAppStore
                    .getState()
                    .setStreamingData('r', { response: String(i) })
        })
        expect(renders).toBe(initial)
        act(() =>
            useAppStore.getState().addModel({
                id: 'new-selector-test',
                name: 'New',
                provider: 'custom',
                enabled: true
            })
        )
        expect(
            result.current.models.some(
                (model) => model.id === 'new-selector-test'
            )
        ).toBe(true)
        expect(renders).toBe(initial + 1)
    })
})

describe('saving model presets', () => {
    beforeEach(async () => {
        await storeHydration
        useAppStore.setState({ models: [], sessions: [], activeModelIds: [] })
    })
    it.each(['groq', 'vercel'] as const)(
        'retains all %s preset fields in a manually added model',
        (provider) => {
            const preset = getModelPresets(provider).find((entry) =>
                provider === 'vercel'
                    ? entry.mode === 'decision'
                    : entry.mode === 'chat'
            )!
            const { result } = renderHook(() => useModels())
            act(() =>
                result.current.setNewModel(
                    applyModelPreset({ provider, enabled: true }, preset)
                )
            )
            act(() => result.current.handleSaveModel())
            const saved = useAppStore.getState().models[0]
            expect(saved).toMatchObject({
                provider,
                providerId: preset.id,
                name: preset.name,
                mode: preset.mode
            })
            expect(saved.config).toEqual(preset.config)
            expect(saved.capabilities).toEqual(preset.capabilities)
            expect(saved.pricing).toEqual(preset.pricing)
            expect(saved.decisionProtocol).toBe(preset.decisionProtocol)
        }
    )
})
