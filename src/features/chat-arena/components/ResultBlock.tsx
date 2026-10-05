import React from 'react'
import { BenchmarkResult } from '@/lib/types'
import { useAppStore } from '@/lib/store'
import { PromptHeader } from './result/PromptHeader'
import { ResponseBody, displayStatus } from './result/ResponseBody'
import { RatingBar } from './result/RatingBar'
import { MetricsBar } from './result/MetricsBar'

export interface ResultBlockProps {
    res: BenchmarkResult
    showContent: boolean
    isLast: boolean
    lastElementRef?: (node: HTMLDivElement | null) => void
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
        showContent,
        isLast,
        lastElementRef,
        onToggle,
        onRate,
        onRetry,
        metricsRanges
    }: ResultBlockProps) => {
        // Other chunks leave this selector stable; shared metric ranges may
        // still update independently.
        const streaming = useAppStore((state) => state.streamingData[res.id])

        const effectiveResponse =
            streaming?.response !== undefined
                ? streaming.response
                : res.response

        const effectiveReasoning =
            streaming?.reasoning !== undefined
                ? streaming.reasoning
                : res.reasoning

        const effectiveMetrics = streaming?.metrics
            ? { ...res.metrics, ...streaming.metrics }
            : res.metrics

        const status = streaming ? 'pending' : displayStatus(res)

        return (
            <div
                ref={isLast ? lastElementRef : undefined}
                data-result-id={res.id}
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
                            isDecision={
                                res.requestSnapshot?.model.mode === 'decision'
                            }
                            response={effectiveResponse}
                            reasoning={effectiveReasoning}
                            isStreaming={!!streaming}
                            status={status}
                            error={res.error}
                            onRetry={() => onRetry(res.id)}
                        />
                        {status === 'completed' && (
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
                        isDecision={
                            res.requestSnapshot?.model.mode === 'decision'
                        }
                        metrics={effectiveMetrics}
                        ranges={metricsRanges}
                    />
                )}
            </div>
        )
    }
)

ResultBlock.displayName = 'ResultBlock'
