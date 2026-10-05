import { useI18n } from '@/lib/i18n'
import {
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter
} from '@/components/ui/dialog'
import { useNavigate } from 'react-router'
import { Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useShallow } from 'zustand/react/shallow'
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
    const t = useI18n()
    const navigate = useNavigate()
    const {
        models,
        activeModelIds,
        toggleModelActivation,
        toggleAllModels,
        reorderModels,
        globalConfig,
        updateGlobalConfig
    } = useAppStore(
        useShallow((state) => ({
            models: state.models,
            activeModelIds: state.activeModelIds,
            toggleModelActivation: state.toggleModelActivation,
            toggleAllModels: state.toggleAllModels,
            reorderModels: state.reorderModels,
            globalConfig: state.globalConfig,
            updateGlobalConfig: state.updateGlobalConfig
        }))
    )

    const TABS = [
        { id: 'models', label: t('Models') },
        { id: 'prompt', label: t('System Prompt') },
        { id: 'params', label: t('Parameters') }
    ] as const

    return (
        <>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4" /> {t('Arena Settings')}
                </DialogTitle>
            </DialogHeader>

            <div className="shrink-0 flex border-b bg-muted/10">
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

            <DialogBody>
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
            </DialogBody>
            <DialogFooter>
                {arenaSettingsTab === 'models' ? (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-10 font-semibold"
                            onClick={() => navigate('/models')}
                        >
                            <Settings2 className="w-3.5 h-3.5 mr-2" />{' '}
                            {t('Manage Models')}
                        </Button>
                        <Button
                            className="flex-1 h-10 font-semibold"
                            size="sm"
                            onClick={onClose}
                        >
                            {t('Confirm')}
                        </Button>
                    </>
                ) : arenaSettingsTab === 'prompt' ? (
                    <Button
                        className="w-full h-10 font-semibold"
                        onClick={onClose}
                    >
                        {t('Save & Close')}
                    </Button>
                ) : (
                    <Button
                        className="w-full h-10 font-semibold"
                        onClick={onClose}
                    >
                        {t('Done')}
                    </Button>
                )}
            </DialogFooter>
        </>
    )
}
