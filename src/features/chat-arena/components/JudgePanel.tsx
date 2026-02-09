import { Gavel, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LLMModel } from '@/lib/types'

interface JudgePanelProps {
    models: LLMModel[]
    judgeModelId: string
    setJudgeModelId: (id: string) => void
    judgePrompt: string
    setJudgePrompt: (p: string) => void
    isJudging: boolean
    judgeStatus: string | null
    onClose: () => void
    onAutoJudge: () => void
    activeSession: any
}

export const JudgePanel = ({
    models,
    judgeModelId,
    setJudgeModelId,
    judgePrompt,
    setJudgePrompt,
    isJudging,
    judgeStatus,
    onClose,
    onAutoJudge,
    activeSession
}: JudgePanelProps) => {
    return (
        <>
            <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                <h3 className="font-semibold text-base flex items-center gap-2">
                    <Gavel className="w-4 h-4" /> AI Judge Settings
                </h3>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onClose}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
            <div className="p-6 space-y-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                    <Label>Select Judge Model</Label>
                    <div className="grid gap-2 max-h-[200px] overflow-y-auto border rounded-md p-2">
                        {models.map((model) => (
                            <div
                                key={model.id}
                                className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                                    judgeModelId === model.id
                                        ? 'bg-primary/10 border-primary/20'
                                        : 'hover:bg-muted'
                                }`}
                                onClick={() => setJudgeModelId(model.id)}
                            >
                                <div
                                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${judgeModelId === model.id ? 'border-primary bg-primary' : 'border-muted-foreground'}`}
                                >
                                    {judgeModelId === model.id && (
                                        <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">
                                        {model.name}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground truncate">
                                        {model.providerName || model.provider}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-semibold opacity-70 uppercase tracking-wider">
                        Judge System Prompt
                    </Label>
                    <Textarea
                        value={judgePrompt}
                        onChange={(e) => setJudgePrompt(e.target.value)}
                        placeholder="Enter judge instructions..."
                        className="min-h-[150px] text-[13px] leading-relaxed resize-none focus-visible:ring-primary/20"
                    />
                </div>
            </div>
            <div className="p-4 border-t bg-muted/20 flex flex-col gap-3">
                <Button
                    className="w-full"
                    onClick={onAutoJudge}
                    disabled={
                        !judgeModelId ||
                        isJudging ||
                        !activeSession ||
                        !Object.values(activeSession.results).some(
                            (r: any) => r.length > 0
                        )
                    }
                >
                    {isJudging ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Judging Responses...
                        </>
                    ) : (
                        'Start Judging'
                    )}
                </Button>

                {judgeStatus && (
                    <div
                        className={`text-[11px] text-center font-medium px-3 py-1.5 rounded-md ${
                            judgeStatus.startsWith('Error')
                                ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                : 'bg-primary/5 text-primary border border-primary/10'
                        }`}
                    >
                        {judgeStatus}
                    </div>
                )}
            </div>
        </>
    )
}
