import { LLMModel, BenchmarkResult } from '@/lib/types'
import { downloadFile } from '@/lib/utils'

export function useArenaExport(
    activeModels: LLMModel[],
    activeSession:
        | { id: string; results: Record<string, BenchmarkResult[]> }
        | undefined
) {
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

        await downloadFile(
            fullContent,
            `${model.name.replace(/\s+/g, '_')}_(${provider.replace(/\s+/g, '_')})_history_${new Date().toISOString().slice(0, 10)}.md`,
            'text/markdown'
        )
    }

    return { handleExportAll, handleExportHistory }
}
