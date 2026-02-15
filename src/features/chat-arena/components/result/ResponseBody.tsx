import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StreamingMarkdown } from '../StreamingMarkdown'
import { ThinkingBlock } from './ThinkingBlock'

interface ResponseBodyProps {
    response: string
    reasoning?: string
    isStreaming: boolean
    error?: string
    onRetry: () => void
}

export function ResponseBody({
    response,
    reasoning,
    isStreaming,
    error,
    onRetry
}: ResponseBodyProps) {
    return (
        <div
            className="min-h-[1.5rem]"
            style={{
                contain: 'content',
                willChange: isStreaming ? 'height' : 'auto'
            }}
        >
            {reasoning && (
                <ThinkingBlock
                    reasoning={reasoning}
                    isStreaming={isStreaming && !response}
                />
            )}
            {response ? (
                <StreamingMarkdown
                    content={response}
                    isStreaming={isStreaming}
                />
            ) : (
                <div className="flex items-center gap-2 text-primary font-medium animate-pulse px-1">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                        {reasoning ? 'Thinking...' : 'Generating response...'}
                    </span>
                </div>
            )}
            {error && (
                <div className="mt-2 p-3 bg-destructive/10 text-destructive text-xs rounded-lg border border-destructive/20 flex flex-col gap-2">
                    <div>{error}</div>
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
                        Retry
                    </Button>
                </div>
            )}
        </div>
    )
}
