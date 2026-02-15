import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Play, Pencil, Trash2, Download, GripVertical } from 'lucide-react'
import { PromptTemplate } from '@/lib/types'

interface PromptCardProps {
    template: PromptTemplate
    onEdit: (template: PromptTemplate) => void
    onExport: (template: PromptTemplate) => void
    onDelete: (id: string) => void
    onUse: (template: PromptTemplate) => void
    dragHandleProps?: any
}

export function PromptCard({
    template,
    onEdit,
    onExport,
    onDelete,
    onUse,
    dragHandleProps
}: PromptCardProps) {
    return (
        <Card className="group relative py-4 gap-2">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3 space-y-0 text-left min-w-0">
                        <div
                            {...dragHandleProps}
                            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded-md transition-colors -ml-1.5"
                        >
                            <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                        <div className="space-y-1 min-w-0">
                            <CardTitle
                                className="text-lg font-semibold line-clamp-1"
                                title={template.title}
                            >
                                {template.title}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {template.variables.length} variables •{' '}
                                {new Date(
                                    template.updatedAt
                                ).toLocaleDateString()}
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex gap-1 shrink-0 ml-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(template)}
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onExport(template)}
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(template.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="bg-muted/30 p-3 rounded-md text-xs font-mono text-muted-foreground line-clamp-3 mb-4 h-16">
                    {template.content}
                </div>
                <Button
                    className="w-full gap-2"
                    onClick={() => onUse(template)}
                >
                    <Play className="h-4 w-4" /> Use Template
                </Button>
            </CardContent>
        </Card>
    )
}
