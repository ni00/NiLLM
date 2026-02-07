import { useState, useEffect, KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import { useAppStore } from '@/lib/store'
import { broadcastMessage } from '@/features/benchmark/engine'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Send,
    Play,
    Settings2,
    SlidersHorizontal,
    X,
    Check,
    Pencil,
    MessageSquareText,
    Eraser,
    Star,
    Gavel,
    Loader2,
    LayoutGrid,
    ChevronDown,
    ChevronUp,
    ChevronsUpDown,
    Layers,
    Trash2,
    Pause,
    PlayCircle,
    Download
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from '@/components/ui/popover'
import { GenerationConfig, LLMModel } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getProvider } from '@/lib/ai-provider'
import { generateText } from 'ai'

// Helper component for config sliders/inputs
const ConfigEditor = ({
    config,
    onChange
}: {
    config: GenerationConfig
    onChange: (c: GenerationConfig) => void
}) => (
    <div className="grid gap-8 py-2">
        <div className="space-y-3">
            <div className="flex justify-between items-end">
                <Label
                    htmlFor="temp"
                    className="text-xs font-semibold opacity-70 uppercase tracking-wider"
                >
                    Temperature
                </Label>
                <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded leading-none">
                    {config.temperature ?? 0.7}
                </span>
            </div>
            <input
                id="temp"
                type="range"
                step="0.1"
                min="0"
                max="2"
                value={config.temperature ?? 0.7}
                onChange={(e) =>
                    onChange({
                        ...config,
                        temperature: parseFloat(e.target.value)
                    })
                }
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary transition-all hover:bg-muted/80"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-medium px-0.5">
                <span>Precise</span>
                <span>Creative</span>
            </div>
        </div>

        <div className="space-y-3">
            <div className="flex justify-between items-end">
                <Label
                    htmlFor="topP"
                    className="text-xs font-semibold opacity-70 uppercase tracking-wider"
                >
                    Top P
                </Label>
                <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded leading-none">
                    {config.topP ?? 0.9}
                </span>
            </div>
            <input
                id="topP"
                type="range"
                step="0.01"
                min="0"
                max="1"
                value={config.topP ?? 0.9}
                onChange={(e) =>
                    onChange({ ...config, topP: parseFloat(e.target.value) })
                }
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary transition-all hover:bg-muted/80"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-medium px-0.5">
                <span>Focused</span>
                <span>Diverse</span>
            </div>
        </div>

        <div className="space-y-3">
            <Label
                htmlFor="maxTokens"
                className="text-xs font-semibold opacity-70 uppercase tracking-wider"
            >
                Max Tokens
            </Label>
            <Input
                id="maxTokens"
                type="number"
                step="100"
                value={config.maxTokens ?? 1000}
                onChange={(e) =>
                    onChange({ ...config, maxTokens: parseInt(e.target.value) })
                }
                className="h-10 bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary/20 font-mono"
            />
        </div>
    </div>
)

export function ChatArena() {
    const navigate = useNavigate()
    const {
        models,
        activeModelIds,
        sessions,
        activeSessionId,
        toggleModelActivation,
        updateModel,
        updateGlobalConfig,
        globalConfig,
        clearActiveSession,
        messageQueue,
        isProcessing,
        addToQueue,
        removeFromQueue,
        toggleQueuePause,
        reorderQueue,
        setProcessing
    } = useAppStore()

    const [input, setInput] = useState('')
    // isProcessing is now global
    const [isJudging, setIsJudging] = useState(false)
    const [editingModelId, setEditingModelId] = useState<string | null>(null)
    const [showJudgePanel, setShowJudgePanel] = useState(false)
    const [judgeModelId, setJudgeModelId] = useState<string>('')
    const [showArenaSettings, setShowArenaSettings] = useState(false)
    const [arenaSettingsTab, setArenaSettingsTab] = useState<
        'models' | 'prompt' | 'params'
    >('models')
    const [judgeStatus, setJudgeStatus] = useState<string | null>(null)
    const [judgePrompt, setJudgePrompt] =
        useState(`You are an impartial AI Judge. 
Evaluate the quality of the following AI responses based on the user's original intent.
Assign a score from 1 to 5 for EACH response (1=Poor, 5=Excellent).

Guidelines:
- Accuracy: Does it correctly and safely answer the user's prompt?
- Helpfulness: is the tone appropriate and the content useful?
- Reasoning: Did the model follow instructions and show good logic?
- Differentiation: BE STRICTURE. Avoid giving the same score to different models. If one is even slightly better, reflect that in the score.

Respond with a JSON object where the keys are the exact Model IDs provided and the values are the integer scores.
Example: { "model_id_1": 5, "model_id_2": 3 }

You can wrap the JSON in a markdown code block if needed. No other text or explanation.`)

    // Initialize judge model to first available if not set
    useEffect(() => {
        if (!judgeModelId && models.length > 0) {
            const preferred = models.find(
                (m) =>
                    m.id.includes('gpt-4') ||
                    m.id.includes('claude-3') ||
                    m.id.includes('pro')
            )
            setJudgeModelId(preferred ? preferred.id : models[0].id)
        }
    }, [models, judgeModelId])

    // Inline edit form state
    const [modelToEdit, setModelToEdit] = useState<LLMModel | null>(null)
    const [editForm, setEditForm] = useState<Partial<LLMModel>>({})

    const [expandedModelIds, setExpandedModelIds] = useState<string[]>([])

    const toggleExpandAll = (modelId: string) => {
        setExpandedModelIds((prev) =>
            prev.includes(modelId)
                ? prev.filter((id) => id !== modelId)
                : [...prev, modelId]
        )
    }

    // Track manually toggled blocks
    const [manuallyExpandedBlocks, setManuallyExpandedBlocks] = useState<
        Record<string, boolean>
    >({})

    const toggleBlock = (blockId: string) => {
        setManuallyExpandedBlocks((prev) => ({
            ...prev,
            [blockId]: !prev[blockId]
        }))
    }

    const activeModels = models.filter((m) => activeModelIds.includes(m.id))
    const activeSession = sessions.find((s) => s.id === activeSessionId)

    // Calculate metrics ranges for coloring
    const allLastMetrics = activeModels
        .map((model) => {
            const results = activeSession?.results[model.id] || []
            return results[results.length - 1]?.metrics
        })
        .filter((m): m is NonNullable<typeof m> => !!m)

    const ttftValues = allLastMetrics.map((m) => m.ttft).filter((v) => v > 0)
    const tpsValues = allLastMetrics.map((m) => m.tps).filter((v) => v > 0)
    const durationValues = allLastMetrics
        .map((m) => m.totalDuration)
        .filter((v) => v > 0)

    const ttftRange = {
        min: Math.min(...ttftValues),
        max: Math.max(...ttftValues)
    }
    const tpsRange = {
        min: Math.min(...tpsValues),
        max: Math.max(...tpsValues)
    }
    const durationRange = {
        min: Math.min(...durationValues),
        max: Math.max(...durationValues)
    }

    // Aggregate metrics ranges for footer coloring
    const aggregateMetrics = activeModels.map((model) => {
        const results = activeSession?.results[model.id] || []
        const valid = results.filter((r) => r.metrics)
        return {
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
            sumTime: results.reduce(
                (a, b) => a + (b.metrics?.totalDuration || 0),
                0
            ),
            sumToks: results.reduce(
                (a, b) => a + (b.metrics?.tokenCount || 0),
                0
            )
        }
    })

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

    const fTtftRange = {
        min: Math.min(...fTtftVals),
        max: Math.max(...fTtftVals)
    }
    const fTpsRange = { min: Math.min(...fTpsVals), max: Math.max(...fTpsVals) }
    const fTimeRange = {
        min: Math.min(...fTimeVals),
        max: Math.max(...fTimeVals)
    }
    const fToksRange = {
        min: Math.min(...fToksVals),
        max: Math.max(...fToksVals)
    }

    const getMetricColor = (
        value: number,
        min: number,
        max: number,
        type: 'min-best' | 'max-best'
    ) => {
        if (min === max || value === 0) return 'text-foreground'

        if (type === 'min-best') {
            if (value === min)
                return 'text-emerald-600 dark:text-emerald-400 font-bold'
            if (value === max) return 'text-rose-600 dark:text-rose-400'
        } else {
            if (value === max)
                return 'text-emerald-600 dark:text-emerald-400 font-bold'
            if (value === min) return 'text-rose-600 dark:text-rose-400'
        }
        return 'text-foreground'
    }

    const getStarColor = (score: number) => {
        switch (score) {
            case 1:
                return 'text-red-500 fill-red-500'
            case 2:
                return 'text-orange-500 fill-orange-500'
            case 3:
                return 'text-yellow-500 fill-yellow-500'
            case 4:
                return 'text-lime-500 fill-lime-500'
            case 5:
                return 'text-emerald-500 fill-emerald-500'
            default:
                return 'text-muted-foreground/40'
        }
    }

    const getScoreBadgeStyles = (score: number) => {
        const s = Math.round(score)
        switch (s) {
            case 1:
                return 'bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400 shadow-[0_0_12px_-4px_rgba(239,68,68,0.5)]'
            case 2:
                return 'bg-orange-500/15 border-orange-500/30 text-orange-600 dark:text-orange-400 shadow-[0_0_12px_-4px_rgba(249,115,22,0.5)]'
            case 3:
                return 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-[0_0_12px_-4px_rgba(245,158,11,0.5)]'
            case 4:
                return 'bg-lime-500/15 border-lime-500/30 text-lime-600 dark:text-lime-400 shadow-[0_0_12px_-4px_rgba(132,204,22,0.5)]'
            case 5:
                return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-[0_0_12px_-4px_rgba(16,185,129,0.5)]'
            default:
                return 'bg-muted/30 border-border text-muted-foreground'
        }
    }

    // Queue Processor
    useEffect(() => {
        const processQueue = async () => {
            // ALWAYS get the freshest state from store to avoid stale closures in effects
            const state = useAppStore.getState()
            const {
                isProcessing,
                messageQueue,
                setProcessing,
                removeFromQueue
            } = state

            // Find first active item (not paused)
            const nextItem = messageQueue.find((m) => !m.paused)

            // If processing, or no active items, do nothing
            // We use the state from useAppStore.getState() to be absolutely sure
            if (isProcessing || !nextItem) return

            setProcessing(true)

            try {
                await broadcastMessage(nextItem.prompt, nextItem.sessionId)
            } catch (err) {
                console.error('Queue processing error:', err)
            } finally {
                removeFromQueue(nextItem.id)
                setProcessing(false)
            }
        }

        processQueue()
    }, [messageQueue, isProcessing, setProcessing, removeFromQueue])

    const handleSend = () => {
        if (!input.trim()) return

        addToQueue(input)
        setInput('')
    }

    const handleAutoJudge = async () => {
        if (!activeSession || activeModels.length === 0 || isJudging) return

        const judgeModel = models.find((m) => m.id === judgeModelId)
        if (!judgeModel) {
            setJudgeStatus('Error: No judge model selected')
            return
        }

        setIsJudging(true)
        setJudgeStatus('Gathering model responses...')

        try {
            // 1. Gather Response Data
            const responsesToJudge: {
                modelId: string
                response: string
                resultId: string
            }[] = []
            let lastPrompt = ''

            activeModels.forEach((model) => {
                const results = activeSession.results[model.id] || []
                const lastResult = results[results.length - 1]
                if (lastResult && lastResult.response) {
                    responsesToJudge.push({
                        modelId: model.id,
                        response: lastResult.response,
                        resultId: lastResult.id
                    })
                    lastPrompt = lastResult.prompt
                }
            })

            if (responsesToJudge.length === 0) {
                setJudgeStatus('Error: No completed responses to judge')
                setTimeout(() => setJudgeStatus(null), 3000)
                setIsJudging(false)
                return
            }

            setJudgeStatus(`Consulting ${judgeModel.name}...`)

            // 3. Construct Context
            const userPromptContent = `[User Prompt]\n${lastPrompt}\n\n[Model Responses to Evaluate]\n${responsesToJudge.map((r) => `Model ID: ${r.modelId}\nResponse:\n${r.response}`).join('\n\n---\n\n')}`

            // 4. Call LLM
            const provider = getProvider(judgeModel)
            let text = ''
            try {
                const response = await generateText({
                    model: provider(judgeModel.providerId),
                    messages: [
                        { role: 'system', content: judgePrompt },
                        { role: 'user', content: userPromptContent }
                    ],
                    temperature: 0.1,
                    headers: judgeModel.apiKey
                        ? {
                              Authorization: `Bearer ${judgeModel.apiKey}`
                          }
                        : undefined
                })
                text = response.text
            } catch (apiError: any) {
                console.error('Judge API Error:', apiError)
                throw new Error(
                    `API Error: ${apiError.message || 'Request failed'}`
                )
            }

            if (!text || !text.trim()) {
                throw new Error(
                    'Model returned empty result. Check API Key or Model ID.'
                )
            }

            setJudgeStatus('Parsing scores...')

            // 5. Parse and Update
            let jsonStr = text.trim()
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
            if (jsonMatch) jsonStr = jsonMatch[0]

            let scores: Record<string, number>
            try {
                scores = JSON.parse(jsonStr)
            } catch (parseError) {
                console.error('JSON Parse Error. Content:', text)
                throw new Error(
                    'Failed to parse scores. Try a more capable model (like GPT-4).'
                )
            }

            // Update store
            const updateResult = useAppStore.getState().updateResult
            let updateCount = 0

            Object.entries(scores).forEach(([modelId, score]) => {
                const target = responsesToJudge.find(
                    (r) => r.modelId === modelId
                )
                // Handle cases where modelId might be slightly different
                const fuzzyTarget =
                    target ||
                    responsesToJudge.find(
                        (r) =>
                            modelId.includes(r.modelId) ||
                            r.modelId.includes(modelId)
                    )

                if (fuzzyTarget && typeof score === 'number') {
                    updateResult(
                        activeSession.id,
                        fuzzyTarget.modelId,
                        fuzzyTarget.resultId,
                        {
                            rating: Math.min(5, Math.max(1, Math.round(score))),
                            ratingSource: 'ai'
                        }
                    )
                    updateCount++
                }
            })

            if (updateCount > 0) {
                setJudgeStatus('Success! Ratings applied.')
                setTimeout(() => {
                    setShowJudgePanel(false)
                    setJudgeStatus(null)
                }, 1000)
            } else {
                setJudgeStatus(
                    'Error: Could not match model IDs in judge response'
                )
            }
        } catch (e: any) {
            console.error('Judge error:', e)
            setJudgeStatus(`Error: ${e.message || 'Failed to judge'}`)
        } finally {
            setIsJudging(false)
        }
    }

    const handleExportAll = () => {
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

        const blob = new Blob([fullContent], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `arena_full_export_${new Date().toISOString().slice(0, 10)}.md`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const startEditingDetails = (model: LLMModel) => {
        setModelToEdit(model)
        setEditForm({ ...model })
    }

    const saveDetails = () => {
        if (modelToEdit && editForm.name) {
            // basic validation
            updateModel(modelToEdit.id, editForm)
            setModelToEdit(null)
        }
    }

    return (
        <div className="flex flex-col h-full w-full max-h-screen relative">
            {/* Header / Toolbar */}
            <PageHeader
                title="Arena"
                description="Compare multiple models in real-time with unified prompts."
                icon={Layers}
                className="p-6 pb-0"
            >
                <div className="flex gap-2">
                    {/* Queue Indicator */}
                    {messageQueue.length > 0 && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="relative pr-3 h-10 px-4"
                                >
                                    <Layers className="w-4 h-4 mr-2 text-muted-foreground" />
                                    <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 min-w-[1.25rem] h-5 flex items-center justify-center rounded-full border-2 border-background shadow-sm">
                                        {messageQueue.length}
                                    </span>
                                    Queue
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4" align="end">
                                <div className="flex items-center justify-between border-b pb-2 mb-3">
                                    <h3 className="font-semibold text-sm">
                                        Processing Queue
                                    </h3>
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                                        {
                                            messageQueue.filter(
                                                (m) => !m.paused
                                            ).length
                                        }{' '}
                                        Active
                                    </span>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                    {messageQueue.map((item, index) => (
                                        <div
                                            key={item.id}
                                            className={`flex items-start gap-2 p-2 rounded-lg border text-xs group/item transition-all ${
                                                item.paused
                                                    ? 'bg-muted/50 border-dashed opacity-70'
                                                    : 'bg-card border-solid shadow-sm'
                                            }`}
                                        >
                                            <div className="flex flex-col gap-0.5 mt-0.5">
                                                <button
                                                    disabled={index === 0}
                                                    onClick={() =>
                                                        reorderQueue(
                                                            index,
                                                            index - 1
                                                        )
                                                    }
                                                    className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                                                >
                                                    <ChevronUp className="w-3 h-3" />
                                                </button>
                                                <button
                                                    disabled={
                                                        index ===
                                                        messageQueue.length - 1
                                                    }
                                                    onClick={() =>
                                                        reorderQueue(
                                                            index,
                                                            index + 1
                                                        )
                                                    }
                                                    className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                                                >
                                                    <ChevronDown className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <div className="flex-1 min-w-0 py-1">
                                                <div
                                                    className={`truncate font-medium ${
                                                        item.paused
                                                            ? 'line-through text-muted-foreground'
                                                            : ''
                                                    }`}
                                                >
                                                    {item.prompt}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground mt-0.5 flex gap-2">
                                                    <span>
                                                        {item.paused
                                                            ? 'Paused'
                                                            : index === 0 &&
                                                                !item.paused &&
                                                                isProcessing
                                                              ? 'Processing...'
                                                              : 'Pending'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 self-center">
                                                <button
                                                    onClick={() =>
                                                        toggleQueuePause(
                                                            item.id
                                                        )
                                                    }
                                                    className={`p-1.5 rounded-md transition-colors ${
                                                        item.paused
                                                            ? 'hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500'
                                                            : 'hover:bg-amber-500/10 text-muted-foreground hover:text-amber-500'
                                                    }`}
                                                    title={
                                                        item.paused
                                                            ? 'Resume'
                                                            : 'Pause'
                                                    }
                                                >
                                                    {item.paused ? (
                                                        <PlayCircle className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <Pause className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        removeFromQueue(item.id)
                                                    }
                                                    className="p-1.5 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive transition-colors"
                                                    title="Remove"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportAll}
                        disabled={!activeSession}
                        title="Export All Active Models' History"
                        className="h-10 px-4"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export All
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowJudgePanel(true)}
                        disabled={isJudging || isProcessing}
                        className={cn(
                            'h-10 px-4',
                            isJudging
                                ? 'animate-pulse border-amber-500 text-amber-500'
                                : ''
                        )}
                        title="AI Judge: Auto-score recent answers"
                    >
                        {isJudging ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Gavel className="w-4 h-4 mr-2" />
                        )}
                        {isJudging ? 'Judging...' : 'AI Judge'}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-10 px-4"
                        onClick={() => {
                            setArenaSettingsTab('models')
                            setShowArenaSettings(true)
                        }}
                    >
                        <LayoutGrid className="w-4 h-4 mr-2" /> Arena Settings
                    </Button>
                </div>
            </PageHeader>

            {/* Dialog Overlays */}
            {(showArenaSettings || showJudgePanel) && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => {
                        setShowArenaSettings(false)
                        setShowJudgePanel(false)
                    }}
                >
                    <div
                        className="bg-background border rounded-lg shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {showArenaSettings && (
                            <>
                                <div className="flex border-b bg-muted/30">
                                    {(
                                        ['models', 'prompt', 'params'] as const
                                    ).map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() =>
                                                setArenaSettingsTab(tab)
                                            }
                                            className={`flex-1 px-4 py-3 text-sm font-semibold transition-all border-b-2 ${
                                                arenaSettingsTab === tab
                                                    ? 'border-primary text-primary bg-background'
                                                    : 'border-transparent text-muted-foreground hover:bg-muted/50'
                                            }`}
                                        >
                                            {tab === 'models' && (
                                                <div className="flex items-center justify-center gap-2">
                                                    <LayoutGrid className="w-4 h-4" />{' '}
                                                    Models
                                                </div>
                                            )}
                                            {tab === 'prompt' && (
                                                <div className="flex items-center justify-center gap-2">
                                                    <MessageSquareText className="w-4 h-4" />{' '}
                                                    Prompt
                                                </div>
                                            )}
                                            {tab === 'params' && (
                                                <div className="flex items-center justify-center gap-2">
                                                    <SlidersHorizontal className="w-4 h-4" />{' '}
                                                    Params
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-[46px] w-[46px] rounded-none border-l"
                                        onClick={() =>
                                            setShowArenaSettings(false)
                                        }
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="p-6">
                                    {arenaSettingsTab === 'models' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-semibold">
                                                    Active Models
                                                </h4>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {activeModelIds.length}{' '}
                                                    models selected
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto p-1">
                                                {models.map((model) => (
                                                    <div
                                                        key={model.id}
                                                        onClick={() =>
                                                            toggleModelActivation(
                                                                model.id
                                                            )
                                                        }
                                                        className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                                                            activeModelIds.includes(
                                                                model.id
                                                            )
                                                                ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                                                                : 'border-border hover:border-primary/20 hover:bg-muted/30'
                                                        }`}
                                                    >
                                                        <div
                                                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                                                activeModelIds.includes(
                                                                    model.id
                                                                )
                                                                    ? 'bg-primary border-primary'
                                                                    : 'border-muted-foreground/30'
                                                            }`}
                                                        >
                                                            {activeModelIds.includes(
                                                                model.id
                                                            ) && (
                                                                <Check className="w-3 h-3 text-white" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[13px] font-medium truncate">
                                                                {model.name}
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground truncate uppercase">
                                                                {model.providerName ||
                                                                    model.provider}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="pt-2 border-t flex justify-between gap-3">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() =>
                                                        navigate('/models')
                                                    }
                                                >
                                                    <Settings2 className="w-3.5 h-3.5 mr-2" />{' '}
                                                    Manage Models
                                                </Button>
                                                <Button
                                                    className="flex-1"
                                                    size="sm"
                                                    onClick={() =>
                                                        setShowArenaSettings(
                                                            false
                                                        )
                                                    }
                                                >
                                                    Confirm
                                                </Button>
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
                                                    Sets the persona and
                                                    behavior for all models in
                                                    the arena.
                                                </p>
                                            </div>
                                            <Textarea
                                                placeholder="Enter instructions for the AI..."
                                                value={
                                                    globalConfig.systemPrompt ||
                                                    ''
                                                }
                                                onChange={(e) =>
                                                    updateGlobalConfig({
                                                        systemPrompt:
                                                            e.target.value
                                                    })
                                                }
                                                className="min-h-[250px] text-sm resize-none focus-visible:ring-primary/20"
                                            />
                                            <Button
                                                className="w-full"
                                                onClick={() =>
                                                    setShowArenaSettings(false)
                                                }
                                            >
                                                Save & Close
                                            </Button>
                                        </div>
                                    )}

                                    {arenaSettingsTab === 'params' && (
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-semibold">
                                                    Generation Parameters
                                                </h4>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Adjust sampling and length
                                                    constraints globally.
                                                </p>
                                            </div>
                                            <div className="p-4 border rounded-xl bg-muted/10">
                                                <ConfigEditor
                                                    config={globalConfig}
                                                    onChange={
                                                        updateGlobalConfig
                                                    }
                                                />
                                            </div>
                                            <Button
                                                className="w-full mt-2"
                                                onClick={() =>
                                                    setShowArenaSettings(false)
                                                }
                                            >
                                                Done
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                        {showJudgePanel && (
                            <>
                                <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                                    <h3 className="font-semibold text-base flex items-center gap-2">
                                        <Gavel className="w-4 h-4" /> AI Judge
                                        Settings
                                    </h3>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setShowJudgePanel(false)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="space-y-2">
                                        <Label>Select Judge Model</Label>
                                        <div className="grid gap-2 max-h-[200px] overflow-y-auto border rounded-md p-2">
                                            {models.map((model) => (
                                                <div
                                                    key={model.id}
                                                    className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                                                        judgeModelId ===
                                                        model.id
                                                            ? 'bg-primary/10 border-primary/20'
                                                            : 'hover:bg-muted'
                                                    }`}
                                                    onClick={() =>
                                                        setJudgeModelId(
                                                            model.id
                                                        )
                                                    }
                                                >
                                                    <div
                                                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                                            judgeModelId ===
                                                            model.id
                                                                ? 'border-primary bg-primary'
                                                                : 'border-muted-foreground'
                                                        }`}
                                                    >
                                                        {judgeModelId ===
                                                            model.id && (
                                                            <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-sm truncate">
                                                            {model.name}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground truncate">
                                                            {model.providerName ||
                                                                model.provider}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold opacity-70 uppercase tracking-wider">
                                            Judge System Prompt
                                        </Label>
                                        <Textarea
                                            value={judgePrompt}
                                            onChange={(e) =>
                                                setJudgePrompt(e.target.value)
                                            }
                                            placeholder="Enter judge instructions..."
                                            className="min-h-[150px] text-[13px] leading-relaxed resize-none focus-visible:ring-primary/20"
                                        />
                                    </div>
                                    <Button
                                        className="w-full mt-2"
                                        onClick={handleAutoJudge}
                                        disabled={!judgeModelId || isJudging}
                                    >
                                        {isJudging ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Judging Responses...
                                            </>
                                        ) : (
                                            'Start Judging'
                                        )}
                                    </Button>

                                    {judgeStatus && (
                                        <div
                                            className={`text-[11px] text-center font-medium mt-3 px-3 py-1.5 rounded-md ${
                                                judgeStatus.startsWith('Error')
                                                    ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                                    : 'bg-primary/5 text-primary border border-primary/10'
                                            }`}
                                        >
                                            {judgeStatus}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Main Content - Scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
                <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
                    {activeModels.map((model) => {
                        const results = activeSession?.results[model.id] || []
                        const isEditing = editingModelId === model.id

                        return (
                            <div
                                key={model.id}
                                className="flex flex-col h-[500px] border rounded-xl bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden group relative transition-all duration-300 hover:shadow-md hover:border-primary/30"
                            >
                                {/* Card Header - Premium Style */}
                                <div className="flex-none px-4 py-3 border-b bg-muted/20 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5 truncate flex-1">
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                        <div className="flex items-baseline gap-2 truncate">
                                            <div
                                                className="font-bold text-sm tracking-tight text-foreground/90 group-hover:text-primary transition-colors truncate cursor-pointer hover:underline underline-offset-4"
                                                title={`Click to export ${model.name} history`}
                                                onClick={() => {
                                                    if (results.length === 0)
                                                        return

                                                    const content = results
                                                        .map((res, idx) => {
                                                            const timestamp =
                                                                new Date(
                                                                    res.timestamp
                                                                ).toLocaleString()
                                                            let md = `### Q${idx + 1} (${timestamp})\n\n**PROMPT:**\n${res.prompt}\n\n**RESPONSE:**\n${res.response}\n\n`
                                                            if (res.rating) {
                                                                md += `**RATING:** ${res.rating.toFixed(1)} (${res.ratingSource === 'ai' ? 'AI Judge' : 'Human Judge'})\n`
                                                            }
                                                            if (res.metrics) {
                                                                md += `**METRICS:** TTFT: ${res.metrics.ttft}ms | SPD: ${res.metrics.tps.toFixed(1)}t/s | TIME: ${(res.metrics.totalDuration / 1000).toFixed(2)}s | TOKS: ${res.metrics.tokenCount}\n`
                                                            }
                                                            return (
                                                                md + '\n---\n'
                                                            )
                                                        })
                                                        .join('\n')

                                                    const provider =
                                                        model.providerName ||
                                                        model.provider
                                                    const blob = new Blob(
                                                        [
                                                            `# ${model.name} (${provider}) Chat History\n\n${content}`
                                                        ],
                                                        {
                                                            type: 'text/markdown'
                                                        }
                                                    )
                                                    const url =
                                                        URL.createObjectURL(
                                                            blob
                                                        )
                                                    const a =
                                                        document.createElement(
                                                            'a'
                                                        )
                                                    a.href = url
                                                    a.download = `${model.name.replace(/\s+/g, '_')}_(${provider.replace(/\s+/g, '_')})_history_${new Date().toISOString().slice(0, 10)}.md`
                                                    document.body.appendChild(a)
                                                    a.click()
                                                    document.body.removeChild(a)
                                                    URL.revokeObjectURL(url)
                                                }}
                                            >
                                                {model.name}
                                            </div>
                                            <span
                                                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 truncate"
                                                title={
                                                    model.providerName ||
                                                    model.provider
                                                }
                                            >
                                                {model.providerName ||
                                                    model.provider}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {results.length > 1 && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={`h-7 w-7 rounded-full transition-colors ${expandedModelIds.includes(model.id) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-primary hover:bg-primary/5'}`}
                                                onClick={() =>
                                                    toggleExpandAll(model.id)
                                                }
                                                title={
                                                    expandedModelIds.includes(
                                                        model.id
                                                    )
                                                        ? 'Collapse All History'
                                                        : 'Expand All History'
                                                }
                                            >
                                                <ChevronsUpDown className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={`h-7 w-7 rounded-full transition-colors ${isEditing ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-primary hover:bg-primary/5'}`}
                                            onClick={() =>
                                                setEditingModelId(
                                                    isEditing ? null : model.id
                                                )
                                            }
                                            title={
                                                isEditing ? 'Done' : 'Config'
                                            }
                                        >
                                            {isEditing ? (
                                                <Check className="h-3.5 w-3.5" />
                                            ) : (
                                                <Settings2 className="h-3.5 w-3.5" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Card Content Area */}
                                <div className="flex-1 relative overflow-hidden min-h-0">
                                    {isEditing ? (
                                        <ScrollArea className="h-full bg-muted/5">
                                            <div className="p-5 space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="text-sm font-bold tracking-tight">
                                                            Parameters
                                                        </h4>
                                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                                            Override global
                                                            generation settings.
                                                        </p>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-[11px] font-medium"
                                                        onClick={() =>
                                                            updateModel(
                                                                model.id,
                                                                {
                                                                    config: undefined
                                                                }
                                                            )
                                                        }
                                                    >
                                                        Reset
                                                    </Button>
                                                </div>
                                                <ConfigEditor
                                                    config={{
                                                        ...globalConfig,
                                                        ...model.config
                                                    }}
                                                    onChange={(newConfig) =>
                                                        updateModel(model.id, {
                                                            config: newConfig
                                                        })
                                                    }
                                                />
                                                <div className="pt-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full h-9 text-xs font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                                                        onClick={() =>
                                                            startEditingDetails(
                                                                model
                                                            )
                                                        }
                                                    >
                                                        <Pencil className="w-3.5 h-3.5 mr-2" />
                                                        Edit Model Details
                                                    </Button>
                                                </div>
                                            </div>
                                        </ScrollArea>
                                    ) : (
                                        <ScrollArea className="h-full">
                                            <div className="p-4 flex flex-col min-h-full">
                                                {results.length > 0 ? (
                                                    <div className="flex-1 space-y-6 pb-4">
                                                        {results.map(
                                                            (res, idx) => {
                                                                const isLast =
                                                                    idx ===
                                                                    results.length -
                                                                        1
                                                                const isForceExpanded =
                                                                    expandedModelIds.includes(
                                                                        model.id
                                                                    )
                                                                const isSelfExpanded =
                                                                    manuallyExpandedBlocks[
                                                                        res.id
                                                                    ]
                                                                const showContent =
                                                                    isLast ||
                                                                    isForceExpanded ||
                                                                    isSelfExpanded

                                                                return (
                                                                    <div
                                                                        key={
                                                                            res.id
                                                                        }
                                                                        className={`space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ${!isLast ? 'border-l-2 border-muted pl-4 ml-1' : ''}`}
                                                                    >
                                                                        {/* Prompt Context - Clickable for folding */}
                                                                        <div
                                                                            className={`p-3 rounded-lg text-[13px] border transition-all cursor-pointer flex items-center justify-between gap-3 group/prompt ${
                                                                                showContent
                                                                                    ? 'bg-muted/40 text-foreground/70 border-border/40 italic'
                                                                                    : 'bg-muted/20 text-muted-foreground/50 border-transparent hover:bg-muted/40'
                                                                            }`}
                                                                            onClick={() =>
                                                                                toggleBlock(
                                                                                    res.id
                                                                                )
                                                                            }
                                                                        >
                                                                            <span
                                                                                className={`text-sm break-words leading-relaxed ${showContent ? '' : 'line-clamp-2'}`}
                                                                            >
                                                                                "
                                                                                {
                                                                                    res.prompt
                                                                                }
                                                                                "
                                                                            </span>
                                                                            {!isLast && (
                                                                                <div className="flex-none">
                                                                                    {showContent ? (
                                                                                        <ChevronUp className="h-3 w-3 opacity-40 group-hover/prompt:opacity-100" />
                                                                                    ) : (
                                                                                        <ChevronDown className="h-3 w-3 opacity-40 group-hover/prompt:opacity-100" />
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Response Body */}
                                                                        {showContent && (
                                                                            <div className="markdown-body text-sm leading-relaxed px-1">
                                                                                {res.response ? (
                                                                                    <ReactMarkdown
                                                                                        remarkPlugins={[
                                                                                            remarkGfm
                                                                                        ]}
                                                                                    >
                                                                                        {
                                                                                            res.response
                                                                                        }
                                                                                    </ReactMarkdown>
                                                                                ) : (
                                                                                    <div className="flex items-center gap-2 text-primary font-medium animate-pulse">
                                                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                                                        <span>
                                                                                            Generating
                                                                                            response...
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                                {res.error && (
                                                                                    <div className="mt-2 p-3 bg-destructive/10 text-destructive text-xs rounded-lg border border-destructive/20">
                                                                                        {
                                                                                            res.error
                                                                                        }
                                                                                    </div>
                                                                                )}

                                                                                {/* Score Display (Only when unfolded) */}
                                                                                {res.response && (
                                                                                    <div className="flex items-center gap-3 pt-4 border-t border-border/30 mt-4 group/rating">
                                                                                        <div className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                                                                            Score
                                                                                        </div>
                                                                                        <div className="flex items-center gap-1">
                                                                                            {[
                                                                                                1,
                                                                                                2,
                                                                                                3,
                                                                                                4,
                                                                                                5
                                                                                            ].map(
                                                                                                (
                                                                                                    score
                                                                                                ) => (
                                                                                                    <button
                                                                                                        key={
                                                                                                            score
                                                                                                        }
                                                                                                        onClick={() => {
                                                                                                            if (
                                                                                                                !activeSessionId
                                                                                                            )
                                                                                                                return
                                                                                                            useAppStore
                                                                                                                .getState()
                                                                                                                .updateResult(
                                                                                                                    activeSessionId,
                                                                                                                    model.id,
                                                                                                                    res.id,
                                                                                                                    {
                                                                                                                        rating: score,
                                                                                                                        ratingSource:
                                                                                                                            'human'
                                                                                                                    }
                                                                                                                )
                                                                                                        }}
                                                                                                        className="focus:outline-none p-1 hover:bg-primary/5 rounded-full transition-all hover:scale-110 active:scale-90"
                                                                                                        title={`Rate ${score} stars`}
                                                                                                    >
                                                                                                        <Star
                                                                                                            className={`w-4 h-4 transition-all ${
                                                                                                                (res.rating ||
                                                                                                                    0) >=
                                                                                                                score
                                                                                                                    ? getStarColor(
                                                                                                                          res.rating ||
                                                                                                                              0
                                                                                                                      )
                                                                                                                    : 'text-muted-foreground/20 group-hover/rating:text-primary/20'
                                                                                                            }`}
                                                                                                        />
                                                                                                    </button>
                                                                                                )
                                                                                            )}
                                                                                        </div>
                                                                                        {res.rating && (
                                                                                            <div
                                                                                                className={`ml-auto flex items-center gap-2 px-3 py-1 rounded-full border transition-all hover:scale-110 active:scale-95 cursor-default ${getScoreBadgeStyles(res.rating)}`}
                                                                                            >
                                                                                                <span className="text-[10px] font-black uppercase tracking-tighter opacity-80 whitespace-nowrap">
                                                                                                    {res.ratingSource ===
                                                                                                    'ai'
                                                                                                        ? 'AI Judge'
                                                                                                        : 'Human Judge'}
                                                                                                </span>
                                                                                                <span className="text-[14px] font-bold tabular-nums tracking-tight border-l pl-2 ml-0.5 border-current/20 leading-none">
                                                                                                    {res.rating.toFixed(
                                                                                                        1
                                                                                                    )}
                                                                                                </span>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        {/* Message Metrics */}
                                                                        {res.metrics && (
                                                                            <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground tabular-nums pt-3 mt-1 px-1 opacity-70 border-t border-dashed border-border/40">
                                                                                <div
                                                                                    title="Time to First Token"
                                                                                    className="flex items-center gap-1"
                                                                                >
                                                                                    <span className="opacity-50 font-semibold">
                                                                                        TTFT
                                                                                    </span>
                                                                                    <span
                                                                                        className={`font-bold ${getMetricColor(res.metrics.ttft, ttftRange.min, ttftRange.max, 'min-best')}`}
                                                                                    >
                                                                                        {
                                                                                            res
                                                                                                .metrics
                                                                                                .ttft
                                                                                        }
                                                                                    </span>
                                                                                    <span className="opacity-40 text-[8px]">
                                                                                        ms
                                                                                    </span>
                                                                                </div>
                                                                                <div
                                                                                    title="Tokens Per Second"
                                                                                    className="flex items-center gap-1"
                                                                                >
                                                                                    <span className="opacity-50 font-semibold">
                                                                                        SPD
                                                                                    </span>
                                                                                    <span
                                                                                        className={`font-bold ${getMetricColor(res.metrics.tps, tpsRange.min, tpsRange.max, 'max-best')}`}
                                                                                    >
                                                                                        {res.metrics.tps.toFixed(
                                                                                            1
                                                                                        )}
                                                                                    </span>
                                                                                    <span className="opacity-40 text-[8px]">
                                                                                        t/s
                                                                                    </span>
                                                                                </div>
                                                                                <div
                                                                                    title="Total Duration"
                                                                                    className="flex items-center gap-1"
                                                                                >
                                                                                    <span className="opacity-50 font-semibold">
                                                                                        TIME
                                                                                    </span>
                                                                                    <span
                                                                                        className={`font-bold ${getMetricColor(res.metrics.totalDuration, durationRange.min, durationRange.max, 'min-best')}`}
                                                                                    >
                                                                                        {(
                                                                                            res
                                                                                                .metrics
                                                                                                .totalDuration /
                                                                                            1000
                                                                                        ).toFixed(
                                                                                            2
                                                                                        )}
                                                                                    </span>
                                                                                    <span className="opacity-40 text-[8px]">
                                                                                        s
                                                                                    </span>
                                                                                </div>
                                                                                <div
                                                                                    title="Total Tokens"
                                                                                    className="flex items-center gap-1 ml-auto"
                                                                                >
                                                                                    <span className="opacity-50 font-semibold">
                                                                                        TOKS
                                                                                    </span>
                                                                                    <span className="font-bold">
                                                                                        {
                                                                                            res
                                                                                                .metrics
                                                                                                .tokenCount
                                                                                        }
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )
                                                            }
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/30 py-20 gap-3">
                                                        <MessageSquareText className="w-10 h-10 opacity-20" />
                                                        <div className="text-sm font-medium">
                                                            Ready to compare
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    )}
                                </div>

                                {/* Card Footer - Aggregated Statistics */}
                                <div className="flex-none p-3 px-4 border-t bg-muted/10 flex flex-col gap-2">
                                    <div className="flex items-center justify-between min-h-[24px]">
                                        <div className="flex-1 min-w-0">
                                            {results.length > 0 &&
                                            !isEditing ? (
                                                <div className="grid grid-cols-2 min-[1200px]:grid-cols-4 gap-2 text-[10px] font-mono text-muted-foreground tabular-nums">
                                                    {/* Avg TTFT */}
                                                    {(() => {
                                                        const validTtft =
                                                            results
                                                                .map(
                                                                    (m) =>
                                                                        m
                                                                            .metrics
                                                                            ?.ttft
                                                                )
                                                                .filter(
                                                                    (
                                                                        v
                                                                    ): v is number =>
                                                                        !!v &&
                                                                        v > 0
                                                                )
                                                        const avgTtft =
                                                            validTtft.length > 0
                                                                ? validTtft.reduce(
                                                                      (a, b) =>
                                                                          a + b,
                                                                      0
                                                                  ) /
                                                                  validTtft.length
                                                                : 0
                                                        return (
                                                            <div
                                                                title="Average TTFT"
                                                                className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/40 whitespace-nowrap overflow-hidden"
                                                            >
                                                                <span className="opacity-50">
                                                                    AVG.TTFT
                                                                </span>
                                                                <span
                                                                    className={`font-bold ${getMetricColor(avgTtft, fTtftRange.min, fTtftRange.max, 'min-best')}`}
                                                                >
                                                                    {Math.round(
                                                                        avgTtft
                                                                    )}
                                                                </span>
                                                                <span className="opacity-40 text-[8px]">
                                                                    ms
                                                                </span>
                                                            </div>
                                                        )
                                                    })()}

                                                    {/* Avg Speed */}
                                                    {(() => {
                                                        const validTps = results
                                                            .map(
                                                                (m) =>
                                                                    m.metrics
                                                                        ?.tps
                                                            )
                                                            .filter(
                                                                (
                                                                    v
                                                                ): v is number =>
                                                                    !!v && v > 0
                                                            )
                                                        const avgTps =
                                                            validTps.length > 0
                                                                ? validTps.reduce(
                                                                      (a, b) =>
                                                                          a + b,
                                                                      0
                                                                  ) /
                                                                  validTps.length
                                                                : 0
                                                        return (
                                                            <div
                                                                title="Average Tokens/sec"
                                                                className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/40 whitespace-nowrap overflow-hidden"
                                                            >
                                                                <span className="opacity-50">
                                                                    AVG.SPD
                                                                </span>
                                                                <span
                                                                    className={`font-bold ${getMetricColor(avgTps, fTpsRange.min, fTpsRange.max, 'max-best')}`}
                                                                >
                                                                    {avgTps.toFixed(
                                                                        1
                                                                    )}
                                                                </span>
                                                                <span className="opacity-40 text-[8px]">
                                                                    t/s
                                                                </span>
                                                            </div>
                                                        )
                                                    })()}

                                                    {/* Sum Time */}
                                                    {(() => {
                                                        const sumTime =
                                                            results.reduce(
                                                                (acc, r) =>
                                                                    acc +
                                                                    (r.metrics
                                                                        ?.totalDuration ||
                                                                        0),
                                                                0
                                                            )
                                                        return (
                                                            <div
                                                                title="Total Duration"
                                                                className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/40 whitespace-nowrap overflow-hidden"
                                                            >
                                                                <span className="opacity-50">
                                                                    SUM.TIME
                                                                </span>
                                                                <span
                                                                    className={`font-bold ${getMetricColor(sumTime, fTimeRange.min, fTimeRange.max, 'min-best')}`}
                                                                >
                                                                    {(
                                                                        sumTime /
                                                                        1000
                                                                    ).toFixed(
                                                                        2
                                                                    )}
                                                                </span>
                                                                <span className="opacity-40 text-[8px]">
                                                                    s
                                                                </span>
                                                            </div>
                                                        )
                                                    })()}

                                                    {/* Sum Tokens */}
                                                    {(() => {
                                                        const sumToks =
                                                            results.reduce(
                                                                (acc, r) =>
                                                                    acc +
                                                                    (r.metrics
                                                                        ?.tokenCount ||
                                                                        0),
                                                                0
                                                            )
                                                        return (
                                                            <div
                                                                title="Total Tokens"
                                                                className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/40 whitespace-nowrap overflow-hidden"
                                                            >
                                                                <span className="opacity-50">
                                                                    SUM.TOKS
                                                                </span>
                                                                <span
                                                                    className={`font-bold ${getMetricColor(sumToks, fToksRange.min, fToksRange.max, 'min-best')}`}
                                                                >
                                                                    {sumToks}
                                                                </span>
                                                            </div>
                                                        )
                                                    })()}
                                                </div>
                                            ) : isEditing ? (
                                                <div className="text-[10px] font-semibold text-primary/60 uppercase tracking-widest pl-1">
                                                    Configuration Mode
                                                </div>
                                            ) : (
                                                <div className="h-4" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Input Area - Fixed at bottom */}
            <div className="flex-none p-4 pt-2 bg-background border-t z-20">
                <div className="relative w-full group">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Send a message to all models..."
                        className="min-h-[80px] max-h-[160px] pr-12 resize-none shadow-sm pb-10"
                    />
                    <div className="absolute bottom-2 left-2 flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearActiveSession}
                            className="h-7 px-2 text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all opacity-0 group-hover:opacity-100"
                        >
                            <Eraser className="w-3 h-3 mr-1.5" /> Clear Context
                        </Button>
                    </div>
                    <Button
                        onClick={handleSend}
                        disabled={isProcessing}
                        className="absolute bottom-3 right-3 h-8 w-8 p-0 rounded-full shadow-md"
                        size="icon"
                    >
                        {isProcessing ? (
                            <Play className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Model Details Editor Modal (Overlay) */}
            {modelToEdit && (
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
                                onClick={() => setModelToEdit(null)}
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
                                            setEditForm((prev) => ({
                                                ...prev,
                                                name: e.target.value
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Provider Type</Label>
                                    <select
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        value={editForm.provider}
                                        onChange={(e) =>
                                            setEditForm((prev) => ({
                                                ...prev,
                                                provider: e.target.value as any
                                            }))
                                        }
                                    >
                                        <option value="openrouter">
                                            OpenRouter
                                        </option>
                                        <option value="openai">OpenAI</option>
                                        <option value="anthropic">
                                            Anthropic
                                        </option>
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
                                            setEditForm((prev) => ({
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
                                            setEditForm((prev) => ({
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
                                            setEditForm((prev) => ({
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
                                            setEditForm((prev) => ({
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
                            <Button
                                variant="ghost"
                                onClick={() => setModelToEdit(null)}
                            >
                                Cancel
                            </Button>
                            <Button onClick={saveDetails}>Save Changes</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
