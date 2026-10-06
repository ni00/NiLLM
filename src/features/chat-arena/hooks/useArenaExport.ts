import type { LLMModel, BenchmarkResult, ChatSession } from '@/lib/types'
import { downloadFile } from '@/lib/utils'

async function loadReportTools() {
    const [{ buildReportDocument }, { exportReportMarkdown }] =
        await Promise.all([
            import('@/features/stats/domain/report'),
            import('@/features/stats/domain/export-markdown')
        ])
    return { buildReportDocument, exportReportMarkdown }
}

export function useArenaExport(
    activeModels: LLMModel[],
    activeSession: ChatSession | undefined
) {
    const handleExportAll = async () => {
        if (!activeSession || activeModels.length === 0) return
        const { buildReportDocument, exportReportMarkdown } =
            await loadReportTools()

        const fullContent = exportReportMarkdown(
            buildReportDocument(
                {
                    source: 'arena',
                    models: activeModels,
                    sessions: [
                        {
                            ...activeSession,
                            results: Object.fromEntries(
                                activeModels.map((model) => [
                                    model.id,
                                    activeSession.results[model.id] ?? []
                                ])
                            )
                        }
                    ],
                    filter: {}
                },
                { includeContent: true, includeReasoning: false },
                Date.now()
            )
        )

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
        if (!activeSession || results.length === 0) return
        const { buildReportDocument, exportReportMarkdown } =
            await loadReportTools()

        const fullContent = exportReportMarkdown(
            buildReportDocument(
                {
                    source: 'arena',
                    models: [model],
                    sessions: [
                        { ...activeSession, results: { [model.id]: results } }
                    ],
                    filter: {}
                },
                { includeContent: true, includeReasoning: false },
                Date.now()
            )
        )
        const provider = model.providerName || model.provider

        await downloadFile(
            fullContent,
            `${model.name.replace(/\s+/g, '_')}_(${provider.replace(/\s+/g, '_')})_history_${new Date().toISOString().slice(0, 10)}.md`,
            'text/markdown'
        )
    }

    return { handleExportAll, handleExportHistory }
}
