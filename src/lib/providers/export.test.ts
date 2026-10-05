import { describe, expect, it } from 'vitest'
import { model } from '@/test/fixtures'
import { sanitizeModels } from './export'

describe('model export sanitization', () => {
    it('removes secrets from URL credentials, queries and fragments', () => {
        const original = model('a', {
            apiKey: 'fake-key',
            baseURL: 'https://user:password@example.com/v1?key=fake#secret'
        })
        expect(sanitizeModels([original])[0]).toEqual({
            ...original,
            apiKey: undefined,
            baseURL: 'https://example.com/v1'
        })
        expect(original.apiKey).toBe('fake-key')
        expect(original.baseURL).toContain('?key=fake')
    })

    it.each(['invalid?key=secret', 'javascript:secret'])(
        'omits unsafe endpoint %s',
        (baseURL) => {
            expect(
                sanitizeModels([model('a', { baseURL })])[0].baseURL
            ).toBeUndefined()
        }
    )
})
