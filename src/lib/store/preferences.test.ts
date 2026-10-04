import { createStore } from 'zustand/vanilla'
import { describe, expect, it } from 'vitest'
import { createAppState } from './index'
import { attachPersistence } from './persistence'

describe('application preferences', () => {
    it('restores old snapshots and preserves their language and content', async () => {
        const store = createStore(createAppState)
        const persistence = attachPersistence(store, {
            getItem: async () =>
                JSON.stringify({
                    state: { language: 'ja', promptTemplates: [] }
                }),
            setItem: () => {},
            removeItem: () => {}
        })
        await persistence.hydrated
        expect(store.getState()).toMatchObject({
            language: 'ja',
            benchmarkLanguage: null,
            theme: 'system',
            promptTemplates: []
        })
        persistence.dispose()
    })

    it('round-trips preferences in a backup, including a null test-language override', async () => {
        const source = createStore(createAppState)
        source.getState().setLanguage('zh')
        source.getState().setTheme('dark')
        source.getState().updateGlobalConfig({ maxConcurrent: 8 })
        const destination = createStore(createAppState)
        destination.getState().setBenchmarkLanguage('ja')
        await destination.getState().importData(source.getState().exportData())
        expect(destination.getState()).toMatchObject({
            language: 'zh',
            theme: 'dark',
            benchmarkLanguage: null,
            globalConfig: { maxConcurrent: 8 }
        })
        await destination
            .getState()
            .importData(JSON.stringify({ promptTemplates: [] }))
        expect(destination.getState()).toMatchObject({
            language: 'zh',
            theme: 'dark',
            benchmarkLanguage: null
        })
    })

    it('rejects malformed preferences without overwriting any existing data', async () => {
        const store = createStore(createAppState)
        const models = store.getState().models
        await expect(
            store
                .getState()
                .importData(JSON.stringify({ models: [], theme: 'invalid' }))
        ).rejects.toThrow('Invalid backup')
        expect(store.getState().models).toBe(models)
        expect(store.getState().theme).toBe('system')
    })
})
