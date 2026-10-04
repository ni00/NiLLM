import { describe, expect, it } from 'vitest'
import { translate } from './index'

describe('interface translations', () => {
    it('interpolates user content literally, including replacement-pattern characters', () => {
        expect(
            translate('zh', 'Select {name}', { name: 'Models $& {count}' })
        ).toBe('选择 Models $& {count}')
        expect(translate('ja', 'Added {count} models.', { count: 12 })).toBe(
            '12 件のモデルを追加しました。'
        )
        expect(translate('en', 'Added {count} models.', { count: 12 })).toBe(
            'Added 12 models.'
        )
    })
    it('leaves unknown provider messages and prompt variables untouched', () => {
        expect(translate('zh', 'Provider-specific error')).toBe(
            'Provider-specific error'
        )
        expect(translate('zh', 'constructor')).toBe('constructor')
        expect(translate('ja', '{constructor}')).toBe('{constructor}')
        expect(
            translate(
                'ja',
                'Write a story about {{topic}} in the style of {{author}}...'
            )
        ).toContain('{{topic}}')
    })
})
