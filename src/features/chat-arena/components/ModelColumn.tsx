import { useI18n } from '@/lib/i18n'
import React, { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
    Settings2,
    ChevronsUpDown,
    Check,
    MessageSquareText,
    ArrowUp,
    ArrowDown,
    Pin,
    PinOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { GenerationConfig, LLMModel, BenchmarkResult } from '@/lib/types'
import { cn } from '@/lib/utils'
import { withEstimatedCost } from '@/lib/usage'
import {
    useUpdateModel,
    useActiveSessionId,
    useUpdateResult,
    useAddRetryToQueue
} from '@/lib/hooks/useStoreSelectors'
import { ResultBlock } from './ResultBlock'
import { ModelColumnStats } from './ModelColumnStats'
import { ModelConfigPanel } from './ModelConfigPanel'

interface MetricsRanges {
    ttft: { min: number; max: number }
    tps: { min: number; max: number }
    duration: { min: number; max: number }
}

interface FooterRanges {
    ttft: { min: number; max: number }
    tps: { min: number; max: number }
    duration: { min: number; max: number }
    tokens: { min: number; max: number }
}

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
    globalConfig: GenerationConfig
    metricsRanges: MetricsRanges
    footerRanges: FooterRanges
    className?: string
}

// Keep track of follow state across remounts. Runtime insertion keyed by
// arbitrary model IDs, so a null-prototype Record instead of a Map.
const followStateMap: Record<string, boolean> = Object.create(null)

// Keep complete history while rendering only visible rows above the threshold.

const VIRTUALIZE_THRESHOLD = 50
const VIRTUAL_OVERSCAN = 6
const ESTIMATED_RESULT_HEIGHT = 160

interface VirtualRowProps {
    result: BenchmarkResult
    isLast: boolean
    showContent: boolean
    lastElementRef: (node: HTMLDivElement | null) => void
    onToggle: (id: string) => void
    onRateResult: (resultId: string, score: number) => void
    onRetry: (id: string) => void
    metricsRanges: MetricsRanges
}

const VirtualRowContent = React.memo(function VirtualRowContent({
    result,
    isLast,
    showContent,
    lastElementRef,
    onToggle,
    onRateResult,
    onRetry,
    metricsRanges
}: VirtualRowProps) {
    return (
        <ResultBlock
            res={result}
            showContent={showContent}
            isLast={isLast}
            lastElementRef={lastElementRef}
            onToggle={onToggle}
            metricsRanges={metricsRanges}
            onRetry={onRetry}
            onRate={(score) => onRateResult(result.id, score)}
        />
    )
})

interface VirtualResultListProps {
    results: BenchmarkResult[]
    expandedAll: boolean
    manuallyExpandedBlocks: Record<string, boolean>
    onToggleBlock: (id: string) => void
    onRateResult: (resultId: string, score: number) => void
    onRetry: (id: string) => void
    metricsRanges: MetricsRanges
    lastElementRef: (node: HTMLDivElement | null) => void
    scrollRef: React.RefObject<HTMLDivElement | null>
}

// Measure variable-height rows against the Radix viewport;
// direct DOM positioning avoids rerendering on every scroll.

function VirtualResultList({
    results,
    expandedAll,
    manuallyExpandedBlocks,
    onToggleBlock,
    onRateResult,
    onRetry,
    metricsRanges,
    lastElementRef,
    scrollRef
}: VirtualResultListProps) {
    const virtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
        count: results.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => ESTIMATED_RESULT_HEIGHT,
        getItemKey: (index) => results[index].id,
        overscan: VIRTUAL_OVERSCAN,
        useAnimationFrameWithResizeObserver: true,
        directDomUpdates: true,
        useFlushSync: false
    })
    const virtualItems = virtualizer.getVirtualItems()
    const lastIndex = results.length - 1

    return (
        <div className="p-4">
            <div ref={virtualizer.containerRef} className="relative w-full">
                {virtualItems.map((virtualRow) => {
                    const result = results[virtualRow.index]
                    if (!result) return null
                    return (
                        <div
                            key={virtualRow.key}
                            data-index={virtualRow.index}
                            ref={virtualizer.measureElement}
                            className="absolute top-0 left-0 w-full pb-6"
                        >
                            <VirtualRowContent
                                result={result}
                                isLast={virtualRow.index === lastIndex}
                                lastElementRef={lastElementRef}
                                showContent={
                                    virtualRow.index === lastIndex ||
                                    expandedAll ||
                                    !!manuallyExpandedBlocks[result.id]
                                }
                                onToggle={onToggleBlock}
                                onRateResult={onRateResult}
                                onRetry={onRetry}
                                metricsRanges={metricsRanges}
                            />
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export const ModelColumn = React.memo(
    ({
        model,
        results: recordedResults,
        isEditing,
        onToggleEditing,
        onExportHistory,
        expandedModelIds,
        onToggleExpandAll,
        manuallyExpandedBlocks,
        onToggleBlock,
        onStartEditingDetails,
        globalConfig,
        metricsRanges,
        footerRanges,
        className
    }: ModelColumnProps) => {
        const t = useI18n()
        const results = React.useMemo(
            () =>
                recordedResults.map((result) =>
                    withEstimatedCost(result, model)
                ),
            [recordedResults, model]
        )
        const updateModel = useUpdateModel()
        const activeSessionId = useActiveSessionId()
        const updateResult = useUpdateResult()
        const addRetryToQueue = useAddRetryToQueue()
        const scrollRef = useRef<HTMLDivElement>(null)

        const isVirtual = results.length > VIRTUALIZE_THRESHOLD
        const lastResult = results[results.length - 1]
        const lastResultId = lastResult?.id
        const expandedAll = expandedModelIds.includes(model.id)

        const [isFollowing, setIsFollowing] = React.useState(() => {
            return followStateMap[model.id] ?? true
        })

        const lastScrollTop = useRef(0)
        const lastScrollHeight = useRef(0)
        const isAutoScrolling = useRef(false)
        const autoScrollTimer = useRef<number | null>(null)
        const bottomScrollRaf = useRef<number | null>(null)
        const contentResizeObserver = useRef<ResizeObserver | null>(null)
        const lastContentHeight = useRef(0)
        const touchY = useRef<number | null>(null)

        // Latest-value refs so toggling follow/editing never re-attaches the
        // content ResizeObserver.
        const isFollowingRef = useRef(isFollowing)
        const isEditingRef = useRef(isEditing)
        React.useEffect(() => {
            isFollowingRef.current = isFollowing
        }, [isFollowing])
        React.useEffect(() => {
            isEditingRef.current = isEditing
        }, [isEditing])

        React.useEffect(() => {
            followStateMap[model.id] = isFollowing
        }, [isFollowing, model.id])

        // Retries join the same queue as broadcasts: the single processor
        // decides when the network request actually starts.
        const handleRetry = React.useCallback(
            (resultId: string) => {
                if (activeSessionId) {
                    addRetryToQueue(activeSessionId, model.id, resultId)
                }
            },
            [activeSessionId, model.id, addRetryToQueue]
        )

        const handleRate = React.useCallback(
            (resultId: string, score: number) => {
                if (!activeSessionId) return
                updateResult(activeSessionId, model.id, resultId, {
                    rating: score,
                    ratingSource: 'human',
                    ratedAt: Date.now()
                })
            },
            [activeSessionId, model.id, updateResult]
        )

        const markAutoScrolling = React.useCallback(() => {
            isAutoScrolling.current = true
            if (autoScrollTimer.current !== null) {
                window.clearTimeout(autoScrollTimer.current)
            }
            autoScrollTimer.current = window.setTimeout(() => {
                isAutoScrolling.current = false
                autoScrollTimer.current = null
            }, 500)
        }, [])

        const stopFollowing = React.useCallback(() => {
            isFollowingRef.current = false
            setIsFollowing(false)
            if (bottomScrollRaf.current !== null) {
                cancelAnimationFrame(bottomScrollRaf.current)
                bottomScrollRaf.current = null
            }
            if (autoScrollTimer.current !== null) {
                window.clearTimeout(autoScrollTimer.current)
                autoScrollTimer.current = null
            }
            isAutoScrolling.current = false
            const viewport = scrollRef.current
            if (viewport && !isVirtual) {
                viewport.scrollTo({ top: viewport.scrollTop, behavior: 'auto' })
            }
        }, [isVirtual])

        // Virtual row measurements move the target; snap until the bottom is stable.

        const snapToBottom = React.useCallback(() => {
            if (bottomScrollRaf.current !== null) return
            let stableFrames = 0
            let elapsedFrames = 0
            const step = () => {
                bottomScrollRaf.current = null
                const viewport = scrollRef.current
                if (!viewport) return
                const target = viewport.scrollHeight - viewport.clientHeight
                if (Math.abs(target - viewport.scrollTop) > 1) {
                    viewport.scrollTop = target
                    stableFrames = 0
                } else {
                    stableFrames += 1
                }
                elapsedFrames += 1
                if (stableFrames < 5 && elapsedFrames < 30) {
                    bottomScrollRaf.current = requestAnimationFrame(step)
                } else {
                    markAutoScrolling()
                }
            }
            markAutoScrolling()
            bottomScrollRaf.current = requestAnimationFrame(step)
        }, [markAutoScrolling])

        const scrollToTop = React.useCallback(() => {
            stopFollowing()
            if (!scrollRef.current) return
            scrollRef.current.scrollTo({
                top: 0,
                behavior:
                    isVirtual ||
                    scrollRef.current.querySelector('[data-markdown-windowed]')
                        ? 'auto'
                        : 'smooth'
            })
        }, [isVirtual, stopFollowing])

        const scrollToBottom = React.useCallback(() => {
            const viewport = scrollRef.current
            if (!viewport) return
            if (
                isVirtual ||
                viewport.querySelector('[data-markdown-windowed]')
            ) {
                snapToBottom()
            } else {
                markAutoScrolling()
                viewport.scrollTo({
                    top: viewport.scrollHeight,
                    behavior: 'smooth'
                })
            }
        }, [isVirtual, snapToBottom, markAutoScrolling])

        // Observe the last response, not the full-height list container:
        // another model changing the shared viewport cannot trigger follow.
        const attachLastResult = React.useCallback(
            (node: HTMLDivElement | null) => {
                if (contentResizeObserver.current) {
                    contentResizeObserver.current.disconnect()
                    contentResizeObserver.current = null
                }
                lastContentHeight.current = 0
                if (!node) return
                const observer = new ResizeObserver((entries) => {
                    const height =
                        entries[entries.length - 1].contentRect.height
                    const previous = lastContentHeight.current
                    lastContentHeight.current = height
                    if (
                        height !== previous &&
                        !isEditingRef.current &&
                        isFollowingRef.current
                    ) {
                        scrollToBottom()
                    }
                })
                observer.observe(node)
                contentResizeObserver.current = observer
            },
            [scrollToBottom]
        )

        React.useLayoutEffect(() => {
            if (lastResultId !== undefined && isFollowing && !isEditing) {
                scrollToBottom()
            }
        }, [lastResultId, expandedAll, isFollowing, isEditing, scrollToBottom])

        React.useEffect(
            () => () => {
                if (bottomScrollRaf.current !== null) {
                    cancelAnimationFrame(bottomScrollRaf.current)
                    bottomScrollRaf.current = null
                }
                if (autoScrollTimer.current !== null) {
                    window.clearTimeout(autoScrollTimer.current)
                    autoScrollTimer.current = null
                }
                contentResizeObserver.current?.disconnect()
                contentResizeObserver.current = null
            },
            []
        )

        const lastScrollTime = useRef(0)
        const handleScroll = () => {
            const now = Date.now()
            if (now - lastScrollTime.current < 50) return
            lastScrollTime.current = now

            // Use the ref to get the viewport element, as e.currentTarget is the Root wrapper
            const viewport = scrollRef.current
            if (!viewport) return

            const { scrollTop, scrollHeight } = viewport
            const scrollDiff = scrollTop - lastScrollTop.current
            const heightDiff = scrollHeight - lastScrollHeight.current

            const isContentHeightChanging = Math.abs(heightDiff) > 5

            const isScrollingUp = scrollDiff < 0

            if (
                isFollowing &&
                isScrollingUp &&
                !viewport.querySelector('[data-markdown-windowed]') &&
                !isAutoScrolling.current &&
                scrollTop > 0 &&
                !isContentHeightChanging
            ) {
                if (Math.abs(scrollDiff) > 5) {
                    stopFollowing()
                }
            }

            lastScrollTop.current = scrollTop
            lastScrollHeight.current = scrollHeight
        }

        return (
            <div
                data-model-id={model.id}
                className={cn(
                    'flex flex-col h-full min-h-[400px] border rounded-xl bg-card shadow-sm overflow-hidden group relative transition-all duration-300 hover:shadow-md hover:border-primary/30',
                    className
                )}
                style={{ contain: 'layout style' }}
            >
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

                <div className="flex-1 relative overflow-hidden min-h-0">
                    {!isEditing && results.length > 0 && (
                        <div className="scroll-nav-buttons absolute right-4 bottom-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 z-20 translate-y-4 group-hover:translate-y-0">
                            <Button
                                size="icon"
                                variant="outline"
                                className="h-9 w-9 rounded-full shadow-2xl border-border/40 bg-background/95 hover:bg-primary hover:border-primary hover:shadow-primary/20 transition-all duration-300 group/btn hover:scale-110 active:scale-95"
                                onClick={scrollToTop}
                                title={t('Scroll to Top')}
                            >
                                <ArrowUp className="w-4.5 h-4.5 text-foreground/50 group-hover/btn:text-primary-foreground transition-colors" />
                            </Button>

                            <Button
                                size="icon"
                                variant="outline"
                                aria-pressed={isFollowing}
                                className={cn(
                                    'h-9 w-9 rounded-full shadow-2xl border-border/40 bg-background/95 hover:bg-primary hover:border-primary hover:shadow-primary/20 transition-all duration-300 group/btn hover:scale-110 active:scale-95',
                                    isFollowing
                                        ? 'text-primary hover:text-primary-foreground'
                                        : 'text-foreground/50 hover:text-primary-foreground'
                                )}
                                onClick={() => {
                                    if (isFollowing) {
                                        stopFollowing()
                                    } else {
                                        isFollowingRef.current = true
                                        setIsFollowing(true)
                                    }
                                }}
                                title={
                                    isFollowing
                                        ? t('Following (Click to stop)')
                                        : t('Follow output')
                                }
                            >
                                {isFollowing ? (
                                    <PinOff className="w-4 h-4 transition-colors" />
                                ) : (
                                    <Pin className="w-4 h-4 transition-colors" />
                                )}
                            </Button>

                            <Button
                                size="icon"
                                variant="outline"
                                className="h-9 w-9 rounded-full shadow-2xl border-border/40 bg-background/95 hover:bg-primary hover:border-primary hover:shadow-primary/20 transition-all duration-300 group/btn hover:scale-110 active:scale-95"
                                onClick={scrollToBottom}
                                title={t('Scroll to Bottom')}
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
                        <ScrollArea
                            className="h-full"
                            ref={scrollRef}
                            onScrollCapture={handleScroll}
                            onWheelCapture={(event) => {
                                if (event.deltaY < 0) stopFollowing()
                            }}
                            onKeyDownCapture={(event) => {
                                if (
                                    event.key === 'ArrowUp' ||
                                    event.key === 'PageUp' ||
                                    event.key === 'Home'
                                ) {
                                    stopFollowing()
                                }
                            }}
                            onPointerDownCapture={(event) => {
                                if (
                                    event.target instanceof Element &&
                                    event.target.closest(
                                        '[data-slot="scroll-area-scrollbar"]'
                                    )
                                ) {
                                    stopFollowing()
                                }
                            }}
                            onTouchStartCapture={(event) => {
                                touchY.current =
                                    event.touches[0]?.clientY ?? null
                            }}
                            onTouchMoveCapture={(event) => {
                                const y = event.touches[0]?.clientY
                                if (
                                    y !== undefined &&
                                    touchY.current !== null &&
                                    y - touchY.current > 4
                                ) {
                                    stopFollowing()
                                }
                                touchY.current = y ?? null
                            }}
                            onTouchEndCapture={() => {
                                touchY.current = null
                            }}
                        >
                            {results.length === 0 ? (
                                <div className="p-4 flex flex-col min-h-full overflow-hidden">
                                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/30 py-20 gap-3">
                                        <MessageSquareText className="w-10 h-10 opacity-20" />
                                        <div className="text-sm font-medium">
                                            {t('Ready to compare')}
                                        </div>
                                    </div>
                                </div>
                            ) : isVirtual ? (
                                <VirtualResultList
                                    results={results}
                                    expandedAll={expandedModelIds.includes(
                                        model.id
                                    )}
                                    manuallyExpandedBlocks={
                                        manuallyExpandedBlocks
                                    }
                                    onToggleBlock={onToggleBlock}
                                    onRateResult={handleRate}
                                    onRetry={handleRetry}
                                    metricsRanges={metricsRanges}
                                    lastElementRef={attachLastResult}
                                    scrollRef={scrollRef}
                                />
                            ) : (
                                <div className="p-4 flex flex-col min-h-full overflow-hidden">
                                    <div className="flex-1 space-y-6 pb-4">
                                        {results.map((res, idx) => (
                                            <ResultBlock
                                                key={res.id}
                                                lastElementRef={
                                                    attachLastResult
                                                }
                                                res={res}
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
                                </div>
                            )}
                        </ScrollArea>
                    )}
                </div>

                <div className="flex-none p-3 px-4 border-t bg-muted/10 flex flex-col gap-2">
                    <div className="flex items-center justify-between min-h-[24px]">
                        <div className="flex-1 min-w-0">
                            {results.length > 0 && !isEditing ? (
                                <ModelColumnStats
                                    isDecision={model.mode === 'decision'}
                                    results={results}
                                    footerRanges={footerRanges}
                                />
                            ) : isEditing ? (
                                <div className="text-xs font-semibold text-primary/60 uppercase tracking-widest pl-1">
                                    {t('Configuration Mode')}
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
