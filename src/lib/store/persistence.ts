import type { StoreApi } from 'zustand'
import type { StateStorage } from 'zustand/middleware'
import type { AppState } from './index'

export const persistedKeys = [
    'models',
    'activeModelIds',
    'sessions',
    'activeSessionId',
    'testSets',
    'testSetOrder',
    'promptTemplates',
    'globalConfig',
    'language',
    'benchmarkLanguage',
    'theme',
    'arenaColumns',
    'arenaSortBy'
] as const
export type PersistedState = Pick<AppState, (typeof persistedKeys)[number]>
const STORAGE_KEY = 'nillm-storage'

export function pickPersistentState(state: AppState): PersistedState {
    return Object.fromEntries(
        persistedKeys.map((key) => [key, state[key]])
    ) as PersistedState
}

export function attachPersistence(
    store: StoreApi<AppState>,
    storage: StateStorage
) {
    let ready = false
    let previous = pickPersistentState(store.getState())
    let timer: ReturnType<typeof setTimeout> | undefined
    let writeQueue = Promise.resolve()
    const flush = () => {
        if (timer === undefined) return writeQueue
        clearTimeout(timer)
        timer = undefined
        const value = JSON.stringify({ state: previous, version: 0 })
        writeQueue = writeQueue
            .then(async () => {
                await storage.setItem(STORAGE_KEY, value)
            })
            .catch(() => {
                console.error(
                    'Could not save application data to local storage.'
                )
            })
        return writeQueue
    }
    const unsubscribe = store.subscribe((state) => {
        if (
            !ready ||
            !persistedKeys.some((key) => state[key] !== previous[key])
        )
            return
        previous = pickPersistentState(state)
        // Coalesce durable changes BEFORE serializing. Streaming updates do no work.
        if (timer === undefined) timer = setTimeout(flush, 200)
    })
    const hydrated = Promise.resolve().then(async () => {
        try {
            const saved = await storage.getItem(STORAGE_KEY)
            if (saved) {
                const { state } = JSON.parse(saved) as {
                    state?: Partial<PersistedState>
                }
                if (state && typeof state === 'object') {
                    const { parseBackup } = await import('../validation')
                    const validated = parseBackup(state)
                    const restored = Object.fromEntries(
                        persistedKeys
                            .filter((key) => validated[key] !== undefined)
                            .map((key) => [key, validated[key]])
                    )
                    store.setState(restored)
                    const current = store.getState()
                    store.setState({
                        activeSessionId: current.sessions.some(
                            (session) => session.id === current.activeSessionId
                        )
                            ? current.activeSessionId
                            : null,
                        activeModelIds: current.activeModelIds.filter((id) =>
                            current.models.some(
                                (model) => model.id === id && model.enabled
                            )
                        )
                    })
                }
            }
        } catch {
            console.error(
                'Could not restore application data from local storage.'
            )
        }
        previous = pickPersistentState(store.getState())
        ready = true
    })
    return {
        hydrated,
        flush,
        dispose: () => {
            unsubscribe()
            void flush()
        }
    }
}
