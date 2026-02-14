import { KeyboardEvent } from 'react'
import { useAppStore } from '@/lib/store'
import { LLMModel } from '@/lib/types'
import { ArenaHeader } from '@/features/chat-arena/components/ArenaHeader'
import { ArenaInput } from '@/features/chat-arena/components/ArenaInput'
import { ModelColumn } from '@/features/chat-arena/components/ModelColumn'
import { ArenaSettings } from '@/features/chat-arena/components/ArenaSettings'
import { JudgePanel } from '@/features/chat-arena/components/JudgePanel'
import { ModelEditDialog } from '@/features/chat-arena/components/ModelEditDialog'
import { useQueueProcessor } from '@/features/chat-arena/hooks/useQueueProcessor'
import { useAutoJudge } from '@/features/chat-arena/hooks/useAutoJudge'
import { useArenaState } from '@/features/chat-arena/hooks/useArenaState'
import { useArenaMetrics } from '@/features/chat-arena/hooks/useArenaMetrics'
import { useArenaExport } from '@/features/chat-arena/hooks/useArenaExport'
import { PageLayout } from '@/features/layout/PageLayout'
import { Layers } from 'lucide-react'

export function ArenaPage() {
    const {
        models,
        activeModelIds,
        sessions,
        activeSessionId,
        updateModel,
        globalConfig,
        isProcessing,
        addToQueue,
        streamingData,
        arenaColumns,
        arenaSortBy
    } = useAppStore()

    const {
        input,
        setInput,
        editingModelId,
        setEditingModelId,
        showArenaSettings,
        setShowArenaSettings,
        arenaSettingsTab,
        setArenaSettingsTab,
        expandedModelIds,
        toggleExpandAll,
        manuallyExpandedBlocks,
        toggleBlock,
        modelToEdit,
        setModelToEdit,
        editForm,
        setEditForm,
        startEditingDetails
    } = useArenaState()

    const activeModels = models.filter((m: LLMModel) =>
        activeModelIds.includes(m.id)
    )
    const activeSession = sessions.find((s) => s.id === activeSessionId)

    useQueueProcessor()

    const {
        isJudging,
        judgeModelId,
        setJudgeModelId,
        judgeStatus,
        showJudgePanel,
        setShowJudgePanel,
        judgePrompt,
        setJudgePrompt,
        handleAutoJudge
    } = useAutoJudge(activeModels, activeSession)

    const { metricsRanges, displayModels, footerRanges } = useArenaMetrics(
        activeModels,
        activeSession,
        streamingData,
        arenaSortBy
    )

    const { handleExportAll, handleExportHistory } = useArenaExport(
        activeModels,
        activeSession
    )

    const handleSend = () => {
        if (!input.trim()) return
        addToQueue(input)
        setInput('')
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const saveDetails = () => {
        if (modelToEdit && editForm.name) {
            updateModel(modelToEdit.id, editForm)
            setModelToEdit(null)
        }
    }

    const gridColsClass =
        arenaColumns === 0
            ? 'grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(350px,1fr))]'
            : arenaColumns === 1
              ? 'grid-cols-1'
              : arenaColumns === 2
                ? 'grid-cols-2'
                : arenaColumns === 3
                  ? 'grid-cols-3'
                  : 'grid-cols-4'

    return (
        <PageLayout
            title="Arena"
            description="Compare multiple models in real-time with unified prompts."
            icon={Layers}
            actions={
                <ArenaHeader
                    onExportAll={handleExportAll}
                    onShowJudgePanel={() => setShowJudgePanel(true)}
                    onShowArenaSettings={() => setShowArenaSettings(true)}
                />
            }
            isScrollable={false}
            className="w-full max-h-screen"
        >
            {(showArenaSettings || showJudgePanel) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-2xl shadow-2xl border-primary/20 bg-background rounded-2xl overflow-hidden flex flex-col h-[80vh] animate-in zoom-in-95 duration-200">
                        {showArenaSettings && (
                            <ArenaSettings
                                arenaSettingsTab={arenaSettingsTab}
                                setArenaSettingsTab={setArenaSettingsTab}
                                onClose={() => setShowArenaSettings(false)}
                            />
                        )}
                        {showJudgePanel && (
                            <JudgePanel
                                models={models}
                                judgeModelId={judgeModelId}
                                setJudgeModelId={setJudgeModelId}
                                judgePrompt={judgePrompt}
                                setJudgePrompt={setJudgePrompt}
                                isJudging={isJudging}
                                judgeStatus={judgeStatus}
                                onClose={() => setShowJudgePanel(false)}
                                onAutoJudge={handleAutoJudge}
                                activeSession={activeSession}
                            />
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto p-4">
                <div className={`grid gap-4 ${gridColsClass}`}>
                    {displayModels.map((model: LLMModel) => (
                        <ModelColumn
                            key={model.id}
                            model={model}
                            results={activeSession?.results[model.id] || []}
                            isEditing={editingModelId === model.id}
                            onToggleEditing={() =>
                                setEditingModelId(
                                    editingModelId === model.id
                                        ? null
                                        : model.id
                                )
                            }
                            onExportHistory={handleExportHistory}
                            expandedModelIds={expandedModelIds}
                            onToggleExpandAll={toggleExpandAll}
                            manuallyExpandedBlocks={manuallyExpandedBlocks}
                            onToggleBlock={toggleBlock}
                            onStartEditingDetails={startEditingDetails}
                            globalConfig={globalConfig}
                            streamingData={streamingData}
                            metricsRanges={metricsRanges}
                            footerRanges={footerRanges}
                        />
                    ))}
                </div>
            </div>

            <ArenaInput
                input={input}
                setInput={setInput}
                onSend={handleSend}
                onKeyDown={handleKeyDown}
                isProcessing={isProcessing}
            />

            {modelToEdit && (
                <ModelEditDialog
                    editForm={editForm}
                    setEditForm={setEditForm}
                    onClose={() => setModelToEdit(null)}
                    onSave={saveDetails}
                />
            )}
        </PageLayout>
    )
}

export const Component = ArenaPage
