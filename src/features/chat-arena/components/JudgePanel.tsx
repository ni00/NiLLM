import { useI18n } from '@/lib/i18n'
import {
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter
} from '@/components/ui/dialog'
import { Gavel, Loader2, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ChatSession, LLMModel } from '@/lib/types'
import { useId } from 'react'
import { useAppStore } from '@/lib/store'
import { resultStatus } from '@/features/stats/domain/statistics'

interface JudgePanelProps {
    models: LLMModel[]
    activeModels: LLMModel[]
    judgeModelId: string
    setJudgeModelId: (id: string) => void
    judgePrompt: string
    setJudgePrompt: (p: string) => void
    isJudging: boolean
    judgeStatus: string | null
    onAutoJudge: () => void
    onCancel: () => void
    activeSession: ChatSession | undefined
}

export const JudgePanel = ({
    models,
    activeModels,
    judgeModelId,
    setJudgeModelId,
    judgePrompt,
    setJudgePrompt,
    isJudging,
    judgeStatus,
    onAutoJudge,
    onCancel,
    activeSession
}: JudgePanelProps) => {
    const t = useI18n()
    const radioGroup = useId()
    const isProcessing = useAppStore((state) => state.isProcessing)
    const eligibleModels = models.filter(
        (model) => model.enabled && (model.mode ?? 'chat') === 'chat'
    )
    const hasCompletedResponse = activeModels.some((model) => {
        if (model.mode === 'image') return false
        const result = activeSession?.results[model.id]?.at(-1)
        return result !== undefined && resultStatus(result) === 'completed'
    })
    return (
        <>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Gavel className="w-4 h-4" /> {t('AI Judge Settings')}
                </DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
                <div className="space-y-2">
                    <Label>{t('Select Judge Model')}</Label>
                    <div className="grid gap-2 max-h-[200px] overflow-y-auto border rounded-md p-2">
                        {eligibleModels.map((model) => (
                            <label
                                key={model.id}
                                className={`flex min-h-11 items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                                    judgeModelId === model.id
                                        ? 'bg-primary/10 border-primary/20'
                                        : 'hover:bg-muted'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name={radioGroup}
                                    value={model.id}
                                    checked={judgeModelId === model.id}
                                    onChange={() => setJudgeModelId(model.id)}
                                    className="h-4 w-4 accent-primary"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">
                                        {model.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                        {model.providerName || model.provider}
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label
                        htmlFor="judge-system-prompt"
                        className="text-xs font-semibold opacity-70 uppercase tracking-wider"
                    >
                        {t('Judge System Prompt')}
                    </Label>
                    <Textarea
                        id="judge-system-prompt"
                        value={judgePrompt}
                        onChange={(e) => setJudgePrompt(e.target.value)}
                        placeholder={t('Enter judge instructions...')}
                        className="min-h-[150px] text-sm leading-relaxed resize-none focus-visible:ring-primary/20"
                    />
                </div>
            </DialogBody>
            <DialogFooter className="flex-col sm:flex-col gap-3">
                <Button
                    className="w-full"
                    onClick={onAutoJudge}
                    disabled={
                        !eligibleModels.some(
                            (model) => model.id === judgeModelId
                        ) ||
                        isJudging ||
                        isProcessing ||
                        !hasCompletedResponse
                    }
                >
                    {isJudging ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {t('Judging Responses...')}
                        </>
                    ) : (
                        t('Start Judging')
                    )}
                </Button>
                <p className="text-sm text-muted-foreground">
                    {t('Text judging uses only completed chat responses.')}
                </p>

                {isJudging && (
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={onCancel}
                    >
                        <Square className="w-4 h-4 mr-2" />
                        {t('Cancel')}
                    </Button>
                )}

                {judgeStatus && (
                    <div
                        className={`text-xs text-center font-medium px-3 py-1.5 rounded-md ${
                            judgeStatus.startsWith('Error')
                                ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                : 'bg-primary/5 text-primary border border-primary/10'
                        }`}
                    >
                        {judgeStatus.startsWith('Consulting ')
                            ? t('Consulting {name}…', {
                                  name: judgeStatus.slice(11, -3)
                              })
                            : judgeStatus.startsWith('Error: ')
                              ? t('Error: {message}', {
                                    message: t(judgeStatus.slice(7))
                                })
                              : t(judgeStatus)}
                    </div>
                )}
            </DialogFooter>
        </>
    )
}
