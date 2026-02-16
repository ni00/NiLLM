import { Play, Send, Eraser, Paperclip, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
    useClearActiveSession,
    useStopAll,
    useModels,
    useActiveModelIds
} from '@/lib/hooks/useStoreSelectors'
import { useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { abortAllTasks } from '@/features/benchmark/engine'
import { MentionPicker } from './MentionPicker'
import { AttachmentPreview } from './AttachmentPreview'

interface ArenaInputProps {
    input: string
    setInput: (val: string) => void
    onSend: () => void
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
    isProcessing: boolean
    attachments: File[]
    setAttachments: React.Dispatch<React.SetStateAction<File[]>>
    onExpand?: () => void
    className?: string
    textareaClassName?: string
}

export const ArenaInput = ({
    input,
    setInput,
    onSend,
    onKeyDown,
    isProcessing,
    attachments,
    setAttachments,
    onExpand,
    className,
    textareaClassName
}: ArenaInputProps) => {
    const clearActiveSession = useClearActiveSession()
    const stopAll = useStopAll()
    const models = useModels()
    const activeModelIds = useActiveModelIds()
    const activeModels = models.filter((m) => activeModelIds.includes(m.id))

    const [mentionQuery, setMentionQuery] = useState<string | null>(null)
    const [mentionIndex, setMentionIndex] = useState(0)
    const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 })
    const filteredModels =
        mentionQuery !== null
            ? activeModels.filter((m) =>
                  m.name.toLowerCase().includes(mentionQuery.toLowerCase())
              )
            : []

    const fileInputRef = useRef<HTMLInputElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const measureRef = useRef<HTMLDivElement>(null)

    const [previews, setPreviews] = useState<Record<string, string>>({})
    const [isDragging, setIsDragging] = useState(false)

    useEffect(() => {
        if (mentionQuery !== null) {
            setMentionIndex(0)
        }
    }, [mentionQuery])

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.currentTarget.contains(e.relatedTarget as Node)) {
            return
        }
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files)
            setAttachments((prev) => [...prev, ...files])
        }
    }

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

        const span = document.createElement('span')
        span.textContent = '.'
        measureRef.current.appendChild(span)

        const { offsetLeft, offsetTop } = span
        const scrollTop = textarea.scrollTop
        const clientHeight = textarea.clientHeight

        const bottom = clientHeight - (offsetTop - scrollTop)

        setMentionPosition({
            left: offsetLeft,
            top: bottom
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
            if (!/\s/.test(textAfterAt) || textAfterAt.length === 0) {
                setMentionQuery(textAfterAt)
                requestAnimationFrame(() => updateMeasurePosition(e.target))
                return
            }
        }
        setMentionQuery(null)
    }

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

        setTimeout(() => {
            if (textareaRef.current) {
                const newCursor = lastAt + model.name.length + 2
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
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files)
            setAttachments((prev) => [...prev, ...files])
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
        <div
            className={cn(
                'flex-none p-4 pt-2 bg-background border-t z-20 transition-all duration-200',
                className
            )}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div
                className={cn(
                    'relative w-full group flex flex-col gap-2',
                    className?.includes('h-full') ? 'h-full' : ''
                )}
            >
                <div
                    ref={measureRef}
                    className="absolute top-0 left-0 visibility-hidden pointer-events-none opacity-0 whitespace-pre-wrap -z-50"
                    aria-hidden="true"
                />

                {mentionQuery !== null && (
                    <MentionPicker
                        models={filteredModels}
                        selectedIndex={mentionIndex}
                        position={mentionPosition}
                        onSelect={selectModel}
                        onHover={setMentionIndex}
                    />
                )}

                <input
                    type="file"
                    multiple
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                />

                <AttachmentPreview
                    attachments={attachments}
                    previews={previews}
                    onRemove={removeAttachment}
                    onClearAll={() => setAttachments([])}
                />

                <div
                    className={cn(
                        'relative',
                        className?.includes('h-full') ? 'flex-1' : ''
                    )}
                >
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
                            'min-h-[80px] max-h-[200px] resize-none shadow-sm rounded-xl p-3',
                            'focus-visible:ring-primary/20',
                            'font-sans text-sm leading-relaxed',
                            textareaClassName
                        )}
                        onDragOver={handleDragOver}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    />

                    {isDragging && (
                        <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-xl flex items-center justify-center backdrop-blur-[2px] pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                            <div className="bg-background/90 px-4 py-2 rounded-full shadow-lg border flex items-center gap-2">
                                <Paperclip className="w-4 h-4 text-primary" />
                                <span className="text-sm font-medium">
                                    Drop files to attach
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
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
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all rounded-full"
                        >
                            <Eraser className="w-3 h-3 mr-1.5" /> Clear Context
                        </Button>
                        {onExpand && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onExpand}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted"
                                title="Expand to full screen"
                            >
                                <Maximize2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground hidden sm:inline-block">
                            Enter for new line, Shift+Enter to send
                        </span>
                        <Button
                            onClick={onSend}
                            disabled={
                                isProcessing ||
                                (!input.trim() && attachments.length === 0)
                            }
                            className="h-8 w-8 p-0 rounded-full shadow-md"
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
        </div>
    )
}
