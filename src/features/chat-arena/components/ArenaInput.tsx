import { Play, Send, Eraser, Paperclip, X, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAppStore } from '@/lib/store'
import { useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { abortAllTasks } from '@/features/benchmark/engine'

interface ArenaInputProps {
    input: string
    setInput: (val: string) => void
    onSend: () => void
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
    isProcessing: boolean
    attachments: File[]
    setAttachments: (files: File[]) => void
}

export const ArenaInput = ({
    input,
    setInput,
    onSend,
    onKeyDown,
    isProcessing,
    attachments,
    setAttachments
}: ArenaInputProps) => {
    const { clearActiveSession, stopAll, models, activeModelIds } =
        useAppStore()
    const activeModels = models.filter((m) => activeModelIds.includes(m.id))

    // Mention state
    const [mentionQuery, setMentionQuery] = useState<string | null>(null)
    const [mentionIndex, setMentionIndex] = useState(0)
    const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 })
    const filteredModels =
        mentionQuery !== null
            ? activeModels.filter((m) =>
                  m.name.toLowerCase().includes(mentionQuery.toLowerCase())
              )
            : []

    // Refs for safe measuring
    const fileInputRef = useRef<HTMLInputElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null) // We need a ref to the Textarea component's underlying input
    const measureRef = useRef<HTMLDivElement>(null)

    // We need to access the underlying textarea DOM element.
    // Since ShadCN Textarea forwards ref, we can use a callback ref or just standard ref if it works.
    // Let's assume Textarea component forwards ref correctly to the HTMLTextAreaElement.

    const [previews, setPreviews] = useState<Record<string, string>>({})

    useEffect(() => {
        if (mentionQuery !== null) {
            setMentionIndex(0)
        }
    }, [mentionQuery])

    // Update measure div to match textarea styles
    const updateMeasurePosition = (textarea: HTMLTextAreaElement) => {
        if (!measureRef.current) return

        const style = window.getComputedStyle(textarea)
        measureRef.current.style.width = style.width
        measureRef.current.style.font = style.font
        measureRef.current.style.padding = style.padding
        measureRef.current.style.border = style.border
        measureRef.current.style.lineHeight = style.lineHeight
        measureRef.current.style.whiteSpace = 'pre-wrap'
        measureRef.current.style.wordWrap = 'break-word'

        const textUntilCursor = textarea.value.substring(
            0,
            textarea.selectionStart
        )
        measureRef.current.textContent = textUntilCursor

        // Use a span to get the exact position of the last character
        const span = document.createElement('span')
        span.textContent = '.' // placeholder
        measureRef.current.appendChild(span)

        const { offsetLeft, offsetTop } = span
        const scrollTop = textarea.scrollTop
        const clientHeight = textarea.clientHeight

        // Calculate position relative to bottom-left of the textarea container
        // We want the menu to appear ABOVE the cursor line.
        // Cursor Y relative to top = offsetTop - scrollTop
        // Distance from bottom = clientHeight - (offsetTop - scrollTop)
        // We add a little buffer (e.g. 24px line height) to position it "above" the current line

        const bottom = clientHeight - (offsetTop - scrollTop)

        setMentionPosition({
            left: offsetLeft,
            top: bottom // reusing 'top' property name to store bottom offset for simplicity, or we can rename state
        })

        measureRef.current.removeChild(span)
    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newVal = e.target.value
        setInput(newVal)

        const cursor = e.target.selectionStart
        const textBeforeCursor = newVal.substring(0, cursor)
        const lastAt = textBeforeCursor.lastIndexOf('@')

        if (lastAt !== -1) {
            const textAfterAt = textBeforeCursor.substring(lastAt + 1)
            // Valid matches: empty (just typed @), or no whitespace
            if (!/\s/.test(textAfterAt) || textAfterAt.length === 0) {
                setMentionQuery(textAfterAt)
                // We need to wait for render/layout if height changed,
                // but usually textarea height update happens after.
                // For safety pass the element directly.
                requestAnimationFrame(() => updateMeasurePosition(e.target))
                return
            }
        }
        setMentionQuery(null)
    }

    // Override keydown for navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (mentionQuery !== null && filteredModels.length > 0) {
            if (e.key === 'ArrowUp') {
                e.preventDefault()
                setMentionIndex((i) =>
                    i > 0 ? i - 1 : filteredModels.length - 1
                )
                return
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setMentionIndex((i) =>
                    i < filteredModels.length - 1 ? i + 1 : 0
                )
                return
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault()
                selectModel(filteredModels[mentionIndex])
                return
            }
            if (e.key === 'Escape') {
                setMentionQuery(null)
                return
            }
        }
        onKeyDown(e)
    }

    const selectModel = (model: { name: string }) => {
        if (!textareaRef.current) return

        const cursor = textareaRef.current.selectionStart
        const text = input
        const lastAt = text.substring(0, cursor).lastIndexOf('@')

        const newText =
            text.substring(0, lastAt) +
            `@${model.name} ` +
            text.substring(cursor)
        setInput(newText)
        setMentionQuery(null)

        // Reset cursor focus and position (setTimeout to allow render)
        setTimeout(() => {
            if (textareaRef.current) {
                const newCursor = lastAt + model.name.length + 2 // @ + name + space
                textareaRef.current.selectionStart = newCursor
                textareaRef.current.selectionEnd = newCursor
                textareaRef.current.focus()
            }
        }, 0)
    }

    useEffect(() => {
        const newPreviews: Record<string, string> = {}
        let isMounted = true

        const processFiles = async () => {
            for (const file of attachments) {
                if (file.type.startsWith('image/')) {
                    const url = URL.createObjectURL(file)
                    newPreviews[file.name] = url
                }
            }
            if (isMounted) {
                setPreviews(newPreviews)
            }
        }

        processFiles()

        return () => {
            isMounted = false
            Object.values(newPreviews).forEach((url) =>
                URL.revokeObjectURL(url)
            )
        }
    }, [attachments])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setAttachments([...attachments, ...Array.from(e.target.files)])
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const removeAttachment = (index: number) => {
        const newAttachments = [...attachments]
        newAttachments.splice(index, 1)
        setAttachments(newAttachments)
    }

    const handleClearContext = () => {
        stopAll()
        clearActiveSession()
        abortAllTasks()
    }

    return (
        <div className="flex-none p-4 pt-2 bg-background border-t z-20">
            <div className="relative w-full group">
                {/* Hidden measure div for caret positioning */}
                <div
                    ref={measureRef}
                    className="absolute top-0 left-0 visibility-hidden pointer-events-none opacity-0 whitespace-pre-wrap -z-50"
                    aria-hidden="true"
                />

                {/* Mention Popover */}
                {mentionQuery !== null && filteredModels.length > 0 && (
                    <div
                        className="absolute z-50 w-64 p-1 overflow-hidden bg-popover text-popover-foreground rounded-md border shadow-md animate-in fade-in zoom-in-95 duration-100"
                        style={{
                            bottom: mentionPosition.top + 28, // Position above the cursor line
                            left: mentionPosition.left + 16,
                            minWidth: '200px'
                        }}
                    >
                        <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                            {filteredModels.map((model, idx) => (
                                <button
                                    key={model.id}
                                    className={cn(
                                        'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm select-none outline-none cursor-pointer text-left transition-colors',
                                        idx === mentionIndex
                                            ? 'bg-accent text-accent-foreground'
                                            : 'hover:bg-muted'
                                    )}
                                    // Mouse enter to set index creates a nice hover effect combined with keyboard
                                    onMouseEnter={() => setMentionIndex(idx)}
                                    onClick={() => selectModel(model)}
                                >
                                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                                    <span className="truncate flex-1">
                                        {model.name}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground uppercase">
                                        {model.providerName || model.provider}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <input
                    type="file"
                    multiple
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                />

                {attachments.length > 0 && (
                    <div className="flex gap-3 mb-3 overflow-x-auto py-1 px-1 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                        {attachments.map((file, idx) => (
                            <div
                                key={idx + file.name}
                                className="relative flex-none group/attachment"
                            >
                                <div className="border rounded-lg overflow-hidden bg-muted relative w-16 h-16 flex items-center justify-center shadow-sm">
                                    {file.type.startsWith('image/') &&
                                    previews[file.name] ? (
                                        <img
                                            src={previews[file.name]}
                                            alt={file.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <FileText className="w-8 h-8 text-muted-foreground/50" />
                                    )}
                                    <div className="absolute inset-0 bg-black/0 group-hover/attachment:bg-black/10 transition-colors" />
                                </div>
                                <button
                                    onClick={() => removeAttachment(idx)}
                                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md opacity-0 group-hover/attachment:opacity-100 transition-all scale-90 group-hover/attachment:scale-100 z-10"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                                <div className="text-[10px] text-muted-foreground truncate w-16 mt-1.5 text-center font-medium">
                                    {file.name}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="relative">
                    <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            attachments.length > 0
                                ? 'Add a message...'
                                : 'Send a message to all models... (Use @ to mention models)'
                        }
                        className={cn(
                            'min-h-[64px] max-h-[160px] pr-12 resize-none shadow-sm pb-10 pl-10 rounded-xl',
                            'focus-visible:ring-primary/20',
                            // Ensure font matches measure div
                            'font-sans text-sm leading-relaxed'
                        )}
                    />

                    <div className="absolute bottom-2 left-2 flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => fileInputRef.current?.click()}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted"
                            title="Attach files"
                        >
                            <Paperclip className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearContext}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 rounded-full"
                        >
                            <Eraser className="w-3 h-3 mr-1.5" /> Clear Context
                        </Button>
                    </div>

                    <Button
                        onClick={onSend}
                        disabled={
                            isProcessing ||
                            (!input.trim() && attachments.length === 0)
                        }
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
        </div>
    )
}
