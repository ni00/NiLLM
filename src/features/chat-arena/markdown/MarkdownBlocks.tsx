import {
    Fragment,
    memo,
    useMemo,
    useRef,
    useState,
    useLayoutEffect
} from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { jsx, jsxs } from 'react/jsx-runtime'
import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import type { Components } from 'react-markdown'
import type { Nodes } from 'hast'

const WINDOWING_THRESHOLD = 64

const MarkdownBlock = memo(function MarkdownBlock({
    block,
    components
}: {
    block: string
    components: Components
}) {
    return useMemo(
        () =>
            toJsxRuntime(JSON.parse(block) as Nodes, {
                Fragment,
                jsx,
                jsxs,
                components,
                passKeys: true,
                passNode: false,
                ignoreInvalidStyle: true
            }),
        [block, components]
    )
})

export const MarkdownBlocks = memo(function MarkdownBlocks({
    blocks,
    components
}: {
    blocks: string[]
    components: Components
}) {
    const root = useRef<HTMLDivElement>(null)
    const [scrollElement, setScrollElement] = useState<
        HTMLElement | null | undefined
    >(undefined)
    const [scrollMargin, setScrollMargin] = useState(0)
    const windowed = blocks.length > WINDOWING_THRESHOLD && !!scrollElement
    useLayoutEffect(() => {
        setScrollElement(
            root.current?.closest<HTMLElement>(
                '[data-slot="scroll-area-viewport"], [data-slot="dialog-body"]'
            ) ?? null
        )
    }, [])
    useLayoutEffect(() => {
        const element = root.current
        if (!element || !scrollElement || !windowed) return
        const measure = () =>
            setScrollMargin(
                Math.round(
                    element.getBoundingClientRect().top -
                        scrollElement.getBoundingClientRect().top +
                        scrollElement.scrollTop
                )
            )
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(scrollElement)
        if (element.parentElement?.parentElement)
            observer.observe(element.parentElement.parentElement)
        return () => observer.disconnect()
    }, [scrollElement, windowed])
    const virtualizer = useVirtualizer<HTMLElement, HTMLDivElement>({
        count: blocks.length,
        getScrollElement: () => scrollElement ?? null,
        estimateSize: () => 100,
        getItemKey: (index) => index,
        overscan: 5,
        scrollMargin,
        enabled: windowed,
        useAnimationFrameWithResizeObserver: true,
        useFlushSync: false
    })
    if (blocks.length > WINDOWING_THRESHOLD && scrollElement === undefined) {
        return <div ref={root} style={{ height: blocks.length * 100 }} />
    }
    return (
        <div
            ref={root}
            data-markdown-windowed={windowed || undefined}
            className="min-w-0"
        >
            {windowed ? (
                <div
                    className="relative w-full"
                    style={{ height: virtualizer.getTotalSize() }}
                >
                    {virtualizer.getVirtualItems().map((item) => (
                        <div
                            key={item.key}
                            data-index={item.index}
                            ref={virtualizer.measureElement}
                            className="absolute top-0 left-0 w-full min-w-0 flow-root"
                            style={{
                                transform: `translateY(${item.start - scrollMargin}px)`
                            }}
                        >
                            <MarkdownBlock
                                block={blocks[item.index]}
                                components={components}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                blocks.map((block, index) => (
                    <MarkdownBlock
                        key={index}
                        block={block}
                        components={components}
                    />
                ))
            )}
        </div>
    )
})
