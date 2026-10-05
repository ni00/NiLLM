import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import type { ModelPricing } from '@/lib/types'
import { ModelPricingEditor } from './ModelPricingEditor'
import { getReferenceModelPreset } from '@/lib/providers/presets'

afterEach(cleanup)
describe('model price configuration', () => {
    it('shows automatic reference prices without persisting them as user overrides', () => {
        const changed = vi.fn()
        render(
            <ModelPricingEditor
                reference={getReferenceModelPreset({
                    provider: 'deepseek',
                    providerId: 'deepseek-flash'
                })}
                onChange={changed}
            />
        )
        expect(
            (screen.getByLabelText('Input price') as HTMLInputElement)
                .placeholder
        ).toBe('Auto: 0.15')
        expect(
            (screen.getByLabelText('Input price') as HTMLInputElement).value
        ).toBe('')
        expect(screen.getByText(/Peak rates are twice as high/)).toBeTruthy()
        expect(changed).not.toHaveBeenCalled()
    })
    it('preserves partially entered prices, accepts zero and clears all fields', () => {
        const changed = vi.fn()
        function Editor() {
            const [value, setValue] = useState<ModelPricing>()
            return (
                <ModelPricingEditor
                    value={value}
                    onChange={(next) => {
                        changed(next)
                        setValue(next)
                    }}
                />
            )
        }
        render(<Editor />)
        fireEvent.change(screen.getByLabelText('Input price'), {
            target: { value: '2' }
        })
        expect(
            (screen.getByLabelText('Input price') as HTMLInputElement).value
        ).toBe('2')
        expect(changed).toHaveBeenLastCalledWith(undefined)
        fireEvent.change(screen.getByLabelText('Output price'), {
            target: { value: '0' }
        })
        fireEvent.change(screen.getByLabelText('Cache read price'), {
            target: { value: '0.2' }
        })
        expect(changed).toHaveBeenLastCalledWith({
            input: 2,
            output: 0,
            cacheRead: 0.2
        })
        fireEvent.change(screen.getByLabelText('Cache write price'), {
            target: { value: '-1' }
        })
        expect(changed).toHaveBeenLastCalledWith(undefined)
        fireEvent.click(screen.getByRole('button', { name: 'Clear prices' }))
        expect(changed).toHaveBeenLastCalledWith(undefined)
        expect(
            (screen.getByLabelText('Input price') as HTMLInputElement).value
        ).toBe('')
    })
    it('refreshes every price when a different model preset is selected', () => {
        const { rerender } = render(
            <ModelPricingEditor
                value={{ input: 2, output: 4, cacheRead: 0.2 }}
                onChange={() => {}}
            />
        )
        rerender(
            <ModelPricingEditor
                value={{ input: 1, output: 3, cacheWrite: 1.25 }}
                onChange={() => {}}
            />
        )
        expect(
            (screen.getByLabelText('Input price') as HTMLInputElement).value
        ).toBe('1')
        expect(
            (screen.getByLabelText('Cache read price') as HTMLInputElement)
                .value
        ).toBe('')
        expect(
            (screen.getByLabelText('Cache write price') as HTMLInputElement)
                .value
        ).toBe('1.25')
    })
})
