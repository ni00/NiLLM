import { describe, expect, it, vi } from 'vitest'
import { model, result, session } from '@/test/fixtures'
import { exampleResponse } from '@/test/decision-fixtures'
import { getDecisionTests } from '@/data/builtin-tests/decisions'
import { planExperiment } from '@/features/experiments/domain/plan'
import { compareExperiments } from '@/features/experiments/domain/statistics'
import {
    applyModelCapabilities,
    resolveGenerationConfig
} from '@/lib/generation-config'
import { captureModelSnapshot } from '@/features/benchmark/snapshots'
import { aggregateStatistics } from '@/features/stats/domain/statistics'
import { buildReportDocument } from '@/features/stats/domain/report'
import { parseBackup } from '@/lib/validation'
import { discoverModels } from '@/lib/providers/discovery'

const config = {
    temperature: 0.7,
    maxTokens: 4096,
    topP: 0.9,
    timeout: { totalMs: 120000, stepMs: 60000, chunkMs: 10000 },
    systemPrompt: 'Global prompt'
}
const jev = model('jev', {
    provider: 'typesafe',
    providerId: 'jev-latest',
    mode: 'decision'
})
const openai = model('openai', { provider: 'openai', mode: 'decision' })
const draft = {
    name: 'Decision test',
    testSet: getDecisionTests('en'),
    modelIds: ['jev', 'openai'],
    repetitions: 2,
    overrides: {},
    variants: [{ id: 'default', name: 'Default', overrides: {} }]
}

describe('decision evaluation workspace integration', () => {
    it('discovers native Jev models without treating them as chat models', async () => {
        const fetcher = vi.fn().mockResolvedValue(
            Response.json({
                models: [
                    { name: 'jev-latest', description: 'Jev' },
                    { name: 'jev-preview' }
                ]
            })
        )
        vi.stubGlobal('fetch', fetcher)
        try {
            expect(
                await discoverModels({ provider: 'typesafe', apiKey: 'fake' })
            ).toEqual([
                {
                    id: 'jev-latest',
                    name: 'jev-latest',
                    mode: 'decision',
                    decisionProtocol: 'system-one'
                },
                {
                    id: 'jev-preview',
                    name: 'jev-preview',
                    mode: 'decision',
                    decisionProtocol: 'system-one'
                }
            ])
        } finally {
            vi.unstubAllGlobals()
        }
    })
    it('freezes a repeatable plan and records omitted Jev parameters', async () => {
        const run = await planExperiment(draft, [jev, openai], config, 1)
        expect(run.tasks).toHaveLength(12)
        expect(run.models.map((snapshot) => snapshot.mode)).toEqual([
            'decision',
            'decision'
        ])
        expect(run.configByModelVariant.jev.default.effective).toMatchObject({
            timeout: { totalMs: 120000 }
        })
        expect(
            run.configByModelVariant.jev.default.effective.temperature
        ).toBeUndefined()
        expect(
            run.configByModelVariant.jev.default.effective.systemPrompt
        ).toBeUndefined()
        expect(
            run.configByModelVariant.jev.default.excludedParameters
        ).toContain('temperature')
        expect(
            run.configByModelVariant.openai.default.effective.temperature
        ).toBe(0.7)
        expect(
            run.configByModelVariant.openai.default.effective.timeout
        ).toEqual({ totalMs: 120000 })
        expect(
            applyModelCapabilities(
                run.configByModelVariant.jev.default,
                undefined,
                jev
            )
        ).toEqual(run.configByModelVariant.jev.default)
        expect(
            parseBackup({ models: [jev, openai], experimentRuns: [run] })
                .experimentRuns?.[0]
        ).toEqual(run)
    })
    it('rejects non-decision models or invalid tasks before scheduling', async () => {
        await expect(
            planExperiment(draft, [jev, { ...openai, mode: 'chat' }], config, 1)
        ).rejects.toThrow('Decision mode')
        await expect(
            planExperiment(
                {
                    ...draft,
                    testSet: {
                        ...draft.testSet,
                        cases: [{ id: 'x', prompt: 'ordinary chat prompt' }]
                    }
                },
                [jev, openai],
                config,
                1
            )
        ).rejects.toThrow('Decision input')
    })
    it('keeps decision duration, usage and scoring in reports without streaming speed samples', async () => {
        const snapshot = await captureModelSnapshot(jev)
        const outcome = result('decision', {
            modelId: 'jev',
            prompt: draft.testSet.cases[0].prompt,
            response: JSON.stringify(exampleResponse),
            ruleEvaluation: { type: 'decision', passed: true, evaluatedAt: 1 },
            requestSnapshot: {
                schemaVersion: 1,
                model: snapshot,
                parameters: applyModelCapabilities(
                    resolveGenerationConfig(config),
                    undefined,
                    jev
                ),
                context: 'independent',
                capturedAt: 1
            },
            metrics: {
                ttft: 0,
                tps: 0,
                totalDuration: 80,
                tokenCount: 30,
                inputTokens: 100,
                outputTokens: 30,
                tokenSource: 'api'
            }
        })
        const sessions = [session({ jev: [outcome] })]
        const stats = aggregateStatistics([jev], sessions, { mode: 'decision' })
        expect(stats.modelStats[0]).toMatchObject({
            mode: 'decision',
            durationSampleCount: 1,
            avgDuration: 80,
            speedSampleCount: 0,
            latencySampleCount: 0,
            rulePassRate: 100
        })
        const report = buildReportDocument(
            {
                source: 'arena',
                models: [jev],
                sessions,
                filter: { mode: 'decision' }
            },
            { includeContent: true, includeReasoning: false },
            1
        )
        expect(JSON.stringify(report)).toContain('decision')
        expect(JSON.stringify(report)).toContain('jev-1.13.0')
        expect(
            parseBackup({ models: [jev], sessions }).sessions?.[0].results
                .jev[0]
        ).toEqual(outcome)
    })
    it('does not compare runs using different numeric scoring tolerances', async () => {
        const first = await planExperiment(draft, [jev, openai], config, 1)
        const second = structuredClone(first)
        second.testSet.cases[0].evaluation!.tolerance = 0.01
        expect(
            compareExperiments(first, second, {
                baselineVariantId: 'default',
                targetVariantId: 'default'
            })
        ).toMatchObject({ compatible: false, reason: 'different-test-set' })
    })
})
