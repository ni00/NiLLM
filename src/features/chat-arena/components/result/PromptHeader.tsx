import { ChevronUp, ChevronDown } from 'lucide-react'

interface PromptHeaderProps {
    prompt: string
    showContent: boolean
    isLast: boolean
    onToggle: () => void
}

export function PromptHeader({
    prompt,
    showContent,
    isLast,
    onToggle
}: PromptHeaderProps) {
    return (
        <div
            className={`p-3 rounded-lg text-sm border transition-all cursor-pointer flex items-center justify-between gap-3 group/prompt ${
                showContent
                    ? 'bg-muted/40 text-foreground/70 border-border/40 italic'
                    : 'bg-muted/20 text-muted-foreground/50 border-transparent hover:bg-muted/40'
            }`}
            onClick={onToggle}
        >
            <span
                className={`text-sm break-words leading-relaxed ${showContent ? '' : 'line-clamp-2'}`}
            >
                "
                {prompt.replace(
                    /<<<<IMAGE_START>>>>.*?<<<<IMAGE_END>>>>/g,
                    '[Image]'
                )}
                "
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
    )
}
