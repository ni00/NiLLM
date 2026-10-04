import { describe, expect, it } from 'vitest'
import { estimateTokens, streamMetrics } from './metrics'
import { toModelMessages } from './messages'
describe('stream measurements', () => {
    it('prefers exact API usage even when the heuristic overestimates', () => {
        const metrics = streamMetrics(
            0,
            2100,
            100,
            1000,
            { inputTokens: 20, outputTokens: 10 },
            { input: 1, output: 2 }
        )
        expect(metrics.tokenCount).toBe(10)
        expect(metrics.tps).toBe(5)
        expect(metrics.tokenSource).toBe('api')
        expect(metrics.cost).toBe(0.00004)
    })
    it('preserves zero output usage and distinguishes estimates', () => {
        expect(
            streamMetrics(0, 100, undefined, 20, { outputTokens: 0 }).tokenCount
        ).toBe(0)
        expect(streamMetrics(0, 100, undefined, 20).tokenSource).toBe(
            'estimated'
        )
        expect(estimateTokens('abcd')).toBe(1)
        expect(estimateTokens('你好')).toBe(3)
    })
    it('converts legacy image markers to SDK 7 file parts while preserving text', () => {
        const messages = toModelMessages([
            {
                role: 'user',
                content:
                    'Look <<<<IMAGE_START>>>>data:image/png;base64,aGVsbG8=<<<<IMAGE_END>>>> now'
            }
        ])
        expect(messages[0].content).toEqual([
            { type: 'text', text: 'Look ' },
            {
                type: 'file',
                data: 'data:image/png;base64,aGVsbG8=',
                mediaType: 'image/png'
            },
            { type: 'text', text: ' now' }
        ])
    })
})
