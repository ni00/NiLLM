import { lazy, memo, Suspense } from 'react'

const MarkdownContent = lazy(() =>
    import('./MarkdownContent').then((module) => ({
        default: module.MarkdownContent
    }))
)

export const StreamingMarkdown = memo(function StreamingMarkdown(props: {
    content: string
    isStreaming?: boolean
}) {
    if (!props.content) return null
    return (
        <Suspense
            fallback={
                <div className="text-sm leading-relaxed px-1 whitespace-pre-wrap break-words">
                    {props.content}
                </div>
            }
        >
            <MarkdownContent {...props} />
        </Suspense>
    )
})
