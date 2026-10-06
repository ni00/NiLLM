import type { ReportDocument } from './report-types'
import {
    baselineRows,
    filtersLine,
    frozenConfigRows,
    modelComparisonRows,
    provenanceFacts,
    summaryRows,
    trialRows
} from './report-rows'
import { DASH, mdEscapeCell, mdFence, mdMetric, mdTable } from './export-format'

function markdownRecords(document: ReportDocument): string[] {
    if (!document.records.length) return ['## Records', '', '_No records._']
    const parts: string[] = [
        '## Records',
        '',
        mdTable(
            [
                'Source',
                'Result',
                'Model',
                'Variant',
                'Attempt',
                'Status',
                'Summary',
                'TTFT (ms)',
                'TPS',
                'Duration (ms)',
                'Tokens in',
                'Tokens out',
                'Token source',
                'Cost (USD)',
                'Cost source',
                'Cache read tokens',
                'Cache write tokens',
                'Rating',
                'Rule',
                'AI accuracy'
            ],
            document.records.map((record) => [
                mdEscapeCell(record.source),
                mdEscapeCell(record.resultId),
                mdEscapeCell(record.modelId),
                mdEscapeCell(record.variantId ?? DASH),
                record.attempt === undefined ? DASH : String(record.attempt),
                mdEscapeCell(record.status),
                record.selectedForSummary ? 'yes' : 'no',
                mdMetric(record.ttft, record.ttft === undefined ? 0 : 1),
                mdMetric(record.tps, record.tps === undefined ? 0 : 1),
                mdMetric(
                    record.totalDuration,
                    record.totalDuration === undefined ? 0 : 1
                ),
                record.inputTokens === undefined
                    ? DASH
                    : String(record.inputTokens),
                record.outputTokens === undefined
                    ? DASH
                    : String(record.outputTokens),
                mdEscapeCell(record.tokenSource ?? 'unknown'),
                record.cost === undefined ? DASH : String(record.cost),
                mdEscapeCell(record.costSource ?? 'unknown'),
                record.cacheReadTokens === undefined
                    ? DASH
                    : String(record.cacheReadTokens),
                record.cacheWriteTokens === undefined
                    ? DASH
                    : String(record.cacheWriteTokens),
                record.rating === undefined ? DASH : String(record.rating),
                record.ruleEvaluation
                    ? String(record.ruleEvaluation.passed)
                    : DASH,
                mdMetric(
                    record.judgeEvaluation?.accuracy,
                    record.judgeEvaluation === undefined ? 0 : 1
                )
            ])
        )
    ]
    for (const record of document.records) {
        const recordId = mdEscapeCell(record.resultId)
        parts.push(
            '',
            `### Record ${recordId}`,
            '',
            `- Source: ${record.source}`,
            ...(record.sessionId !== undefined
                ? [`- Session: ${mdEscapeCell(record.sessionId)}`]
                : []),
            ...(record.runId !== undefined
                ? [`- Run: ${mdEscapeCell(record.runId)}`]
                : []),
            ...(record.taskId !== undefined
                ? [
                      `- Task: ${mdEscapeCell(record.taskId)} (case ${record.caseId === undefined ? DASH : mdEscapeCell(record.caseId)}, repeat ${record.repeatIndex ?? DASH})`
                  ]
                : []),
            `- Status: ${record.status}`,
            ...provenanceFacts(document, record).map((fact) => `- ${fact}`),
            ...(record.prompt !== undefined
                ? ['', 'Prompt:', '', mdFence(record.prompt)]
                : []),
            ...(record.expected !== undefined
                ? ['', 'Expected:', '', mdFence(record.expected)]
                : []),
            ...(record.response !== undefined
                ? ['', 'Response:', '', mdFence(record.response)]
                : []),
            ...(record.reasoning !== undefined
                ? ['', 'Reasoning:', '', mdFence(record.reasoning)]
                : []),
            ...(record.judgeEvaluation?.rationale !== undefined
                ? [
                      '',
                      'Judge rationale:',
                      '',
                      mdFence(record.judgeEvaluation.rationale)
                  ]
                : [])
        )
    }
    return parts
}

/** Escape table HTML/pipes and fence record bodies to match their backticks. */
export function exportReportMarkdown(document: ReportDocument): string {
    const sections: string[] = [
        `# ${mdEscapeCell(document.metadata.title)}`,
        '',
        `Generated: ${document.metadata.generatedAt}  `,
        `NiLLM v${document.metadata.appVersion}  `,
        `Source: ${document.metadata.source}  `,
        filtersLine(document),
        '',
        '## Summary',
        '',
        mdTable(['Metric', 'Value'], summaryRows(document)),
        '',
        '## Model comparison',
        '',
        document.modelComparison.length
            ? modelComparisonRows(document)
            : '_No models with recorded results._'
    ]
    sections.push('', ...frozenConfigRows(document))
    sections.push('', ...baselineRows(document))
    sections.push('', ...trialRows(document))
    sections.push('', ...markdownRecords(document))
    return sections.join('\n').replace(/\n{3,}/g, '\n\n') + '\n'
}
