import { createStore } from 'zustand/vanilla'
import { describe, expect, it } from 'vitest'
import { createAppState } from './index'

describe('model state', () => {
    it('removes deleted models from arena selection', () => {
        const store = createStore(createAppState)
        store.getState().deleteModel('gpt-4o')
        expect(store.getState().activeModelIds).not.toContain('gpt-4o')
        expect(store.getState().models.some((m) => m.id === 'gpt-4o')).toBe(
            false
        )
    })
    it('bulk-adds unique IDs and refuses invalid or disabled selections', () => {
        const store = createStore(createAppState)
        const first = store.getState().models[0]
        store.getState().addModels([
            { ...first, id: 'new' },
            { ...first, id: 'new' }
        ])
        expect(
            store.getState().models.filter((m) => m.id === 'new')
        ).toHaveLength(1)
        store.getState().toggleModelActivation('missing')
        expect(store.getState().activeModelIds).not.toContain('missing')
        store.getState().setModelGroupActive(['new', 'missing'], true)
        expect(store.getState().activeModelIds).toContain('new')
        expect(store.getState().activeModelIds).not.toContain('missing')
    })
    it('ignores invalid reorder indexes', () => {
        const store = createStore(createAppState)
        const original = store.getState().models
        store.getState().reorderModels(-1, 99)
        expect(store.getState().models).toBe(original)
    })
    it('preserves model settings when reordering', () => {
        const store = createStore(createAppState)
        const original = store.getState().models[0]
        store.getState().reorderModels(0, 1)
        expect(store.getState().models[1]).toBe(original)
    })
    it('imports existing IDs without replacing user configuration', () => {
        const store = createStore(createAppState)
        const original = store.getState().models[0]
        store.getState().importModels([{ ...original, name: 'Replacement' }])
        expect(store.getState().models[0]).toBe(original)
    })
})
