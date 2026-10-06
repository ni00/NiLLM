import { useI18n } from '@/lib/i18n'
import { Ban, CircleSlash, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { resultStatus } from '@/lib/statistics'
import { StreamingMarkdown } from '../StreamingMarkdown'
import { ThinkingBlock } from './ThinkingBlock'
import { DecisionResponse } from '@/features/decisions/DecisionResponse'

export type DisplayStatus = 'pending' | 'completed' | 'error' | 'cancelled'

/** Resolve legacy records through resultStatus when status is absent. */
export function displayStatus(result: {
    status?: string
    error?: string
    response?: string
}): DisplayStatus {
    return resultStatus(
        result as Parameters<typeof resultStatus>[0]
    ) as DisplayStatus
}

interface ResponseBodyProps {
    isDecision?: boolean
    response: string
    reasoning?: string
    isStreaming: boolean
    status: DisplayStatus
    error?: string
    /** Optional retry action; read-only history omits it. */
    onRetry?: () => void
}

export function ResponseBody({
    isDecision,
    response,
    reasoning,
    isStreaming,
    status,
    error,
    onRetry
}: ResponseBodyProps) {
    const t = useI18n()
    const hasText = response.length > 0
    return (
        <div
            className="min-h-[1.5rem] select-text"
            style={{
                contain: 'content',
                willChange: status === 'pending' ? 'height' : 'auto'
            }}
        >
            {reasoning && (
                <ThinkingBlock
                    reasoning={reasoning}
                    isStreaming={isStreaming && !hasText}
                />
            )}
            {status === 'pending' && !hasText && (
                <div
                    className="flex items-center gap-2 text-primary font-medium px-1"
                    role="status"
                >
                    <span
                        className="w-2 h-2 rounded-full bg-primary animate-pulse"
                        aria-hidden="true"
                    />
                    <span>{t('Generating…')}</span>
                </div>
            )}
            {hasText && isDecision ? (
                <DecisionResponse response={response} />
            ) : (
                hasText && (
                    <StreamingMarkdown
                        content={response}
                        isStreaming={isStreaming}
                    />
                )
            )}
            {status === 'completed' && !hasText && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm px-1">
                    <CircleSlash className="w-4 h-4" aria-hidden="true" />
                    <span>{t('No text output')}</span>
                </div>
            )}
            {status === 'cancelled' && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm px-1 mt-2">
                    <Ban className="w-4 h-4" aria-hidden="true" />
                    <span>{t('Cancelled')}</span>
                </div>
            )}
            {status === 'error' && error && (
                <div className="mt-2 p-3 bg-destructive/10 text-destructive text-xs rounded-lg border border-destructive/20 flex flex-col gap-2">
                    <div className="select-text">{error}</div>
                    {onRetry && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation()
                                onRetry()
                            }}
                            className="self-end h-7 text-xs border-destructive/30 hover:bg-destructive/10 hover:text-destructive gap-2"
                        >
                            <RefreshCw className="w-3 h-3" />
                            {t('Retry')}
                        </Button>
                    )}
                </div>
            )}
        </div>
    )
}
