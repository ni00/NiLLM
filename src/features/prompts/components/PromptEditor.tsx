import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Save } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import type { PromptForm } from '../hooks/usePrompts'

interface PromptEditorProps {
    isOpen: boolean
    editingId: string | null
    editForm: PromptForm
    onClose: () => void
    onSave: () => void
    onChange: (form: PromptForm) => void
}

export function PromptEditor({
    isOpen,
    editingId,
    editForm,
    onClose,
    onSave,
    onChange
}: PromptEditorProps) {
    const t = useI18n()

    const extractedVars =
        editForm.content
            .match(/\{\{([^}]+)\}\}/g)
            ?.map((v) => v.replace(/\{\{|\}\}/g, '').trim()) || []

    const updateVariableDescription = (name: string, description: string) => {
        const newVars = [...editForm.variables]
        const idx = newVars.findIndex((v) => v.name === name)
        if (idx >= 0) {
            newVars[idx] = { ...newVars[idx], description }
        } else {
            newVars.push({ name, description })
        }
        onChange({ ...editForm, variables: newVars })
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>
                        {editingId ? t('Edit Template') : t('New Template')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('Edit the prompt template and its variables.')}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-4 p-1">
                    <div className="space-y-2">
                        <Label htmlFor="prompt-title">{t('Title')}</Label>
                        <Input
                            id="prompt-title"
                            value={editForm.title}
                            onChange={(e) =>
                                onChange({ ...editForm, title: e.target.value })
                            }
                            placeholder={t('My Awesome Prompt')}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="prompt-content">{t('Content')}</Label>
                        <div className="text-xs text-muted-foreground mb-1">
                            {t('Use')} <code>{'{{variable}}'}</code>{' '}
                            {t('to define variables.')}
                        </div>
                        <Textarea
                            id="prompt-content"
                            value={editForm.content}
                            onChange={(e) =>
                                onChange({
                                    ...editForm,
                                    content: e.target.value
                                })
                            }
                            className="min-h-[200px] font-mono text-sm"
                            placeholder={t(
                                'Write a story about {{topic}} in the style of {{author}}...'
                            )}
                        />
                    </div>

                    {extractedVars.length > 0 && (
                        <div className="space-y-3 pt-4 border-t">
                            <Label>{t('Variable Descriptions')}</Label>
                            <p className="text-xs text-muted-foreground">
                                {t(
                                    'Describe your variables to help the AI auto-fill them.'
                                )}
                            </p>
                            {extractedVars.map((vName) => {
                                const match = editForm.variables.find(
                                    (v) => v.name === vName
                                )
                                const inputId = `prompt-var-${vName}`
                                return (
                                    <div
                                        key={vName}
                                        className="grid grid-cols-[100px_1fr] gap-2 items-center"
                                    >
                                        <Label
                                            htmlFor={inputId}
                                            className="text-xs font-mono font-medium text-right pr-2"
                                        >
                                            {vName}
                                        </Label>
                                        <Input
                                            id={inputId}
                                            value={match?.description || ''}
                                            onChange={(e) =>
                                                updateVariableDescription(
                                                    vName,
                                                    e.target.value
                                                )
                                            }
                                            placeholder={t(
                                                'Description for {name}',
                                                { name: vName }
                                            )}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    <Button
                        onClick={onSave}
                        disabled={!editForm.title || !editForm.content}
                    >
                        <Save className="h-4 w-4 mr-2" /> {t('Save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
