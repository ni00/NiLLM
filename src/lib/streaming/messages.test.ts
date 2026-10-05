import { describe, expect, it } from 'vitest'
import { hasImageInput, toModelMessages } from './messages'

describe('image marker detection', () => {
    it('only gates complete user image markers and leaves incomplete markers as text', () => {
        const incomplete = [
            {
                role: 'user' as const,
                content: 'literal <<<<IMAGE_START>>>> without closing marker'
            }
        ]
        expect(hasImageInput(incomplete)).toBe(false)
        expect(toModelMessages(incomplete)).toEqual([
            {
                role: 'user',
                content: [{ type: 'text', text: incomplete[0].content }]
            }
        ])
        const content =
            'before <<<<IMAGE_START>>>>data:image/png;base64,YQ==<<<<IMAGE_END>>>> after'
        const messages = [{ role: 'user' as const, content }]
        expect(hasImageInput(messages)).toBe(true)
        expect(hasImageInput(messages)).toBe(true)
        expect(toModelMessages(messages)).toEqual([
            {
                role: 'user',
                content: [
                    { type: 'text', text: 'before ' },
                    {
                        type: 'file',
                        data: 'data:image/png;base64,YQ==',
                        mediaType: 'image/png'
                    },
                    { type: 'text', text: ' after' }
                ]
            }
        ])
        expect(
            hasImageInput([
                { role: 'system', content },
                { role: 'assistant', content }
            ])
        ).toBe(false)
    })
})
