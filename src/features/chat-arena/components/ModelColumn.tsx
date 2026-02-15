import React, { useRef } from 'react'
import {
    Settings2,
    ChevronsUpDown,
    Check,
    MessageSquareText,
    ArrowUp,
    ArrowDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LLMModel, BenchmarkResult } from '@/lib/types'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { ResultBlock } from './ResultBlock'
import { ModelColumnStats } from './ModelColumnStats'
import { ModelConfigPanel } from './ModelConfigPanel'
import { retryResult } from '@/features/benchmark/engine'

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
    className?: string
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
        footerRanges,
        className
    }: ModelColumnProps) => {
        const { updateModel, activeSessionId, updateResult } = useAppStore()
        const scrollRef = useRef<HTMLDivElement>(null)

        const handleRetry = React.useCallback(
            (resultId: string) => {
                if (activeSessionId) {
                    retryResult(activeSessionId, model.id, resultId)
                }
            },
            [activeSessionId, model.id]
        )

        const handleRate = React.useCallback(
            (resultId: string, score: number) => {
                if (!activeSessionId) return
                updateResult(activeSessionId, model.id, resultId, {
                    rating: score,
                    ratingSource: 'human'
                })
            },
            [activeSessionId, model.id, updateResult]
        )

        const scrollToTop = () => {
            if (scrollRef.current) {
                scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
            }
        }

        const scrollToBottom = () => {
            if (scrollRef.current) {
                scrollRef.current.scrollTo({
                    top: scrollRef.current.scrollHeight,
                    behavior: 'smooth'
                })
            }
        }

        return (
            <div
                className={cn(
                    'flex flex-col h-[600px] border rounded-xl bg-card shadow-sm overflow-hidden group relative transition-all duration-300 hover:shadow-md hover:border-primary/30',
                    className
                )}
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
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/30 truncate">
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
                    {!isEditing && results.length > 0 && (
                        <div className="absolute right-4 bottom-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 z-20 translate-y-4 group-hover:translate-y-0">
                            <Button
                                size="icon"
                                variant="outline"
                                className="h-9 w-9 rounded-full shadow-2xl border-border/40 bg-background/95 hover:bg-primary hover:border-primary hover:shadow-primary/20 transition-all duration-300 group/btn hover:scale-110 active:scale-95"
                                onClick={scrollToTop}
                                title="Scroll to Top"
                            >
                                <ArrowUp className="w-4.5 h-4.5 text-foreground/50 group-hover/btn:text-primary-foreground transition-colors" />
                            </Button>
                            <Button
                                size="icon"
                                variant="outline"
                                className="h-9 w-9 rounded-full shadow-2xl border-border/40 bg-background/95 hover:bg-primary hover:border-primary hover:shadow-primary/20 transition-all duration-300 group/btn hover:scale-110 active:scale-95"
                                onClick={scrollToBottom}
                                title="Scroll to Bottom"
                            >
                                <ArrowDown className="w-4.5 h-4.5 text-foreground/50 group-hover/btn:text-primary-foreground transition-colors" />
                            </Button>
                        </div>
                    )}

                    {isEditing ? (
                        <ModelConfigPanel
                            model={model}
                            globalConfig={globalConfig}
                            onUpdateModel={updateModel}
                            onStartEditingDetails={onStartEditingDetails}
                        />
                    ) : (
                        <ScrollArea className="h-full" ref={scrollRef}>
                            <div className="p-4 flex flex-col min-h-full overflow-hidden">
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
                                                onRetry={handleRetry}
                                                onRate={(score) =>
                                                    handleRate(res.id, score)
                                                }
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
                                <ModelColumnStats
                                    results={results}
                                    footerRanges={footerRanges}
                                />
                            ) : isEditing ? (
                                <div className="text-xs font-semibold text-primary/60 uppercase tracking-widest pl-1">
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
