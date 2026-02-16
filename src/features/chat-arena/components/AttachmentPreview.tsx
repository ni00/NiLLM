import { X, FileText, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AttachmentPreviewProps {
    attachments: File[]
    previews: Record<string, string>
    onRemove: (index: number) => void
    onClearAll: () => void
}

export function AttachmentPreview({
    attachments,
    previews,
    onRemove,
    onClearAll
}: AttachmentPreviewProps) {
    if (attachments.length === 0) return null

    return (
        <div className="flex items-start gap-2">
            <div className="flex gap-3 overflow-x-auto py-1 px-1 flex-1 scrollbar-thin scrollbar-thumb-muted-foreground/20">
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
                            onClick={() => onRemove(idx)}
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
            <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="h-7 px-2 mt-1 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-full flex-shrink-0"
                title="Clear all attachments"
            >
                <Trash2 className="w-3 h-3 mr-1" /> Clear
            </Button>
        </div>
    )
}
