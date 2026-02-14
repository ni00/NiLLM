import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
    GripVertical,
    Zap,
    Clock,
    BarChart3,
    Trash2,
    Copy,
    Pencil
} from 'lucide-react'
import { LLMModel } from '@/lib/types'

interface ModelCardProps {
    model: LLMModel
    isActive: boolean
    avgTPS: string
    avgTTFT: string
    totalTokens: number
    onEdit: (model: LLMModel) => void
    onDuplicate: (model: LLMModel) => void
    onDelete: (id: string) => void
    onToggle: (id: string) => void
    dragHandleProps?: any
}

export function ModelCard({
    model,
    isActive,
    avgTPS,
    avgTTFT,
    totalTokens,
    onEdit,
    onDuplicate,
    onDelete,
    onToggle,
    dragHandleProps
}: ModelCardProps) {
    return (
        <Card
            className={`group relative overflow-hidden h-full transition-all duration-300 bg-gradient-to-br from-card/80 via-card/50 to-muted/5 backdrop-blur-xl border-border/30 hover:shadow-lg`}
        >
            <div
                className={`absolute top-0 left-0 w-[2px] h-full transition-all duration-500 ${isActive ? 'bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]' : 'bg-transparent opacity-0'}`}
            />

            <div className="p-4 flex flex-col gap-3 h-full">
                <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1 min-w-0 mr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <div
                                {...dragHandleProps}
                                className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-muted/50 rounded transition-colors"
                            >
                                <GripVertical className="h-3 w-3 text-muted-foreground/40" />
                            </div>
                            <span className="text-[10px] font-bold tracking-wider text-primary uppercase">
                                {model.providerName || model.provider}
                            </span>
                        </div>
                        <h3
                            className="text-sm font-bold tracking-tight text-foreground truncate"
                            title={model.name}
                        >
                            {model.name}
                        </h3>
                    </div>
                    <Switch
                        checked={isActive}
                        onCheckedChange={() => onToggle(model.id)}
                        className="scale-75 data-[state=checked]:bg-primary"
                    />
                </div>

                <div className="grid grid-cols-3 gap-2 py-3 border-y border-border/10">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
                            <Zap className="h-2.5 w-2.5 text-yellow-500" />{' '}
                            Speed
                        </span>
                        <span className="text-xs font-mono font-bold text-foreground">
                            {avgTPS}
                            <span className="text-[9px] ml-0.5 font-normal opacity-50">
                                t/s
                            </span>
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5 text-blue-500" />{' '}
                            Latency
                        </span>
                        <span className="text-xs font-mono font-bold text-foreground">
                            {avgTTFT}
                            <span className="text-[9px] ml-0.5 font-normal opacity-50">
                                ms
                            </span>
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
                            <BarChart3 className="h-2.5 w-2.5 text-green-500" />{' '}
                            Tokens
                        </span>
                        <span className="text-xs font-mono font-bold text-foreground">
                            {(totalTokens / 1000).toFixed(1)}
                            <span className="text-[9px] ml-0.5 font-normal opacity-50">
                                k
                            </span>
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                    <code
                        className="text-[9px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded font-mono truncate flex-1 opacity-70"
                        title={model.providerId}
                    >
                        {model.providerId}
                    </code>

                    <div className="flex items-center gap-1 shrink-0">
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7 rounded-md hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground bg-transparent"
                            onClick={() => onDuplicate(model)}
                            title="Duplicate"
                        >
                            <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7 rounded-md hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground bg-transparent"
                            onClick={() => onEdit(model)}
                            title="Edit"
                        >
                            <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground bg-transparent"
                            onClick={() => onDelete(model.id)}
                            title="Delete"
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    )
}
