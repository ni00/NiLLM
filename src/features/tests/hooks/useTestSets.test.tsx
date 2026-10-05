import {
    act,
    render,
    renderHook,
    screen,
    waitFor
} from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { useAppStore, storeHydration } from '@/lib/store'
import { useTestSets } from './useTestSets'

function findSet(name: string) {
    return useAppStore.getState().testSets.find((s) => s.name === name)
}

describe('useTestSets scoring rules', () => {
    afterEach(() => {
        const state = useAppStore.getState()
        for (const set of state.testSets) {
            if (
                set.name.startsWith('scoring-test-') ||
                set.name === 'scoring-import'
            ) {
                state.deleteTestSet(set.id)
            }
        }
    })

    it('preserves legacy expected answers as exact through edit and save', async () => {
        await storeHydration
        act(() => {
            useAppStore.getState().addTestSet({
                id: 'scoring-test-legacy',
                name: 'scoring-test-legacy',
                cases: [
                    { id: 'c1', prompt: 'Say OK', expected: 'OK' },
                    { id: 'c2', prompt: 'Unscored' }
                ],
                createdAt: 1
            })
        })

        const { result } = renderHook(() => useTestSets())
        const stored = findSet('scoring-test-legacy')!
        act(() => result.current.openEditModal(stored))

        const [legacy, unscored] = result.current.editForm.cases
        expect(legacy.expected).toBe('OK')
        expect(legacy.evaluation).toBeUndefined()
        expect(unscored.expected).toBeUndefined()
        expect(unscored.evaluation).toBeUndefined()

        act(() => {
            result.current.updateCase(unscored.id, {
                expected: '{"n":1}',
                evaluation: { type: 'json' }
            })
        })
        act(() => result.current.saveTestSet())

        const saved = findSet('scoring-test-legacy')!.cases
        expect(saved[0]).toEqual({ id: 'c1', prompt: 'Say OK', expected: 'OK' })
        expect(saved[1]).toEqual({
            id: 'c2',
            prompt: 'Unscored',
            expected: '{"n":1}',
            evaluation: { type: 'json' }
        })
    })

    it('rejects saving blank contains and invalid JSON rules', async () => {
        await storeHydration
        act(() => {
            useAppStore.getState().addTestSet({
                id: 'scoring-test-invalid',
                name: 'scoring-test-invalid',
                cases: [{ id: 'c1', prompt: 'p' }],
                createdAt: 1
            })
        })

        const { result } = renderHook(() => useTestSets())
        const stored = findSet('scoring-test-invalid')!
        act(() => result.current.openEditModal(stored))

        act(() => {
            result.current.updateCase('c1', {
                expected: '   ',
                evaluation: { type: 'contains' }
            })
        })
        act(() => result.current.saveTestSet())
        expect(findSet('scoring-test-invalid')!.cases[0]).toEqual({
            id: 'c1',
            prompt: 'p'
        })

        act(() => {
            result.current.updateCase('c1', {
                expected: '{not json',
                evaluation: { type: 'json' }
            })
        })
        act(() => result.current.saveTestSet())
        expect(findSet('scoring-test-invalid')!.cases[0]).toEqual({
            id: 'c1',
            prompt: 'p'
        })
    })

    it('imports legacy string/object cases and rejects invalid rules', async () => {
        await storeHydration
        const { result } = renderHook(() => useTestSets())
        const user = userEvent.setup()
        render(
            <input
                type="file"
                aria-label="test import"
                onChange={(event) =>
                    void result.current.handleFileChange(event)
                }
            />
        )
        const input = screen.getByLabelText('test import')
        const payload = JSON.stringify({
            name: 'scoring-import',
            cases: [
                'plain legacy prompt',
                { prompt: 'object prompt', expected: 'OK' },
                {
                    prompt: 'bad json',
                    expected: '{oops',
                    evaluation: { type: 'json' }
                }
            ]
        })
        const file = new File([payload], 'set.json', {
            type: 'application/json'
        })

        await user.upload(input, file)
        await waitFor(() => expect(result.current.importError).not.toBeNull())
        expect(findSet('scoring-import')).toBeUndefined()

        const valid = JSON.stringify({
            name: 'scoring-import',
            cases: [
                'plain legacy prompt',
                { prompt: 'object prompt', expected: 'OK' },
                {
                    prompt: 'json prompt',
                    expected: '{"n":1}',
                    evaluation: { type: 'json' }
                }
            ]
        })
        await user.upload(
            input,
            new File([valid], 'set.json', { type: 'application/json' })
        )
        await waitFor(() => expect(result.current.importError).toBeNull())
        const cases = findSet('scoring-import')!.cases
        expect(cases[0]).toEqual({
            id: cases[0].id,
            prompt: 'plain legacy prompt'
        })
        expect(cases[1].expected).toBe('OK')
        expect(cases[1].evaluation).toBeUndefined()
        expect(cases[2]).toEqual({
            id: cases[2].id,
            prompt: 'json prompt',
            expected: '{"n":1}',
            evaluation: { type: 'json' }
        })
    })
})
