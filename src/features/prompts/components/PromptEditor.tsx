import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { X, Save } from 'lucide-react'
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
    if (!isOpen) return null

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-2xl bg-card border shadow-2xl rounded-xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
                <div className="p-4 border-b flex justify-between items-center bg-muted/20">
                    <h3 className="font-semibold">
                        {editingId ? t('Edit Template') : t('New Template')}
                    </h3>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    <div className="space-y-2">
                        <Label>{t('Title')}</Label>
                        <Input
                            value={editForm.title}
                            onChange={(e) =>
                                onChange({ ...editForm, title: e.target.value })
                            }
                            placeholder={t('My Awesome Prompt')}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('Content')}</Label>
                        <div className="text-xs text-muted-foreground mb-1">
                            {t('Use')} <code>{'{{variable}}'}</code>{' '}
                            {t('to define variables.')}
                        </div>
                        <Textarea
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
                                return (
                                    <div
                                        key={vName}
                                        className="grid grid-cols-[100px_1fr] gap-2 items-center"
                                    >
                                        <span className="text-xs font-mono font-medium text-right pr-2">
                                            {vName}
                                        </span>
                                        <Input
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
                <div className="p-4 border-t bg-muted/20 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    <Button
                        onClick={onSave}
                        disabled={!editForm.title || !editForm.content}
                    >
                        <Save className="h-4 w-4 mr-2" /> {t('Save')}
                    </Button>
                </div>
            </div>
        </div>
    )
}
