import { createStore } from 'zustand/vanilla'
import { describe, expect, it } from 'vitest'
import { createAppState } from './index'

describe('session state', () => {
    it('updates one result without mutating another session', () => {
        const store = createStore(createAppState)
        const first = store.getState().createSession('First', ['a'])
        const second = store.getState().createSession('Second', ['a'])
        const untouched = store.getState().sessions[0]
        store.getState().addResult(first, 'a', {
            id: 'r',
            modelId: 'a',
            prompt: 'hi',
            response: '',
            timestamp: 1,
            metrics: { ttft: 0, tps: 0, totalDuration: 0, tokenCount: 0 }
        })
        store.getState().updateResult(first, 'a', 'r', { response: 'hello' })
        expect(
            store.getState().sessions.find((s) => s.id === first)?.results.a[0]
                .response
        ).toBe('hello')
        expect(store.getState().sessions.find((s) => s.id === second)).toBe(
            untouched
        )
    })
})
