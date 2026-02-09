import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { LLMModel } from '@/lib/types'

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <Card className="w-full max-w-md shadow-lg border-primary/20 bg-background max-h-[90vh] flex flex-col gap-0 p-0">
                <CardHeader className="flex flex-row items-center justify-between border-b p-4 flex-none space-y-0">
                    <CardTitle className="text-base font-semibold">
                        Edit Model Details
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={onClose}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <ScrollArea className="flex-1 min-h-0 overflow-hidden">
                    <CardContent className="space-y-4 p-4 pb-6">
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
                            <select
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                value={editForm.provider}
                                onChange={(e) =>
                                    setEditForm((prev: any) => ({
                                        ...prev,
                                        provider: e.target.value as any
                                    }))
                                }
                            >
                                <option value="openrouter">OpenRouter</option>
                                <option value="openai">OpenAI</option>
                                <option value="anthropic">Anthropic</option>
                                <option value="google">Google</option>
                                <option value="custom">Custom</option>
                            </select>
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
                <div className="flex-none p-4 border-t flex justify-end gap-2 bg-muted/5 rounded-b-lg">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={onSave}>Save Changes</Button>
                </div>
            </Card>
        </div>
    )
}
