import { createStore } from 'zustand/vanilla'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createAppState, storeHydration } from './index'
import { attachPersistence, type PersistenceController } from './persistence'
import { indexedDBStorage } from './indexeddb-storage'

const controllers: PersistenceController[] = []

beforeEach(async () => {
    await storeHydration
    await indexedDBStorage.commit(
        {},
        Object.keys(await indexedDBStorage.dump())
    )
})

afterEach(async () => {
    for (const controller of controllers) {
        await controller.flush()
        controller.dispose()
    }
    controllers.length = 0
})

async function workspace() {
    const store = createStore(createAppState)
    const persistence = attachPersistence(store, indexedDBStorage)
    controllers.push(persistence)
    await persistence.hydrated
    return { store, persistence }
}

describe('application preferences', () => {
    it('migrates language and an intentionally empty prompt library through IndexedDB', async () => {
        await indexedDBStorage.setItem(
            'nillm-storage',
            JSON.stringify({
                state: { language: 'ja', promptTemplates: [] },
                version: 0
            })
        )
        const { store } = await workspace()
        expect(store.getState().language).toBe('ja')
        expect(store.getState().promptTemplates).toEqual([])
        const { store: restored } = await workspace()
        expect(restored.getState().language).toBe('ja')
        expect(restored.getState().promptTemplates).toEqual([])
        expect(await indexedDBStorage.getItem('nillm-storage')).toBeNull()
    })

    it('roundtrips preferences and explicit null benchmark language, preserving omitted domains', async () => {
        const { store: source, persistence } = await workspace()
        source.getState().setLanguage('zh')
        source.getState().setTheme('dark')
        source.getState().setDensity('compact')
        source.getState().updateGlobalConfig({ maxConcurrent: 8 })
        await persistence.flush()
        const { store: destination } = await workspace()
        destination.getState().setBenchmarkLanguage('ja')
        await destination.getState().importData(source.getState().exportData())
        expect(destination.getState()).toMatchObject({
            language: 'zh',
            theme: 'dark',
            density: 'compact',
            benchmarkLanguage: null,
            globalConfig: { maxConcurrent: 8 }
        })
        await destination
            .getState()
            .importData(JSON.stringify({ promptTemplates: [] }))
        const { store: restored } = await workspace()
        expect(restored.getState()).toMatchObject({
            language: 'zh',
            theme: 'dark',
            density: 'compact',
            benchmarkLanguage: null,
            promptTemplates: [],
            globalConfig: { maxConcurrent: 8 }
        })
    })

    it('rejects malformed preferences without changing memory or durable records', async () => {
        const { store, persistence } = await workspace()
        store.getState().setTheme('dark')
        await persistence.flush()
        const models = store.getState().models
        const original = await indexedDBStorage.dump()
        await expect(
            store.getState().importData(
                JSON.stringify({
                    models: [],
                    theme: 'invalid'
                })
            )
        ).rejects.toThrow('Invalid backup')
        expect(store.getState().models).toBe(models)
        expect(store.getState().theme).toBe('dark')
        expect(await indexedDBStorage.dump()).toEqual(original)
    })
})
