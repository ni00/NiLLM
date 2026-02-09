import {
    Layers,
    ChevronUp,
    ChevronDown,
    PlayCircle,
    Pause,
    Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from '@/components/ui/popover'
import { useAppStore } from '@/lib/store'

export const QueuePopover = () => {
    const {
        messageQueue,
        isProcessing,
        removeFromQueue,
        toggleQueuePause,
        reorderQueue
    } = useAppStore()

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="relative pr-3 h-10 px-4"
                >
                    <Layers className="w-4 h-4 mr-2 text-muted-foreground" />
                    {messageQueue.length > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 min-w-[1.25rem] h-5 flex items-center justify-center rounded-full border-2 border-background shadow-sm animate-in zoom-in duration-300">
                            {messageQueue.length}
                        </span>
                    )}
                    Queue
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
                <div className="flex items-center justify-between border-b pb-2 mb-3">
                    <h3 className="font-semibold text-sm">Processing Queue</h3>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                        {messageQueue.filter((m) => !m.paused).length} Active
                    </span>
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {messageQueue.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground italic text-sm">
                            Queue is empty
                        </div>
                    ) : (
                        messageQueue.map((item, index) => (
                            <div
                                key={item.id}
                                className={`flex items-start gap-2 p-2 rounded-lg border text-xs group/item transition-all ${
                                    item.paused
                                        ? 'bg-muted/50 border-dashed opacity-70'
                                        : 'bg-card border-solid shadow-sm'
                                }`}
                            >
                                <div className="flex flex-col gap-0.5 mt-0.5">
                                    <button
                                        disabled={index === 0}
                                        onClick={() =>
                                            reorderQueue(index, index - 1)
                                        }
                                        className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                                    >
                                        <ChevronUp className="w-3 h-3" />
                                    </button>
                                    <button
                                        disabled={
                                            index === messageQueue.length - 1
                                        }
                                        onClick={() =>
                                            reorderQueue(index, index + 1)
                                        }
                                        className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                                    >
                                        <ChevronDown className="w-3 h-3" />
                                    </button>
                                </div>
                                <div className="flex-1 min-w-0 py-1">
                                    <div
                                        className={`truncate font-medium ${
                                            item.paused
                                                ? 'line-through text-muted-foreground'
                                                : ''
                                        }`}
                                    >
                                        {item.prompt}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground mt-0.5 flex gap-2">
                                        <span>
                                            {item.paused
                                                ? 'Paused'
                                                : index === 0 &&
                                                    !item.paused &&
                                                    isProcessing
                                                  ? 'Processing...'
                                                  : 'Pending'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-1 self-center">
                                    <button
                                        onClick={() =>
                                            toggleQueuePause(item.id)
                                        }
                                        className={`p-1.5 rounded-md transition-colors ${
                                            item.paused
                                                ? 'hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500'
                                                : 'hover:bg-amber-500/10 text-muted-foreground hover:text-amber-500'
                                        }`}
                                        title={item.paused ? 'Resume' : 'Pause'}
                                    >
                                        {item.paused ? (
                                            <PlayCircle className="w-3.5 h-3.5" />
                                        ) : (
                                            <Pause className="w-3.5 h-3.5" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => removeFromQueue(item.id)}
                                        className="p-1.5 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive transition-colors"
                                        title="Remove"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
