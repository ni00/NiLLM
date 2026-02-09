import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { getProvider } from '@/lib/ai-provider'
import { generateText } from 'ai'
import { LLMModel } from '@/lib/types'

export const useAutoJudge = (activeModels: LLMModel[], activeSession: any) => {
    const { models } = useAppStore()
    const [isJudging, setIsJudging] = useState(false)
    const [judgeModelId, setJudgeModelId] = useState<string>('')
    const [judgeStatus, setJudgeStatus] = useState<string | null>(null)
    const [showJudgePanel, setShowJudgePanel] = useState(false)
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

            const userPromptContent = `[User Prompt]\n${lastPrompt}\n\n[Model Responses to Evaluate]\n${responsesToJudge.map((r) => `Model ID: ${r.modelId}\nResponse:\n${r.response}`).join('\n\n---\n\n')}`

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

            const updateResult = useAppStore.getState().updateResult
            let updateCount = 0

            Object.entries(scores).forEach(([modelId, score]) => {
                const target = responsesToJudge.find(
                    (r) => r.modelId === modelId
                )
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

    return {
        isJudging,
        judgeModelId,
        setJudgeModelId,
        judgeStatus,
        setJudgeStatus,
        showJudgePanel,
        setShowJudgePanel,
        judgePrompt,
        setJudgePrompt,
        handleAutoJudge
    }
}
