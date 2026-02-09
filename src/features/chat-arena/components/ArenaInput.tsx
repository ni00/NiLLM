import { Play, Send, Eraser } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAppStore } from '@/lib/store'

interface ArenaInputProps {
    input: string
    setInput: (val: string) => void
    onSend: () => void
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
    isProcessing: boolean
}

export const ArenaInput = ({
    input,
    setInput,
    onSend,
    onKeyDown,
    isProcessing
}: ArenaInputProps) => {
    const { clearActiveSession } = useAppStore()

    return (
        <div className="flex-none p-4 pt-2 bg-background border-t z-20">
            <div className="relative w-full group">
                <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Send a message to all models..."
                    className="min-h-[64px] max-h-[160px] pr-12 resize-none shadow-sm pb-10"
                />
                <div className="absolute bottom-2 left-2 flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearActiveSession}
                        className="h-7 px-2 text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all opacity-0 group-hover:opacity-100"
                    >
                        <Eraser className="w-3 h-3 mr-1.5" /> Clear Context
                    </Button>
                </div>
                <Button
                    onClick={onSend}
                    disabled={isProcessing}
                    className="absolute bottom-3 right-3 h-8 w-8 p-0 rounded-full shadow-md"
                    size="icon"
                >
                    {isProcessing ? (
                        <Play className="h-4 w-4 animate-spin" />
                    ) : (
                        <Send className="h-4 w-4" />
                    )}
                </Button>
            </div>
        </div>
    )
}
