import { LLMModel } from '@/lib/types'
import { cn } from '@/lib/utils'

interface MentionPickerProps {
    models: LLMModel[]
    selectedIndex: number
    position: { top: number; left: number }
    onSelect: (model: LLMModel) => void
    onHover: (index: number) => void
}

export function MentionPicker({
    models,
    selectedIndex,
    position,
    onSelect,
    onHover
}: MentionPickerProps) {
    if (models.length === 0) return null

    return (
        <div
            className="absolute z-50 w-64 p-1 overflow-hidden bg-popover text-popover-foreground rounded-md border shadow-md animate-in fade-in zoom-in-95 duration-100"
            style={{
                bottom: position.top + 28,
                left: position.left + 16,
                minWidth: '200px'
            }}
        >
            <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                {models.map((model, idx) => (
                    <button
                        key={model.id}
                        className={cn(
                            'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm select-none outline-none cursor-pointer text-left transition-colors',
                            idx === selectedIndex
                                ? 'bg-accent text-accent-foreground'
                                : 'hover:bg-muted'
                        )}
                        onMouseEnter={() => onHover(idx)}
                        onClick={() => onSelect(model)}
                    >
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        <span className="truncate flex-1">{model.name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">
                            {model.providerName || model.provider}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    )
}
