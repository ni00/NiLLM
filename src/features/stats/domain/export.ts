import type { ModelStat } from './statistics'

const columns: Array<[string, keyof ModelStat]> = [
    ['Model', 'name'],
    ['Provider', 'provider'],
    ['Mode', 'mode'],
    ['Avg speed (tokens/s)', 'avgTPS'],
    ['Avg TTFT (ms)', 'avgTTFT'],
    ['Median TTFT (ms)', 'medianTTFT'],
    ['P95 TTFT (ms)', 'p95TTFT'],
    ['Avg duration (ms)', 'avgDuration'],
    ['Avg rating (1-5)', 'avgRating'],
    ['Successful tokens (API or estimate)', 'totalTokens'],
    ['Input tokens (API)', 'inputTokens'],
    ['Output tokens (API)', 'outputTokens'],
    ['Requests', 'totalCount'],
    ['Completed', 'completedCount'],
    ['Failed', 'errorCount'],
    ['Cancelled', 'cancelledCount'],
    ['Pending', 'pendingCount'],
    ['Success rate (%)', 'successRate'],
    ['Known cost (USD)', 'totalCost'],
    ['Priced samples', 'costSampleCount'],
    ['Estimated samples', 'estimatedCount']
]
export function csvCell(value: string | number) {
    // Prevent spreadsheet formula execution while preserving CSV quoting.
    const text =
        typeof value === 'string' && /^[\s]*[=+@-]/.test(value)
            ? `'${value}`
            : String(value)
    return `"${text.replace(/"/g, '""')}"`
}
export function exportStatsCSV(stats: ModelStat[]) {
    return (
        '\uFEFF' +
        [
            columns.map(([label]) => csvCell(label)).join(','),
            ...stats.map((stat) =>
                columns
                    .map(([, key]) => {
                        if (key === 'totalCost' && !stat.costSampleCount)
                            return '""'
                        if (
                            (key === 'avgTTFT' ||
                                key === 'p95TTFT' ||
                                key === 'medianTTFT') &&
                            !stat.latencySampleCount
                        )
                            return '""'
                        if (key === 'avgTPS' && !stat.speedSampleCount)
                            return '""'
                        if (key === 'avgRating' && !stat.ratingCount)
                            return '""'
                        return csvCell(stat[key])
                    })
                    .join(',')
            )
        ].join('\r\n')
    )
}
