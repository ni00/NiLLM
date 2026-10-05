import { describe, expect, it } from 'vitest'
import { model } from '@/test/fixtures'
import { captureModelSnapshot } from './snapshots'

describe('request identity snapshots', () => {
    it('freezes reference prices for manually configured official models', async () => {
        const original = model('local', { providerId: 'deepseek-flash' })
        const snapshot = await captureModelSnapshot(original)
        expect(snapshot.pricing).toEqual({
            input: 0.15,
            output: 0.6,
            cacheRead: 0.003
        })
        expect(original.pricing).toBeUndefined()
    })
    it('freezes identity and nested capabilities before asynchronous work', async () => {
        const original = model('a', {
            capabilities: { unsupportedParameters: ['temperature'] },
            pricing: { input: 1, output: 2 }
        })
        const pending = captureModelSnapshot(original)
        original.name = 'Changed'
        original.capabilities!.unsupportedParameters!.push('topP')
        original.pricing!.input = 99
        const snapshot = await pending
        expect(snapshot.name).toBe('A')
        expect(snapshot.capabilities!.unsupportedParameters).toEqual([
            'temperature'
        ])
        expect(snapshot.pricing!.input).toBe(1)
        original.capabilities!.unsupportedParameters!.push('seed')
        expect(snapshot.capabilities!.unsupportedParameters).toEqual([
            'temperature'
        ])
    })
})
