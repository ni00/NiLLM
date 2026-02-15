import { Button } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { LLMModel } from '@/lib/types'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog'

interface ModelEditDialogProps {
    editForm: Partial<LLMModel>
    setEditForm: (val: any) => void
    onClose: () => void
    onSave: () => void
}

export const ModelEditDialog = ({
    editForm,
    setEditForm,
    onClose,
    onSave
}: ModelEditDialogProps) => {
    return (
        <Dialog open={!!editForm} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md border-primary/20">
                <DialogHeader>
                    <DialogTitle>Edit Model Details</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh]">
                    <CardContent className="space-y-4 p-6 pb-8">
                        <div className="space-y-2">
                            <Label>Display Name</Label>
                            <Input
                                value={editForm.name || ''}
                                onChange={(e) =>
                                    setEditForm((prev: any) => ({
                                        ...prev,
                                        name: e.target.value
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Provider Type</Label>
                            <SelectDropdown
                                value={editForm.provider || ''}
                                onChange={(val) =>
                                    setEditForm((prev: any) => ({
                                        ...prev,
                                        provider: val as any
                                    }))
                                }
                                options={[
                                    {
                                        label: 'OpenRouter',
                                        value: 'openrouter'
                                    },
                                    { label: 'OpenAI', value: 'openai' },
                                    { label: 'Anthropic', value: 'anthropic' },
                                    { label: 'Google', value: 'google' },
                                    { label: 'Custom', value: 'custom' }
                                ]}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Model Mode</Label>
                            <SelectDropdown
                                value={editForm.mode || 'chat'}
                                onChange={(val) =>
                                    setEditForm((prev: any) => ({
                                        ...prev,
                                        mode: val as any
                                    }))
                                }
                                options={[
                                    { label: 'Chat Completion', value: 'chat' },
                                    {
                                        label: 'Image Generation',
                                        value: 'image'
                                    }
                                ]}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Provider Tag (Optional)</Label>
                            <Input
                                placeholder="Display name on card"
                                value={editForm.providerName || ''}
                                onChange={(e) =>
                                    setEditForm((prev: any) => ({
                                        ...prev,
                                        providerName: e.target.value
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Model ID</Label>
                            <Input
                                value={editForm.providerId || ''}
                                onChange={(e) =>
                                    setEditForm((prev: any) => ({
                                        ...prev,
                                        providerId: e.target.value
                                    }))
                                }
                                placeholder="e.g. openai/gpt-4"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>API Key (Optional)</Label>
                            <Input
                                type="password"
                                value={editForm.apiKey || ''}
                                onChange={(e) =>
                                    setEditForm((prev: any) => ({
                                        ...prev,
                                        apiKey: e.target.value
                                    }))
                                }
                                placeholder="Leave empty to use global"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Base URL (Optional)</Label>
                            <Input
                                value={editForm.baseURL || ''}
                                onChange={(e) =>
                                    setEditForm((prev: any) => ({
                                        ...prev,
                                        baseURL: e.target.value
                                    }))
                                }
                                placeholder="https://api.example.com/v1"
                            />
                        </div>
                    </CardContent>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={onSave} className="shadow-sm">
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
