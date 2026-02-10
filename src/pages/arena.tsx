import { KeyboardEvent } from 'react'
import { useAppStore } from '@/lib/store'
import { LLMModel, BenchmarkResult } from '@/lib/types'
import { ArenaHeader } from '@/features/chat-arena/components/ArenaHeader'
import { ArenaInput } from '@/features/chat-arena/components/ArenaInput'
import { ModelColumn } from '@/features/chat-arena/components/ModelColumn'
import { ArenaSettings } from '@/features/chat-arena/components/ArenaSettings'
import { JudgePanel } from '@/features/chat-arena/components/JudgePanel'
import { ModelEditDialog } from '@/features/chat-arena/components/ModelEditDialog'
import { useQueueProcessor } from '@/features/chat-arena/hooks/useQueueProcessor'
import { useAutoJudge } from '@/features/chat-arena/hooks/useAutoJudge'
import { useArenaState } from '@/features/chat-arena/hooks/useArenaState'
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

    const activeModels = models.filter((m) => activeModelIds.includes(m.id))
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

    const handleExportAll = async () => {
        if (!activeSession || activeModels.length === 0) return

        let fullContent = `# Arena Export - ${new Date().toLocaleString()}\n`
        fullContent += `Session ID: ${activeSession.id}\n\n`

        activeModels.forEach((model) => {
            const results = activeSession.results[model.id] || []
            if (results.length === 0) return

            const provider = model.providerName || model.provider
            fullContent += `## Model: ${model.name} (${provider})\n\n`

            results.forEach((res, idx) => {
                const timestamp = new Date(res.timestamp).toLocaleString()
                fullContent += `### Q${idx + 1} (${timestamp})\n\n`
                fullContent += `**PROMPT:**\n${res.prompt}\n\n`
                fullContent += `**RESPONSE:**\n${res.response}\n\n`
                if (res.rating) {
                    fullContent += `**RATING:** ${res.rating.toFixed(1)} (${res.ratingSource === 'ai' ? 'AI Judge' : 'Human Judge'})\n`
                }
                if (res.metrics) {
                    fullContent += `**METRICS:** TTFT: ${res.metrics.ttft}ms | SPD: ${res.metrics.tps.toFixed(1)}t/s | TIME: ${(res.metrics.totalDuration / 1000).toFixed(2)}s | TOKS: ${res.metrics.tokenCount}\n`
                }
                fullContent += `\n---\n\n`
            })
            fullContent += `\n\n`
        })

        const { downloadFile } = await import('@/lib/utils')
        await downloadFile(
            fullContent,
            `arena_full_export_${new Date().toISOString().slice(0, 10)}.md`,
            'text/markdown'
        )
    }

    const handleExportHistory = async (
        model: LLMModel,
        results: BenchmarkResult[]
    ) => {
        if (results.length === 0) return

        const content = results
            .map((res, idx) => {
                const timestamp = new Date(res.timestamp).toLocaleString()
                let md = `### Q${idx + 1} (${timestamp})\n\n**PROMPT:**\n${res.prompt}\n\n**RESPONSE:**\n${res.response}\n\n`
                if (res.rating) {
                    md += `**RATING:** ${res.rating.toFixed(1)} (${res.ratingSource === 'ai' ? 'AI Judge' : 'Human Judge'})\n`
                }
                if (res.metrics) {
                    md += `**METRICS:** TTFT: ${res.metrics.ttft}ms | SPD: ${res.metrics.tps.toFixed(1)}t/s | TIME: ${(res.metrics.totalDuration / 1000).toFixed(2)}s | TOKS: ${res.metrics.tokenCount}\n`
                }
                return md + '\n---\n'
            })
            .join('\n')

        const provider = model.providerName || model.provider
        const fullContent = `# ${model.name} (${provider}) Chat History\n\n${content}`

        const { downloadFile } = await import('@/lib/utils')
        await downloadFile(
            fullContent,
            `${model.name.replace(/\s+/g, '_')}_(${provider.replace(/\s+/g, '_')})_history_${new Date().toISOString().slice(0, 10)}.md`,
            'text/markdown'
        )
    }

    // --- RANGE & SORT CALCULATIONS ---
    const allLastMetrics = activeModels
        .map((model) => {
            const results = activeSession?.results[model.id] || []
            const lastRes = results[results.length - 1]
            if (!lastRes) return undefined
            const streaming = streamingData[lastRes.id]
            return streaming?.metrics
                ? { ...lastRes.metrics, ...streaming.metrics }
                : lastRes.metrics
        })
        .filter((m): m is NonNullable<typeof m> => !!m)

    const ttftValues = allLastMetrics.map((m) => m.ttft).filter((v) => v > 0)
    const tpsValues = allLastMetrics.map((m) => m.tps).filter((v) => v > 0)
    const durationValues = allLastMetrics
        .map((m) => m.totalDuration)
        .filter((v) => v > 0)

    const metricsRanges = {
        ttft: { min: Math.min(...ttftValues), max: Math.max(...ttftValues) },
        tps: { min: Math.min(...tpsValues), max: Math.max(...tpsValues) },
        duration: {
            min: Math.min(...durationValues),
            max: Math.max(...durationValues)
        }
    }

    const aggregateMetrics = activeModels.map((model) => {
        const results = activeSession?.results[model.id] || []
        const valid = results
            .map((r) => {
                const s = streamingData[r.id]
                return s?.metrics
                    ? { ...r, metrics: { ...r.metrics, ...s.metrics } }
                    : r
            })
            .filter((r) => r.metrics)

        const ratedResults = results.filter((r) => r.rating)
        const avgRating =
            ratedResults.length > 0
                ? ratedResults.reduce((a, b) => a + (b.rating || 0), 0) /
                  ratedResults.length
                : 0

        return {
            modelId: model.id,
            avgTtft:
                valid.length > 0
                    ? valid.reduce((a, b) => a + (b.metrics?.ttft || 0), 0) /
                      valid.length
                    : 0,
            avgTps:
                valid.length > 0
                    ? valid.reduce((a, b) => a + (b.metrics?.tps || 0), 0) /
                      valid.length
                    : 0,
            sumTime: valid.reduce(
                (a, b) => a + (b.metrics?.totalDuration || 0),
                0
            ),
            sumToks: valid.reduce(
                (a, b) => a + (b.metrics?.tokenCount || 0),
                0
            ),
            avgRating
        }
    })

    const displayModels = [...activeModels]
    if (arenaSortBy !== 'default') {
        displayModels.sort((a, b) => {
            const mA = aggregateMetrics.find((m) => m.modelId === a.id)
            const mB = aggregateMetrics.find((m) => m.modelId === b.id)
            if (arenaSortBy === 'name') return a.name.localeCompare(b.name)
            if (arenaSortBy === 'ttft')
                return (mA?.avgTtft || 999999) - (mB?.avgTtft || 999999)
            if (arenaSortBy === 'tps')
                return (mB?.avgTps || 0) - (mA?.avgTps || 0)
            if (arenaSortBy === 'rating')
                return (mB?.avgRating || 0) - (mA?.avgRating || 0)
            return 0
        })
    }

    const fTtftVals = aggregateMetrics
        .map((a) => a.avgTtft)
        .filter((v) => v > 0)
    const fTpsVals = aggregateMetrics.map((a) => a.avgTps).filter((v) => v > 0)
    const fTimeVals = aggregateMetrics
        .map((a) => a.sumTime)
        .filter((v) => v > 0)
    const fToksVals = aggregateMetrics
        .map((a) => a.sumToks)
        .filter((v) => v > 0)

    const footerRanges = {
        ttft: { min: Math.min(...fTtftVals), max: Math.max(...fTtftVals) },
        tps: { min: Math.min(...fTpsVals), max: Math.max(...fTpsVals) },
        duration: { min: Math.min(...fTimeVals), max: Math.max(...fTimeVals) },
        tokens: { min: Math.min(...fToksVals), max: Math.max(...fToksVals) }
    }

    const gridColsClass =
        arenaColumns === 0
            ? 'grid-cols-[repeat(auto-fit,minmax(350px,1fr))]'
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
            {/* Overlays */}
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
                    {displayModels.map((model) => (
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
