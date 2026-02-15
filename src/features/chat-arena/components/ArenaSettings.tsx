import { useNavigate } from 'react-router'
import { X, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { ArenaModelSelector } from './ArenaModelSelector'
import { ArenaSystemPrompt } from './ArenaSystemPrompt'
import { ArenaGlobalParams } from './ArenaGlobalParams'

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
        toggleAllModels,
        reorderModels,
        globalConfig,
        updateGlobalConfig
    } = useAppStore()

    const TABS = [
        { id: 'models', label: 'Models' },
        { id: 'prompt', label: 'System Prompt' },
        { id: 'params', label: 'Parameters' }
    ] as const

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
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setArenaSettingsTab(tab.id)}
                        className={cn(
                            'flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2',
                            arenaSettingsTab === tab.id
                                ? 'border-primary text-primary bg-primary/5'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="p-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                {arenaSettingsTab === 'models' && (
                    <ArenaModelSelector
                        models={models}
                        activeModelIds={activeModelIds}
                        onToggleModel={toggleModelActivation}
                        onToggleAll={toggleAllModels}
                        onReorder={reorderModels}
                    />
                )}

                {arenaSettingsTab === 'prompt' && (
                    <ArenaSystemPrompt
                        value={globalConfig.systemPrompt || ''}
                        onChange={(val) =>
                            updateGlobalConfig({ systemPrompt: val })
                        }
                    />
                )}

                {arenaSettingsTab === 'params' && (
                    <ArenaGlobalParams
                        config={globalConfig}
                        onChange={updateGlobalConfig}
                    />
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
