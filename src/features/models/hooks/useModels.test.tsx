import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useAppStore, storeHydration } from '@/lib/store'
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
