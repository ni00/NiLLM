import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Sparkles,
    BrainCircuit,
    Code2,
    CheckCircle2,
    FileJson,
    Pencil,
    Download,
    Trash2,
    RotateCcw,
    Play,
    Loader2,
    GripVertical
} from 'lucide-react'
import { TestSet } from '@/lib/types'

interface TestSetCardProps {
    testSet: TestSet
    isStored: boolean
    isRunning: boolean
    onEdit: (set: TestSet) => void
    onExport: (set: TestSet) => void
    onDelete: (id: string) => void
    onRun: (set: TestSet) => void
    onRunSingle: (prompt: string) => void
    dragHandleProps?: any
}

function getTestSetIcon(setId: string) {
    if (setId.includes('logic'))
        return <BrainCircuit className="h-4 w-4 text-blue-500" />
    if (setId.includes('creative'))
        return <Sparkles className="h-4 w-4 text-amber-500" />
    if (setId.includes('coding'))
        return <Code2 className="h-4 w-4 text-emerald-500" />
    if (setId.includes('roleplay'))
        return <CheckCircle2 className="h-4 w-4 text-purple-500" />
    return <FileJson className="h-4 w-4 text-primary" />
}

export function TestSetCard({
    testSet,
    isStored,
    isRunning,
    onEdit,
    onExport,
    onDelete,
    onRun,
    onRunSingle,
    dragHandleProps
}: TestSetCardProps) {
    const isBuiltIn = testSet.id.startsWith('builtin')

    return (
        <Card className="group relative overflow-hidden py-4 gap-2">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div
                            {...dragHandleProps}
                            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded-md transition-colors shrink-0"
                        >
                            <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                        <div className="p-2 rounded-lg bg-background shadow-sm shrink-0 border">
                            {getTestSetIcon(testSet.id)}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                            <CardTitle className="text-lg font-semibold truncate">
                                {testSet.name}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {testSet.cases.length} evaluation cases
                            </CardDescription>
                        </div>
                    </div>

                    <div className="flex gap-1 shrink-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                            onClick={() => onEdit(testSet)}
                            title="Edit"
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                            onClick={() => onExport(testSet)}
                            title="Export to JSON"
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                        {!isBuiltIn ? (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                                onClick={() => onDelete(testSet.id)}
                                title="Delete"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        ) : (
                            isStored && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                                    onClick={() => onDelete(testSet.id)}
                                    title="Reset to default"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                </Button>
                            )
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2 mb-4">
                    {testSet.cases.slice(0, 3).map((c) => (
                        <div
                            key={c.id}
                            className="group/item flex items-center justify-between gap-2 text-xs bg-background/50 p-2 rounded-md hover:bg-background border border-transparent hover:border-border transition-all cursor-pointer overflow-hidden"
                            onClick={() => onRunSingle(c.prompt)}
                        >
                            <span className="truncate flex-1 italic text-muted-foreground">
                                "{c.prompt}"
                            </span>
                            <Play className="h-3 w-3 text-primary opacity-0 group-hover/item:opacity-100 transition-opacity" />
                        </div>
                    ))}
                    {testSet.cases.length > 3 && (
                        <div
                            className="text-xs text-muted-foreground/50 text-center italic cursor-pointer hover:text-primary transition-colors"
                            onClick={() => onEdit(testSet)}
                        >
                            + {testSet.cases.length - 3} more cases
                        </div>
                    )}
                </div>
                <Button
                    className="w-full gap-2"
                    onClick={() => onRun(testSet)}
                    disabled={isRunning}
                >
                    {isRunning ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Play className="mr-2 h-4 w-4" />
                    )}
                    Run Batch Evaluation
                </Button>
            </CardContent>
        </Card>
    )
}
