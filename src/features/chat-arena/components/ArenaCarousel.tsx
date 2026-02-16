import { useState, useRef, useEffect, TouchEvent, MouseEvent } from 'react'
import { LLMModel } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ArenaCarouselProps {
    models: LLMModel[]
    renderModel: (model: LLMModel) => React.ReactNode
}

export function ArenaCarousel({ models, renderModel }: ArenaCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0)

    // Touch state
    const touchStartX = useRef<number | null>(null)
    const touchEndX = useRef<number | null>(null)
    const touchStartY = useRef<number | null>(null)
    const touchEndY = useRef<number | null>(null)

    // Mouse state
    const isDragging = useRef(false)
    const mouseStartX = useRef<number | null>(null)
    const mouseEndX = useRef<number | null>(null)

    const minSwipeDistance = 50

    // Reset or clamp index if models change
    useEffect(() => {
        if (currentIndex >= models.length) {
            setCurrentIndex(Math.max(0, models.length - 1))
        }
    }, [models.length, currentIndex])

    // Touch Handlers
    const onTouchStart = (e: TouchEvent) => {
        touchEndX.current = null
        touchStartY.current = e.targetTouches[0].clientY
        touchEndY.current = null
        touchStartX.current = e.targetTouches[0].clientX
    }

    const onTouchMove = (e: TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX
        touchEndY.current = e.targetTouches[0].clientY
    }

    const onTouchEnd = () => {
        if (
            !touchStartX.current ||
            !touchEndX.current ||
            !touchStartY.current ||
            !touchEndY.current
        )
            return

        const xDistance = touchStartX.current - touchEndX.current
        const yDistance = touchStartY.current - touchEndY.current

        // If vertical scroll is significant, don't swipe horizontally
        if (Math.abs(yDistance) > Math.abs(xDistance)) {
            touchStartX.current = null
            touchEndX.current = null
            touchStartY.current = null
            touchEndY.current = null
            return
        }

        handleSwipe(xDistance)

        // Reset
        touchStartX.current = null
        touchEndX.current = null
        touchStartY.current = null
        touchEndY.current = null
    }

    // Mouse Handlers
    const onMouseDown = (e: MouseEvent) => {
        isDragging.current = true
        mouseStartX.current = e.clientX
        mouseEndX.current = null
    }

    const onMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return
        mouseEndX.current = e.clientX
    }

    const onMouseUp = () => {
        if (!isDragging.current) return

        if (mouseStartX.current !== null && mouseEndX.current !== null) {
            const distance = mouseStartX.current - mouseEndX.current
            handleSwipe(distance)
        }

        isDragging.current = false
        mouseStartX.current = null
        mouseEndX.current = null
    }

    const onMouseLeave = () => {
        if (isDragging.current) {
            onMouseUp()
        }
    }

    const handleSwipe = (distance: number) => {
        const isLeftSwipe = distance > minSwipeDistance
        const isRightSwipe = distance < -minSwipeDistance

        if (isLeftSwipe) {
            handleNext()
        } else if (isRightSwipe) {
            handlePrev()
        }
    }

    const handleNext = () => {
        if (models.length === 0) return
        setCurrentIndex((prev) => (prev + 1) % models.length)
    }

    const handlePrev = () => {
        if (models.length === 0) return
        setCurrentIndex((prev) => (prev - 1 + models.length) % models.length)
    }

    if (models.length === 0) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                No models selected
            </div>
        )
    }

    const currentModel = models[currentIndex]

    if (!currentModel) return null

    return (
        <div
            className="flex flex-col h-full w-full overflow-hidden select-none touch-pan-y relative group"
            onTouchStartCapture={onTouchStart}
            onTouchMoveCapture={onTouchMove}
            onTouchEndCapture={onTouchEnd}
            onTouchCancelCapture={() => {
                touchStartX.current = null
                touchEndX.current = null
                touchStartY.current = null
                touchEndY.current = null
            }}
            onMouseDownCapture={onMouseDown}
            onMouseMoveCapture={onMouseMove}
            onMouseUpCapture={onMouseUp}
            onMouseLeave={onMouseLeave}
        >
            {/* Indicators */}
            <div className="flex items-center justify-center gap-2 py-2 shrink-0 z-10">
                {models.map((model, index) => (
                    <button
                        key={model.id}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation()
                            setCurrentIndex(index)
                        }}
                        className={cn(
                            'h-2 rounded-full transition-all duration-300 cursor-pointer touch-manipulation',
                            index === currentIndex
                                ? 'bg-primary w-8'
                                : 'bg-muted-foreground/30 w-2 hover:bg-muted-foreground/50 hover:w-3'
                        )}
                        aria-label={`Switch to ${model.name}`}
                        title={model.name}
                    />
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 relative px-2 md:px-12">
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-background/50 hover:bg-background/80 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 md:flex hidden"
                    onClick={(e) => {
                        e.stopPropagation()
                        handlePrev()
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <ChevronLeft className="w-6 h-6" />
                </Button>

                <div
                    key={currentModel.id}
                    className="absolute inset-x-0 inset-y-0 md:inset-x-12 animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-hidden"
                >
                    {renderModel(currentModel)}
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-background/50 hover:bg-background/80 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 md:flex hidden"
                    onClick={(e) => {
                        e.stopPropagation()
                        handleNext()
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <ChevronRight className="w-6 h-6" />
                </Button>
            </div>

            {/* Mobile Navigation Areas (Invisible tap zones) */}
            <div
                className="absolute left-0 top-1/4 bottom-1/4 w-8 z-20 md:hidden"
                onClick={(e) => {
                    e.stopPropagation()
                    handlePrev()
                }}
            />
            <div
                className="absolute right-0 top-1/4 bottom-1/4 w-8 z-20 md:hidden"
                onClick={(e) => {
                    e.stopPropagation()
                    handleNext()
                }}
            />
        </div>
    )
}
