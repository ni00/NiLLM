import { useI18n } from '@/lib/i18n'
import { memo, type ComponentPropsWithRef } from 'react'
import { providerLabel } from '@/lib/providers/catalog'
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
    dragHandleProps?: ComponentPropsWithRef<'button'>
}

export const ModelCard = memo(function ModelCard({
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
    const t = useI18n()
    return (
        <Card className="group relative h-full p-0">
            <div className="p-4 flex flex-col gap-3 h-full">
                <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1 min-w-0 mr-2">
                        <div className="flex items-center gap-2">
                            {dragHandleProps && (
                                <button
                                    type="button"
                                    {...dragHandleProps}
                                    aria-label={t('Drag {name}', {
                                        name: model.name
                                    })}
                                    className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-muted rounded-md transition-colors -ml-1 focus-visible:outline-2 focus-visible:outline-primary"
                                >
                                    <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                                </button>
                            )}
                            <h3
                                className="text-lg font-semibold tracking-tight text-foreground truncate"
                                title={model.name}
                            >
                                {model.name}
                            </h3>
                        </div>
                        <div className={dragHandleProps ? 'pl-6' : ''}>
                            <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                {providerLabel(model)}
                            </span>
                        </div>
                    </div>
                    <Switch
                        checked={isActive}
                        disabled={!model.enabled}
                        aria-label={t('Select {name}', { name: model.name })}
                        onCheckedChange={() => onToggle(model.id)}
                        className="scale-75 data-[state=checked]:bg-primary"
                    />
                </div>

                <div className="grid grid-cols-3 gap-2 py-3 border-y border-border/10">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-yellow-500" />{' '}
                            {t('Speed')}
                        </span>
                        <span className="text-sm font-mono font-bold text-foreground">
                            {avgTPS}
                            <span className="text-xs ml-0.5 font-normal opacity-50">
                                {'t/s'}
                            </span>
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-blue-500" />{' '}
                            {t('Latency')}
                        </span>
                        <span className="text-sm font-mono font-bold text-foreground">
                            {avgTTFT}
                            <span className="text-xs ml-0.5 font-normal opacity-50">
                                {'ms'}
                            </span>
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1.5">
                            <BarChart3 className="h-3.5 w-3.5 text-green-500" />{' '}
                            {t('Tokens')}
                        </span>
                        <span className="text-sm font-mono font-bold text-foreground">
                            {(totalTokens / 1000).toFixed(1)}
                            <span className="text-xs ml-0.5 font-normal opacity-50">
                                {'k'}
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
                            title={t('Duplicate')}
                        >
                            <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7 rounded-md hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground bg-transparent"
                            onClick={() => onEdit(model)}
                            title={t('Edit')}
                        >
                            <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground bg-transparent"
                            onClick={() => onDelete(model.id)}
                            title={t('Delete')}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    )
})
