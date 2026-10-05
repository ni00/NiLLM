import { expect, it } from 'vitest'
import { formatStatCost, formatStatNumber } from './display'

it('formats finite statistics with at most two decimal places', () => {
    expect(formatStatNumber(52.649536448774064)).toBe('52.65')
    expect(formatStatNumber(822.987654)).toBe('822.99')
    expect(formatStatNumber(12000)).toBe('12,000')
    expect(formatStatNumber(0)).toBe('0')
    expect(formatStatNumber(undefined)).toBe('—')
    expect(formatStatNumber(NaN)).toBe('—')
    expect(formatStatNumber(Infinity)).toBe('—')
})

it('does not turn a small positive bill into a free request', () => {
    expect(formatStatCost(0.000001)).toBe('<$0.01')
    expect(formatStatCost(0)).toBe('$0.00')
    expect(formatStatCost(12.345678)).toBe('$12.35')
    expect(formatStatCost(undefined)).toBe('—')
    expect(formatStatCost(-1)).toBe('—')
})
