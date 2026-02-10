import React from 'react'
import { Loader2, Star, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BenchmarkResult } from '@/lib/types'
import { StreamingMarkdown } from './StreamingMarkdown'
import {
    getMetricColor,
    getStarColor,
    getScoreBadgeStyles
} from '../utils/metrics'

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
        const {
            ttft: ttftRange,
            tps: tpsRange,
            duration: durationRange
        } = metricsRanges
        const effectiveResponse =
            streaming?.response !== undefined
                ? streaming.response
                : res.response

        return (
            <div
                className={`space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ${!isLast ? 'border-l-2 border-muted pl-4 ml-1' : ''}`}
            >
                <div
                    className={`p-3 rounded-lg text-[13px] border transition-all cursor-pointer flex items-center justify-between gap-3 group/prompt ${
                        showContent
                            ? 'bg-muted/40 text-foreground/70 border-border/40 italic'
                            : 'bg-muted/20 text-muted-foreground/50 border-transparent hover:bg-muted/40'
                    }`}
                    onClick={() => onToggle(res.id)}
                >
                    <span
                        className={`text-sm break-words leading-relaxed ${showContent ? '' : 'line-clamp-2'}`}
                    >
                        &quot;{res.prompt}&quot;
                    </span>
                    {!isLast && (
                        <div className="flex-none">
                            {showContent ? (
                                <ChevronUp className="h-3 w-3 opacity-40 group-hover/prompt:opacity-100" />
                            ) : (
                                <ChevronDown className="h-3 w-3 opacity-40 group-hover/prompt:opacity-100" />
                            )}
                        </div>
                    )}
                </div>

                {showContent && (
                    <div
                        className="min-h-[1.5rem]"
                        style={{
                            contain: 'content',
                            willChange: streaming ? 'height' : 'auto'
                        }}
                    >
                        {effectiveResponse ? (
                            <StreamingMarkdown
                                content={effectiveResponse}
                                isStreaming={!!streaming}
                            />
                        ) : (
                            <div className="flex items-center gap-2 text-primary font-medium animate-pulse px-1">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Generating response...</span>
                            </div>
                        )}
                        {res.error && (
                            <div className="mt-2 p-3 bg-destructive/10 text-destructive text-xs rounded-lg border border-destructive/20 flex flex-col gap-2">
                                <div>{res.error}</div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onRetry(res.id)
                                    }}
                                    className="self-end h-7 text-xs border-destructive/30 hover:bg-destructive/10 hover:text-destructive gap-2"
                                >
                                    <RefreshCw className="w-3 h-3" />
                                    Retry
                                </Button>
                            </div>
                        )}

                        {res.response && (
                            <div className="flex items-center gap-3 pt-4 border-t border-border/30 mt-4 group/rating">
                                <div className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                    Score
                                </div>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((score) => (
                                        <button
                                            key={score}
                                            onClick={() => onRate(score)}
                                            className="focus:outline-none p-1 hover:bg-primary/5 rounded-full transition-all hover:scale-110 active:scale-90"
                                        >
                                            <Star
                                                className={`w-4 h-4 transition-all ${(res.rating || 0) >= score ? getStarColor(res.rating || 0) : 'text-muted-foreground/20 group-hover/rating:text-primary/20'}`}
                                            />
                                        </button>
                                    ))}
                                </div>
                                {res.rating && (
                                    <div
                                        className={`ml-auto flex items-center gap-2 px-3 py-1 rounded-full border transition-all hover:scale-110 active:scale-95 cursor-default ${getScoreBadgeStyles(res.rating)}`}
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-tighter opacity-80 whitespace-nowrap">
                                            {res.ratingSource === 'ai'
                                                ? 'AI Judge'
                                                : 'Human Judge'}
                                        </span>
                                        <span className="text-[14px] font-bold tabular-nums tracking-tight border-l pl-2 ml-0.5 border-current/20 leading-none">
                                            {res.rating.toFixed(1)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {(res.metrics || (streaming && streaming.metrics)) &&
                    (() => {
                        const m = streaming?.metrics
                            ? { ...res.metrics, ...streaming.metrics }
                            : res.metrics
                        if (!m) return null
                        return (
                            <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground tabular-nums pt-3 mt-1 px-1 opacity-70 border-t border-dashed border-border/40">
                                <div
                                    title="Time to First Token"
                                    className="flex items-center gap-1"
                                >
                                    <span className="opacity-50 font-semibold">
                                        TTFT
                                    </span>
                                    <span
                                        className={`font-bold ${getMetricColor(m.ttft, ttftRange.min, ttftRange.max, 'min-best')}`}
                                    >
                                        {m.ttft}
                                    </span>
                                    <span className="opacity-40 text-[8px]">
                                        ms
                                    </span>
                                </div>
                                <div
                                    title="Tokens Per Second"
                                    className="flex items-center gap-1"
                                >
                                    <span className="opacity-50 font-semibold">
                                        SPD
                                    </span>
                                    <span
                                        className={`font-bold ${getMetricColor(m.tps, tpsRange.min, tpsRange.max, 'max-best')}`}
                                    >
                                        {m.tps.toFixed(1)}
                                    </span>
                                    <span className="opacity-40 text-[8px]">
                                        t/s
                                    </span>
                                </div>
                                <div
                                    title="Total Duration"
                                    className="flex items-center gap-1"
                                >
                                    <span className="opacity-50 font-semibold">
                                        TIME
                                    </span>
                                    <span
                                        className={`font-bold ${getMetricColor(m.totalDuration, durationRange.min, durationRange.max, 'min-best')}`}
                                    >
                                        {(m.totalDuration / 1000).toFixed(2)}
                                    </span>
                                    <span className="opacity-40 text-[8px]">
                                        s
                                    </span>
                                </div>
                                <div
                                    title="Total Tokens"
                                    className="flex items-center gap-1 ml-auto"
                                >
                                    <span className="opacity-50 font-semibold">
                                        TOKS
                                    </span>
                                    <span className="font-bold">
                                        {m.tokenCount}
                                    </span>
                                </div>
                            </div>
                        )
                    })()}
            </div>
        )
    }
)

ResultBlock.displayName = 'ResultBlock'
