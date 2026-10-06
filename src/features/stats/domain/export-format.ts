import { formatUSD } from './export-csv'

export const DASH = '—'

export function escapeBase(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

export function mdEscapeCell(value: string): string {
    return escapeBase(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

export function mdTable(headers: string[], rows: string[][]): string {
    return [
        `| ${headers.join(' | ')} |`,
        `| ${headers.map(() => '---').join(' | ')} |`,
        ...rows.map((row) => `| ${row.join(' | ')} |`)
    ].join('\n')
}

export function mdFence(text: string): string {
    const longestRun = Math.max(
        0,
        ...text.split('\n').map((line) => {
            const match = line.match(/^(`+)/)
            return match ? match[1].length : 0
        })
    )
    const fence = '`'.repeat(Math.max(3, longestRun + 1))
    return `${fence}\n${text}\n${fence}`
}

export function mdMetric(
    value: number | undefined,
    samples: number | undefined,
    format: (value: number) => string = String
): string {
    if (!samples || value === undefined) return DASH
    return mdEscapeCell(format(value))
}

export function mdCost(cost: number | undefined, samples: number | undefined) {
    if (!samples || cost === undefined) return DASH
    return mdEscapeCell(`${formatUSD(cost)} (${cost} USD)`)
}

export function mdPercent(value: number | undefined, samples?: number) {
    return mdMetric(
        value,
        samples ?? (value === undefined ? 0 : 1),
        (v) => `${v.toFixed(1)}%`
    )
}
