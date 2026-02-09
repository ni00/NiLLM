import { useNavigate } from 'react-router'
import { X, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAppStore } from '@/lib/store'
import { ConfigEditor } from './ConfigEditor'
import { cn } from '@/lib/utils'

interface ArenaSettingsProps {
    arenaSettingsTab: 'models' | 'prompt' | 'params'
    setArenaSettingsTab: (tab: 'models' | 'prompt' | 'params') => void
    onClose: () => void
}

export const ArenaSettings = ({
    arenaSettingsTab,
    setArenaSettingsTab,
    onClose
}: ArenaSettingsProps) => {
    const navigate = useNavigate()
    const {
        models,
        activeModelIds,
        toggleModelActivation,
        globalConfig,
        updateGlobalConfig
    } = useAppStore()

    return (
        <>
            <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                <h3 className="font-semibold text-base flex items-center gap-2">
                    <Settings2 className="w-4 h-4" /> Arena Settings
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

            <div className="flex border-b bg-muted/10">
                <button
                    onClick={() => setArenaSettingsTab('models')}
                    className={cn(
                        'flex-1 py-3 text-[11px] font-bold uppercase tracking-widest transition-all border-b-2',
                        arenaSettingsTab === 'models'
                            ? 'border-primary text-primary bg-primary/5'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                    )}
                >
                    Models
                </button>
                <button
                    onClick={() => setArenaSettingsTab('prompt')}
                    className={cn(
                        'flex-1 py-3 text-[11px] font-bold uppercase tracking-widest transition-all border-b-2',
                        arenaSettingsTab === 'prompt'
                            ? 'border-primary text-primary bg-primary/5'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                    )}
                >
                    System Prompt
                </button>
                <button
                    onClick={() => setArenaSettingsTab('params')}
                    className={cn(
                        'flex-1 py-3 text-[11px] font-bold uppercase tracking-widest transition-all border-b-2',
                        arenaSettingsTab === 'params'
                            ? 'border-primary text-primary bg-primary/5'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                    )}
                >
                    Parameters
                </button>
            </div>

            <div className="p-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                {arenaSettingsTab === 'models' && (
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h4 className="text-sm font-semibold">
                                Model Selection
                            </h4>
                            <p className="text-[11px] text-muted-foreground">
                                Select the models to compare in the arena.
                            </p>
                        </div>
                        <div className="grid gap-2 border rounded-xl overflow-hidden bg-background shadow-sm">
                            {models.map((model) => (
                                <div
                                    key={model.id}
                                    className={cn(
                                        'flex items-center gap-3 p-3 transition-colors border-b last:border-0 hover:bg-muted/30',
                                        activeModelIds.includes(model.id)
                                            ? 'bg-primary/5'
                                            : ''
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        id={`arena-model-${model.id}`}
                                        checked={activeModelIds.includes(
                                            model.id
                                        )}
                                        onChange={() =>
                                            toggleModelActivation(model.id)
                                        }
                                        className="rounded border-border bg-background h-4 w-4 accent-primary cursor-pointer"
                                    />
                                    <label
                                        htmlFor={`arena-model-${model.id}`}
                                        className="flex-1 cursor-pointer min-w-0"
                                    >
                                        <div className="text-sm font-bold tracking-tight truncate">
                                            {model.name}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground font-mono truncate uppercase mt-0.5">
                                            {model.providerName ||
                                                model.provider}
                                        </div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {arenaSettingsTab === 'prompt' && (
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h4 className="text-sm font-semibold">
                                Global System Prompt
                            </h4>
                            <p className="text-[11px] text-muted-foreground">
                                Define the base behavior for all models in this
                                session.
                            </p>
                        </div>
                        <Textarea
                            value={globalConfig.systemPrompt}
                            onChange={(e) =>
                                updateGlobalConfig({
                                    systemPrompt: e.target.value
                                })
                            }
                            placeholder="e.g. You are a helpful AI assistant specialized in coding..."
                            className="min-h-[350px] text-sm resize-none focus-visible:ring-primary/20 p-4"
                        />
                    </div>
                )}

                {arenaSettingsTab === 'params' && (
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h4 className="text-sm font-semibold">
                                Generation Parameters
                            </h4>
                            <p className="text-[11px] text-muted-foreground">
                                Adjust sampling and length constraints globally.
                            </p>
                        </div>
                        <div className="p-4 border rounded-xl bg-muted/5">
                            <ConfigEditor
                                config={globalConfig}
                                onChange={updateGlobalConfig}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t bg-muted/20 flex gap-3">
                {arenaSettingsTab === 'models' ? (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-10 font-semibold"
                            onClick={() => navigate('/models')}
                        >
                            <Settings2 className="w-3.5 h-3.5 mr-2" /> Manage
                            Models
                        </Button>
                        <Button
                            className="flex-1 h-10 font-semibold"
                            size="sm"
                            onClick={onClose}
                        >
                            Confirm
                        </Button>
                    </>
                ) : arenaSettingsTab === 'prompt' ? (
                    <Button
                        className="w-full h-10 font-semibold"
                        onClick={onClose}
                    >
                        Save & Close
                    </Button>
                ) : (
                    <Button
                        className="w-full h-10 font-semibold"
                        onClick={onClose}
                    >
                        Done
                    </Button>
                )}
            </div>
        </>
    )
}
