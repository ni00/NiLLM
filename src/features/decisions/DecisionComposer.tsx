import { useId, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import {
    Dialog,
    DialogContent,
    DialogBody,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import {
    DECISION_EXAMPLE,
    decisionRequestSchema,
    parseDecisionPrompt
} from './domain'

export function DecisionComposer({
    input,
    onApply
}: {
    input: string
    onApply: (value: string) => void
}) {
    const t = useI18n()
    const id = useId()
    const [open, setOpen] = useState(false)
    const [state, setState] = useState('')
    const [stateMode, setStateMode] = useState('text')
    const [questions, setQuestions] = useState('')
    const [error, setError] = useState('')
    const begin = () => {
        let request = DECISION_EXAMPLE
        try {
            request = parseDecisionPrompt(input)
        } catch {
            if (input.trim()) request = { ...request, state: input }
        }
        setState(
            typeof request.state === 'string'
                ? request.state
                : JSON.stringify(request.state, null, 2)
        )
        setStateMode(typeof request.state === 'string' ? 'text' : 'json')
        setQuestions(JSON.stringify(request.questions, null, 2))
        setError('')
        setOpen(true)
    }
    const apply = () => {
        try {
            const request = decisionRequestSchema.parse({
                state: stateMode === 'text' ? state : JSON.parse(state),
                questions: JSON.parse(questions)
            })
            onApply(JSON.stringify(request, null, 2))
            setOpen(false)
        } catch {
            setError(
                t(
                    'Check the state and question definitions. Choice needs options; Score needs 2–10 levels.'
                )
            )
        }
    }
    return (
        <>
            <Button variant="outline" size="sm" onClick={begin}>
                {t('Edit decision input')}
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{t('Decision input')}</DialogTitle>
                        <DialogDescription>
                            {t(
                                'Define the state and questions once. Every selected decision model receives the same independent task.'
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogBody className="space-y-3">
                        <div className="flex gap-3 justify-between items-center">
                            <Label htmlFor={`${id}-state`}>{t('State')}</Label>
                            <SelectDropdown
                                ariaLabel={t('State format')}
                                value={stateMode}
                                onChange={setStateMode}
                                options={[
                                    { value: 'text', label: t('Text') },
                                    { value: 'json', label: 'JSON' }
                                ]}
                            />
                        </div>
                        <Textarea
                            id={`${id}-state`}
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            className="min-h-24"
                        />
                        <Label htmlFor={`${id}-questions`}>
                            {t('Questions')}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            {t(
                                'Choice selects an option; Score rates ordered levels from zero; Noul returns the probability of yes. Questions use type, instructions and criteria.'
                            )}
                        </p>
                        <Textarea
                            id={`${id}-questions`}
                            value={questions}
                            onChange={(e) => setQuestions(e.target.value)}
                            className="min-h-60 font-mono text-xs"
                        />
                        {error && (
                            <p
                                role="alert"
                                className="text-sm text-destructive"
                            >
                                {error}
                            </p>
                        )}
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button onClick={apply}>
                            {t('Apply decision input')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
