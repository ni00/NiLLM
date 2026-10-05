const numberFormat = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2
})
const currencyFormat = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
})

export function formatStatNumber(value: number | undefined) {
    return value !== undefined && Number.isFinite(value)
        ? numberFormat.format(value)
        : '—'
}

export function formatStatCost(value: number | undefined) {
    if (value === undefined || !Number.isFinite(value) || value < 0) return '—'
    return value > 0 && value < 0.01 ? '<$0.01' : currencyFormat.format(value)
}
