import React from 'react'
import { BenchmarkResult } from '@/lib/types'
import { PromptHeader } from './result/PromptHeader'
import { ResponseBody } from './result/ResponseBody'
import { RatingBar } from './result/RatingBar'
import { MetricsBar } from './result/MetricsBar'

export interface ResultBlockProps {
    res: BenchmarkResult
    streaming?: Partial<BenchmarkResult>
    showContent: boolean
    isLast: boolean
    onToggle: (id: string) => void
    onRate: (score: number) => void
    onRetry: (id: string) => void
    metricsRanges: {
        ttft: { min: number; max: number }
        tps: { min: number; max: number }
        duration: { min: number; max: number }
    }
}

export const ResultBlock = React.memo(
    ({
        res,
        streaming,
        showContent,
        isLast,
        onToggle,
        onRate,
        onRetry,
        metricsRanges
    }: ResultBlockProps) => {
        const effectiveResponse =
            streaming?.response !== undefined
                ? streaming.response
                : res.response

        const effectiveMetrics = streaming?.metrics
            ? { ...res.metrics, ...streaming.metrics }
            : res.metrics

        return (
            <div
                className={`space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ${!isLast ? 'border-l-2 border-muted pl-4 ml-1' : ''}`}
            >
                <PromptHeader
                    prompt={res.prompt}
                    showContent={showContent}
                    isLast={isLast}
                    onToggle={() => onToggle(res.id)}
                />

                {showContent && (
                    <>
                        <ResponseBody
                            response={effectiveResponse}
                            isStreaming={!!streaming}
                            error={res.error}
                            onRetry={() => onRetry(res.id)}
                        />
                        {res.response && (
                            <RatingBar
                                rating={res.rating}
                                ratingSource={res.ratingSource}
                                onRate={onRate}
                            />
                        )}
                    </>
                )}

                {effectiveMetrics && (
                    <MetricsBar
                        metrics={effectiveMetrics}
                        ranges={metricsRanges}
                    />
                )}
            </div>
        )
    }
)

ResultBlock.displayName = 'ResultBlock'
