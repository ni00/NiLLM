import React from 'react'
import {
    Settings2,
    ChevronsUpDown,
    Check,
    Pencil,
    Star,
    Loader2,
    MessageSquareText,
    ChevronUp,
    ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LLMModel, BenchmarkResult } from '@/lib/types'
import { useAppStore } from '@/lib/store'
import { StreamingMarkdown } from './StreamingMarkdown'
import { ConfigEditor } from './ConfigEditor'
import {
    getMetricColor,
    getStarColor,
    getScoreBadgeStyles
} from '../utils/metrics'

interface ResultBlockProps {
    res: BenchmarkResult
    streaming?: Partial<BenchmarkResult>
    showContent: boolean
    isLast: boolean
    onToggle: (id: string) => void
    onRate: (score: number) => void
    metricsRanges: {
        ttft: { min: number; max: number }
        tps: { min: number; max: number }
        duration: { min: number; max: number }
    }
}

const ResultBlock = React.memo(
    ({
        res,
        streaming,
        showContent,
        isLast,
        onToggle,
        onRate,
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
                            <div className="mt-2 p-3 bg-destructive/10 text-destructive text-xs rounded-lg border border-destructive/20">
                                {res.error}
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

interface ModelColumnProps {
    model: LLMModel
    results: BenchmarkResult[]
    isEditing: boolean
    onToggleEditing: () => void
    onExportHistory: (model: LLMModel, results: BenchmarkResult[]) => void
    expandedModelIds: string[]
    onToggleExpandAll: (id: string) => void
    manuallyExpandedBlocks: Record<string, boolean>
    onToggleBlock: (id: string) => void
    onStartEditingDetails: (model: LLMModel) => void
    globalConfig: any
    streamingData: Record<string, Partial<BenchmarkResult>>
    metricsRanges: {
        ttft: { min: number; max: number }
        tps: { min: number; max: number }
        duration: { min: number; max: number }
    }
    footerRanges: {
        ttft: { min: number; max: number }
        tps: { min: number; max: number }
        duration: { min: number; max: number }
        tokens: { min: number; max: number }
    }
}

export const ModelColumn = React.memo(
    ({
        model,
        results,
        isEditing,
        onToggleEditing,
        onExportHistory,
        expandedModelIds,
        onToggleExpandAll,
        manuallyExpandedBlocks,
        onToggleBlock,
        onStartEditingDetails,
        globalConfig,
        streamingData,
        metricsRanges,
        footerRanges
    }: ModelColumnProps) => {
        const { updateModel, activeSessionId, updateResult } = useAppStore()

        const {
            ttft: fTtftRange,
            tps: fTpsRange,
            duration: fTimeRange,
            tokens: fToksRange
        } = footerRanges

        return (
            <div
                className="flex flex-col h-[600px] border rounded-xl bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden group relative transition-all duration-300 hover:shadow-md hover:border-primary/30"
                style={{ contain: 'layout style' }}
            >
                {/* Card Header */}
                <div className="flex-none px-4 py-3 border-b bg-muted/20 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 truncate flex-1">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <div className="flex items-baseline gap-2 truncate">
                            <div
                                className="font-bold text-sm tracking-tight text-foreground/90 group-hover:text-primary transition-colors truncate cursor-pointer hover:underline underline-offset-4"
                                onClick={() => onExportHistory(model, results)}
                            >
                                {model.name}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 truncate">
                                {model.providerName || model.provider}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {results.length > 1 && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`h-7 w-7 rounded-full transition-colors ${expandedModelIds.includes(model.id) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-primary hover:bg-primary/5'}`}
                                onClick={() => onToggleExpandAll(model.id)}
                            >
                                <ChevronsUpDown className="h-3.5 w-3.5" />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 rounded-full transition-colors ${isEditing ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-primary hover:bg-primary/5'}`}
                            onClick={onToggleEditing}
                        >
                            {isEditing ? (
                                <Check className="h-3.5 w-3.5" />
                            ) : (
                                <Settings2 className="h-3.5 w-3.5" />
                            )}
                        </Button>
                    </div>
                </div>

                {/* Card Content */}
                <div className="flex-1 relative overflow-hidden min-h-0">
                    {isEditing ? (
                        <div className="flex flex-col h-full bg-muted/5">
                            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                                <div className="p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h4 className="text-sm font-bold tracking-tight">
                                                Parameters
                                            </h4>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                Override global generation
                                                settings.
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-[11px] font-medium"
                                            onClick={() =>
                                                updateModel(model.id, {
                                                    config: undefined
                                                })
                                            }
                                        >
                                            Reset
                                        </Button>
                                    </div>
                                    <div className="bg-muted/5 rounded-xl border p-4">
                                        <ConfigEditor
                                            config={{
                                                ...globalConfig,
                                                ...model.config
                                            }}
                                            onChange={(newConfig) =>
                                                updateModel(model.id, {
                                                    config: newConfig
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t bg-muted/20">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full h-9 text-xs font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                                    onClick={() => onStartEditingDetails(model)}
                                >
                                    <Pencil className="w-3.5 h-3.5 mr-2" />
                                    Edit Model Details
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <ScrollArea className="h-full">
                            <div className="p-4 flex flex-col min-h-full">
                                {results.length > 0 ? (
                                    <div className="flex-1 space-y-6 pb-4">
                                        {results.map((res, idx) => (
                                            <ResultBlock
                                                key={res.id}
                                                res={res}
                                                streaming={
                                                    streamingData[res.id]
                                                }
                                                showContent={
                                                    idx ===
                                                        results.length - 1 ||
                                                    expandedModelIds.includes(
                                                        model.id
                                                    ) ||
                                                    manuallyExpandedBlocks[
                                                        res.id
                                                    ]
                                                }
                                                isLast={
                                                    idx === results.length - 1
                                                }
                                                onToggle={onToggleBlock}
                                                metricsRanges={metricsRanges}
                                                onRate={(score) => {
                                                    if (!activeSessionId) return
                                                    updateResult(
                                                        activeSessionId,
                                                        model.id,
                                                        res.id,
                                                        {
                                                            rating: score,
                                                            ratingSource:
                                                                'human'
                                                        }
                                                    )
                                                }}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/30 py-20 gap-3">
                                        <MessageSquareText className="w-10 h-10 opacity-20" />
                                        <div className="text-sm font-medium">
                                            Ready to compare
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    )}
                </div>

                {/* Card Footer */}
                <div className="flex-none p-3 px-4 border-t bg-muted/10 flex flex-col gap-2">
                    <div className="flex items-center justify-between min-h-[24px]">
                        <div className="flex-1 min-w-0">
                            {results.length > 0 && !isEditing ? (
                                <div className="flex flex-wrap gap-1.5 text-[10px] font-mono text-muted-foreground tabular-nums">
                                    {(() => {
                                        const validTtft = results
                                            .map((m) => m.metrics?.ttft)
                                            .filter(
                                                (v): v is number => !!v && v > 0
                                            )
                                        const avgTtft =
                                            validTtft.length > 0
                                                ? validTtft.reduce(
                                                      (a, b) => a + b,
                                                      0
                                                  ) / validTtft.length
                                                : 0
                                        return (
                                            <div
                                                title="Average TTFT"
                                                className="flex items-center gap-1 px-2 py-1 rounded bg-muted/40 whitespace-nowrap flex-1 min-w-[85px] justify-center"
                                            >
                                                <span className="opacity-50">
                                                    TTFT
                                                </span>
                                                <span
                                                    className={`font-bold ${getMetricColor(avgTtft, fTtftRange.min, fTtftRange.max, 'min-best')}`}
                                                >
                                                    {Math.round(avgTtft)}
                                                </span>
                                                <span className="opacity-40 text-[8px]">
                                                    ms
                                                </span>
                                            </div>
                                        )
                                    })()}

                                    {(() => {
                                        const validTps = results
                                            .map((m) => m.metrics?.tps)
                                            .filter(
                                                (v): v is number => !!v && v > 0
                                            )
                                        const avgTps =
                                            validTps.length > 0
                                                ? validTps.reduce(
                                                      (a, b) => a + b,
                                                      0
                                                  ) / validTps.length
                                                : 0
                                        return (
                                            <div
                                                title="Average Tokens/sec"
                                                className="flex items-center gap-1 px-2 py-1 rounded bg-muted/40 whitespace-nowrap flex-1 min-w-[85px] justify-center"
                                            >
                                                <span className="opacity-50">
                                                    SPD
                                                </span>
                                                <span
                                                    className={`font-bold ${getMetricColor(avgTps, fTpsRange.min, fTpsRange.max, 'max-best')}`}
                                                >
                                                    {avgTps.toFixed(1)}
                                                </span>
                                                <span className="opacity-40 text-[8px]">
                                                    t/s
                                                </span>
                                            </div>
                                        )
                                    })()}

                                    {(() => {
                                        const sumTime = results.reduce(
                                            (acc, r) =>
                                                acc +
                                                (r.metrics?.totalDuration || 0),
                                            0
                                        )
                                        return (
                                            <div
                                                title="Total Duration"
                                                className="flex items-center gap-1 px-2 py-1 rounded bg-muted/40 whitespace-nowrap flex-1 min-w-[85px] justify-center"
                                            >
                                                <span className="opacity-50">
                                                    TIME
                                                </span>
                                                <span
                                                    className={`font-bold ${getMetricColor(sumTime, fTimeRange.min, fTimeRange.max, 'min-best')}`}
                                                >
                                                    {(sumTime / 1000).toFixed(
                                                        2
                                                    )}
                                                </span>
                                                <span className="opacity-40 text-[8px]">
                                                    s
                                                </span>
                                            </div>
                                        )
                                    })()}

                                    {(() => {
                                        const sumToks = results.reduce(
                                            (acc, r) =>
                                                acc +
                                                (r.metrics?.tokenCount || 0),
                                            0
                                        )
                                        return (
                                            <div
                                                title="Total Tokens"
                                                className="flex items-center gap-1 px-2 py-1 rounded bg-muted/40 whitespace-nowrap flex-1 min-w-[85px] justify-center"
                                            >
                                                <span className="opacity-50">
                                                    TOKS
                                                </span>
                                                <span
                                                    className={`font-bold ${getMetricColor(sumToks, fToksRange.min, fToksRange.max, 'min-best')}`}
                                                >
                                                    {sumToks}
                                                </span>
                                            </div>
                                        )
                                    })()}
                                </div>
                            ) : isEditing ? (
                                <div className="text-[10px] font-semibold text-primary/60 uppercase tracking-widest pl-1">
                                    Configuration Mode
                                </div>
                            ) : (
                                <div className="h-4" />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }
)

ModelColumn.displayName = 'ModelColumn'
