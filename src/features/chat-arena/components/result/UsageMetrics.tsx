import type { BenchmarkMetrics } from '@/lib/types'
import { useI18n } from '@/lib/i18n'
import { cacheHitRate, formatUsageCost } from '@/lib/usage'

type Usage = Pick<
    BenchmarkMetrics,
    | 'cost'
    | 'costSource'
    | 'inputTokens'
    | 'cacheReadTokens'
    | 'cacheWriteTokens'
>
export function UsageMetrics({
    metrics,
    className = 'flex items-center gap-1',
    coverage
}: {
    metrics: Usage
    className?: string
    coverage?: {
        costSamples: number
        cacheSamples: number
        totalSamples: number
    }
}) {
    const t = useI18n()
    const rate = cacheHitRate(metrics)
    const source =
        metrics.cost === undefined
            ? t(
                  'Cost unavailable. Set token prices in model settings to estimate it.'
              )
            : metrics.costSource === 'api'
              ? t('Cost reported by the provider (USD).')
              : metrics.costSource === 'estimated'
                ? t(
                      'Estimated from model token prices (USD), using reference prices when none are configured. Historical prices, peak/off-peak rates and other charges may differ.'
                  )
                : t(
                      'Recorded cost (USD); source unavailable for this historical result.'
                  )
    const samples = (count: number | undefined) =>
        coverage && count !== undefined
            ? ' ' +
              t('Data available for {known}/{total} requests.', {
                  known: count,
                  total: coverage.totalSamples
              })
            : ''
    const cacheInfo =
        rate === undefined
            ? t('The provider did not report usable cache data.')
            : t(
                  'Cache read {read} / input {input} tokens. Cache hit rate is weighted by input tokens.',
                  {
                      read: metrics.cacheReadTokens ?? 0,
                      input: metrics.inputTokens ?? 0
                  }
              )
    return (
        <>
            <div
                data-testid="usage-cost"
                title={source + samples(coverage?.costSamples)}
                className={className}
            >
                <span className="opacity-60 font-semibold uppercase">
                    {t('Cost')}
                </span>
                <span className="font-bold">
                    {metrics.costSource === 'estimated' &&
                    metrics.cost !== undefined
                        ? '≈'
                        : ''}
                    {formatUsageCost(metrics.cost)}
                </span>
            </div>
            <div
                data-testid="usage-cache"
                title={
                    cacheInfo +
                    (metrics.cacheWriteTokens !== undefined
                        ? ' ' +
                          t('Cache write: {tokens} tokens.', {
                              tokens: metrics.cacheWriteTokens
                          })
                        : '') +
                    samples(coverage?.cacheSamples)
                }
                className={className}
            >
                <span className="opacity-60 font-semibold uppercase">
                    {t('Cache')}
                </span>
                <span className="font-bold">
                    {rate === undefined ? '—' : `${rate.toFixed(1)}%`}
                </span>
            </div>
        </>
    )
}
