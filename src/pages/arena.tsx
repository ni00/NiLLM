import { KeyboardEvent, useCallback, useEffect, useState } from 'react'
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
import { ArenaCarousel } from '@/features/chat-arena/components/ArenaCarousel'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog'
import {
    useModels,
    useActiveModelIds,
    useSessions,
    useActiveSessionId,
    useUpdateModel,
    useGlobalConfig,
    useIsProcessing,
    useAddToQueue,
    useStreamingData,
    useArenaColumns,
    useArenaSortBy
} from '@/lib/hooks/useStoreSelectors'

export function ArenaPage() {
    const models = useModels()
    const activeModelIds = useActiveModelIds()
    const sessions = useSessions()
    const activeSessionId = useActiveSessionId()
    const updateModel = useUpdateModel()
    const globalConfig = useGlobalConfig()
    const isProcessing = useIsProcessing()
    const addToQueue = useAddToQueue()
    const streamingData = useStreamingData()
    const arenaColumns = useArenaColumns()
    const arenaSortBy = useArenaSortBy()

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
        startEditingDetails,
        attachments,
        setAttachments
    } = useArenaState()

    const [showFullScreenInput, setShowFullScreenInput] = useState(false)

    // Tauri v2 drag and drop support (registered once at page level)
    useEffect(() => {
        let unlisten: (() => void) | undefined

        const setupTauriDragDrop = async () => {
            try {
                const { getCurrentWebview } =
                    await import('@tauri-apps/api/webview')
                const { readFile } = await import('@tauri-apps/plugin-fs')

                const webview = getCurrentWebview()
                unlisten = await webview.onDragDropEvent(async (event) => {
                    if (event.payload.type === 'drop') {
                        const paths = event.payload.paths
                        if (paths && paths.length > 0) {
                            const newFiles: File[] = []
                            for (const filePath of paths) {
                                try {
                                    const fileName =
                                        filePath.split('/').pop() ||
                                        filePath.split('\\').pop() ||
                                        'file'
                                    const contents = await readFile(filePath)
                                    const ext =
                                        fileName
                                            .split('.')
                                            .pop()
                                            ?.toLowerCase() || ''
                                    const mimeMap: Record<string, string> = {
                                        png: 'image/png',
                                        jpg: 'image/jpeg',
                                        jpeg: 'image/jpeg',
                                        gif: 'image/gif',
                                        webp: 'image/webp',
                                        svg: 'image/svg+xml',
                                        bmp: 'image/bmp',
                                        pdf: 'application/pdf',
                                        txt: 'text/plain',
                                        md: 'text/markdown',
                                        json: 'application/json',
                                        csv: 'text/csv'
                                    }
                                    const mimeType =
                                        mimeMap[ext] ||
                                        'application/octet-stream'
                                    const file = new File(
                                        [contents],
                                        fileName,
                                        { type: mimeType }
                                    )
                                    newFiles.push(file)
                                } catch (err) {
                                    console.error(
                                        'Failed to read dropped file:',
                                        filePath,
                                        err
                                    )
                                }
                            }
                            if (newFiles.length > 0) {
                                setAttachments((prev) => [...prev, ...newFiles])
                            }
                        }
                    }
                })
            } catch {
                // Not in Tauri environment
            }
        }

        setupTauriDragDrop()
        return () => {
            unlisten?.()
        }
    }, [setAttachments])

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

    const handleSend = useCallback(async () => {
        if (!input.trim() && attachments.length === 0) return

        let prompt = input

        if (attachments.length > 0) {
            // Process text files
            const textFiles = attachments.filter(
                (f) => !f.type.startsWith('image/')
            )
            for (const file of textFiles) {
                try {
                    const text = await file.text()
                    prompt += `\n\n---\nFile: ${file.name}\nContent:\n${text}\n---`
                } catch (e) {
                    console.error('Failed to read file:', file.name, e)
                }
            }

            // Process images
            const imageFiles = attachments.filter((f) =>
                f.type.startsWith('image/')
            )
            for (const file of imageFiles) {
                try {
                    const base64 = await new Promise<string>(
                        (resolve, reject) => {
                            const reader = new FileReader()
                            reader.onloadend = () =>
                                resolve(reader.result as string)
                            reader.onerror = reject
                            reader.readAsDataURL(file)
                        }
                    )
                    // Use a special marker that the worker can parse
                    prompt += `\n<<<<IMAGE_START>>>>${base64}<<<<IMAGE_END>>>>`
                } catch (e) {
                    console.error('Failed to read image:', file.name, e)
                }
            }
        }

        addToQueue(prompt)
        setInput('')
        setAttachments([])
    }, [input, attachments, addToQueue, setInput, setAttachments])

    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault()
                handleSend()
            }
        },
        [handleSend]
    )

    const saveDetails = useCallback(() => {
        if (modelToEdit && editForm.name) {
            updateModel(modelToEdit.id, editForm)
            setModelToEdit(null)
        }
    }, [modelToEdit, editForm, updateModel, setModelToEdit])

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
            headerClassName="p-2 pt-3 md:p-6 md:pb-4"
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

            {arenaColumns === 5 ? (
                <div
                    className="flex-1 min-h-0 bg-muted/5 p-4"
                    onContextMenu={(e) => e.preventDefault()}
                >
                    <ArenaCarousel
                        models={displayModels}
                        renderModel={(model) => (
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
                                className="h-full border shadow-sm rounded-xl"
                            />
                        )}
                    />
                </div>
            ) : (
                <div
                    className={`flex-1 min-h-0 overflow-y-auto grid gap-4 p-4 ${gridColsClass} auto-rows-[1fr]`}
                    onContextMenu={(e) => e.preventDefault()}
                >
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
            )}

            <ArenaInput
                input={input}
                setInput={setInput}
                onSend={handleSend}
                onKeyDown={handleKeyDown}
                isProcessing={isProcessing}
                attachments={attachments}
                setAttachments={setAttachments}
                onExpand={() => setShowFullScreenInput(true)}
            />

            <Dialog
                open={showFullScreenInput}
                onOpenChange={setShowFullScreenInput}
            >
                <DialogContent className="max-w-4xl w-[90vw] h-[80vh] flex flex-col p-6 gap-0">
                    <DialogHeader className="px-0 pt-0 pb-4 border-b-0">
                        <DialogTitle>Full Screen Input</DialogTitle>
                        <DialogDescription>
                            Type your message with more space. Supports Markdown
                            and drag & drop.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 min-h-0 flex flex-col">
                        <ArenaInput
                            input={input}
                            setInput={setInput}
                            onSend={() => {
                                handleSend()
                                setShowFullScreenInput(false)
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.shiftKey) {
                                    e.preventDefault()
                                    handleSend()
                                    setShowFullScreenInput(false)
                                }
                            }}
                            isProcessing={isProcessing}
                            attachments={attachments}
                            setAttachments={setAttachments}
                            className="flex-1 h-full border-t-0 p-0"
                            textareaClassName="min-h-0 max-h-none h-full border-0 shadow-none rounded-none focus-visible:ring-0 p-4 text-base"
                        />
                    </div>
                </DialogContent>
            </Dialog>

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
