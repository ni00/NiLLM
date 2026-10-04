import { describe, expect, it } from 'vitest'
import { runConcurrent } from './concurrency'

function deferred(): [Promise<void>, () => void] {
    let resolve!: () => void
    const promise = new Promise<void>((r) => {
        resolve = r
    })
    return [promise, resolve]
}

describe('runConcurrent', () => {
    it('caps parallel in-flight tasks at the concurrency limit', async () => {
        let active = 0
        let peak = 0
        const items = Array.from({ length: 10 }, (_, i) => i)
        await runConcurrent(items, 3, async () => {
            active++
            peak = Math.max(peak, active)
            await Promise.resolve()
            active--
        })
        expect(peak).toBeLessThanOrEqual(3)
    })

    it('processes every item exactly once', async () => {
        const seen: number[] = []
        const items = Array.from({ length: 7 }, (_, i) => i)
        await runConcurrent(items, 2, async (item) => {
            seen.push(item)
        })
        expect(seen.sort((a, b) => a - b)).toEqual(items)
    })

    it('stops claiming tasks after an unexpected throw and waits for in-flight work', async () => {
        const [inFlight, finishInFlight] = deferred()
        let settledInFlight = false
        const started: string[] = []
        const task = async (name: string) => {
            started.push(name)
            if (name === 'boom') throw new Error('unexpected')
            if (name === 'slow') {
                await inFlight
                settledInFlight = true
            }
        }
        const run = runConcurrent(['boom', 'slow', 'never', 'never2'], 2, task)
        await Promise.resolve()
        await Promise.resolve()
        finishInFlight()
        await expect(run).rejects.toThrow('unexpected')
        expect(started).not.toContain('never')
        expect(started).not.toContain('never2')
        expect(settledInFlight).toBe(true)
    })

    it('completes normally when tasks report failures as outcomes', async () => {
        const outcomes: string[] = []
        await runConcurrent(['a', 'b'], 2, async (item) => {
            outcomes.push(`${item}-failed-as-value`)
        })
        expect(outcomes).toHaveLength(2)
    })
})
