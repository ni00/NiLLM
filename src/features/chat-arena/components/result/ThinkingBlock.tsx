import { useI18n } from '@/lib/i18n'
import React, { useState, useRef, useEffect } from 'react'
import { Brain, ChevronDown } from 'lucide-react'
import { StreamingMarkdown } from '../StreamingMarkdown'

interface ThinkingBlockProps {
    reasoning: string
    isStreaming: boolean
}

export const ThinkingBlock = React.memo(
    ({ reasoning, isStreaming }: ThinkingBlockProps) => {
        const t = useI18n()
        const [isExpanded, setIsExpanded] = useState(isStreaming)

        const wasStreaming = useRef(isStreaming)
        useEffect(() => {
            if (wasStreaming.current && !isStreaming) {
                setIsExpanded(false)
            } else if (!wasStreaming.current && isStreaming) {
                setIsExpanded(true)
            }
            wasStreaming.current = isStreaming
        }, [isStreaming])

        const toggleExpanded = () => {
            setIsExpanded((prev) => !prev)
        }

        return (
            <div className="thinking-block mb-3">
                <button
                    onClick={toggleExpanded}
                    aria-expanded={isExpanded}
                    className="thinking-block-header"
                >
                    <div className="thinking-block-indicator">
                        <Brain className="w-3.5 h-3.5" />
                        {isStreaming && (
                            <span className="thinking-block-pulse" />
                        )}
                    </div>
                    <span className="thinking-block-label">
                        {isStreaming ? t('Thinking...') : t('Thought Process')}
                    </span>
                    {!isStreaming && reasoning.length > 0 && (
                        <span className="thinking-block-count">
                            {t('{count} chars', {
                                count:
                                    reasoning.length > 1000
                                        ? `${Math.round(reasoning.length / 1000)}k`
                                        : reasoning.length
                            })}
                        </span>
                    )}
                    <ChevronDown
                        className={`w-3.5 h-3.5 ml-auto transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                    />
                </button>

                {isExpanded && (
                    <div className="thinking-block-content">
                        <StreamingMarkdown
                            content={reasoning}
                            isStreaming={isStreaming}
                        />
                    </div>
                )}
            </div>
        )
    }
)

ThinkingBlock.displayName = 'ThinkingBlock'
