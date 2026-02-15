import React, { useState, useRef, useEffect } from 'react'
import { Brain, ChevronDown } from 'lucide-react'
import { StreamingMarkdown } from '../StreamingMarkdown'

interface ThinkingBlockProps {
    reasoning: string
    isStreaming: boolean
}

export const ThinkingBlock = React.memo(
    ({ reasoning, isStreaming }: ThinkingBlockProps) => {
        const [isExpanded, setIsExpanded] = useState(true)
        const contentRef = useRef<HTMLDivElement>(null)
        const [contentHeight, setContentHeight] = useState<number | undefined>(
            undefined
        )

        // Auto-collapse when streaming ends
        const wasStreaming = useRef(isStreaming)
        useEffect(() => {
            if (wasStreaming.current && !isStreaming) {
                // Streaming just ended — collapse
                setIsExpanded(false)
            }
            wasStreaming.current = isStreaming
        }, [isStreaming])

        // Measure content height for smooth animation
        useEffect(() => {
            if (contentRef.current) {
                const observer = new ResizeObserver((entries) => {
                    for (const entry of entries) {
                        setContentHeight(entry.contentRect.height)
                    }
                })
                observer.observe(contentRef.current)
                return () => observer.disconnect()
            }
        }, [])

        const toggleExpanded = () => {
            setIsExpanded((prev) => !prev)
        }

        return (
            <div className="thinking-block mb-3">
                <button
                    onClick={toggleExpanded}
                    className="thinking-block-header"
                >
                    <div className="thinking-block-indicator">
                        <Brain className="w-3.5 h-3.5" />
                        {isStreaming && (
                            <span className="thinking-block-pulse" />
                        )}
                    </div>
                    <span className="thinking-block-label">
                        {isStreaming ? 'Thinking...' : 'Thought Process'}
                    </span>
                    {!isStreaming && reasoning.length > 0 && (
                        <span className="thinking-block-count">
                            {reasoning.length > 1000
                                ? `${Math.round(reasoning.length / 1000)}k chars`
                                : `${reasoning.length} chars`}
                        </span>
                    )}
                    <ChevronDown
                        className={`w-3.5 h-3.5 ml-auto transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                    />
                </button>

                <div
                    className="thinking-block-content-wrapper"
                    style={{
                        height: isExpanded
                            ? contentHeight
                                ? `${contentHeight}px`
                                : 'auto'
                            : '0px',
                        opacity: isExpanded ? 1 : 0,
                        overflow: 'hidden',
                        transition:
                            'height 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease'
                    }}
                >
                    <div ref={contentRef} className="thinking-block-content">
                        <StreamingMarkdown
                            content={reasoning}
                            isStreaming={isStreaming}
                        />
                    </div>
                </div>
            </div>
        )
    }
)

ThinkingBlock.displayName = 'ThinkingBlock'
