import { describe, expect, it } from 'vitest'
import { cancelExperimentJudging, registerExperimentJudging } from './runtime'

describe('experiment judging registry', () => {
    it('completes immediately when nothing is registered', async () => {
        await expect(
            cancelExperimentJudging('missing')
        ).resolves.toBeUndefined()
    })

    it('aborts the batch and returns only after it settles', async () => {
        const order: string[] = []
        let release!: () => void
        const settled = new Promise<void>((resolve) => {
            release = () => {
                order.push('settled')
                resolve()
            }
        })
        const controller = new AbortController()
        const unregister = registerExperimentJudging(
            'run-1',
            controller,
            settled
        )

        const cancellation = cancelExperimentJudging('run-1').then(() => {
            order.push('cancelled-return')
        })
        await Promise.resolve()
        expect(controller.signal.aborted).toBe(true)
        expect(order).toEqual([])

        release()
        await cancellation
        expect(order).toEqual(['settled', 'cancelled-return'])
        unregister()
    })

    it('unregister detaches the batch so later cancellation is a no-op', async () => {
        const controller = new AbortController()
        let release!: () => void
        const settled = new Promise<void>((resolve) => {
            release = resolve
        })
        const unregister = registerExperimentJudging(
            'run-2',
            controller,
            settled
        )
        unregister()

        await expect(cancelExperimentJudging('run-2')).resolves.toBeUndefined()
        expect(controller.signal.aborted).toBe(false)
        release()
    })
})
