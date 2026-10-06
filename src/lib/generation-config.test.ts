import { describe, expect, it } from 'vitest'
import type { GenerationConfig } from '@/lib/types'
import {
    mergeConfigPatch,
    mergeGenerationConfig,
    resetConfigField,
    resolveGenerationConfig,
    applyModelCapabilities
} from './generation-config'

const global: GenerationConfig = {
    maxConcurrent: 4,
    temperature: 0.7,
    maxTokens: 4096,
    topP: 0.9,
    systemPrompt: 'You are a helpful assistant.',
    timeout: { totalMs: 120000, stepMs: 60000, chunkMs: 10000 },
    telemetry: {
        isEnabled: false,
        recordInputs: true,
        recordOutputs: true,
        metadata: { env: 'local' }
    }
}

describe('mergeGenerationConfig', () => {
    it('keeps zero values as explicit overrides', () => {
        const merged = mergeGenerationConfig(global, { temperature: 0 })
        expect(merged.temperature).toBe(0)
        expect(merged.maxTokens).toBe(4096)
    })

    it('merges timeout and telemetry per field and replaces metadata', () => {
        const merged = mergeGenerationConfig(global, {
            timeout: { chunkMs: 5000 },
            telemetry: { metadata: { run: 'a' } }
        })
        expect(merged.timeout).toEqual({
            totalMs: 120000,
            stepMs: 60000,
            chunkMs: 5000
        })
        expect(merged.telemetry?.isEnabled).toBe(false)
        expect(merged.telemetry?.recordInputs).toBe(true)
        expect(merged.telemetry?.metadata).toEqual({ run: 'a' })
    })

    it('treats an empty array as an explicit stop sequence override', () => {
        const merged = mergeGenerationConfig(global, { stopSequences: [] })
        expect(merged.stopSequences).toEqual([])
    })

    it('falls back to disabled telemetry without a base', () => {
        const base: GenerationConfig = { ...global, telemetry: undefined }
        const merged = mergeGenerationConfig(base, {
            telemetry: { functionId: 'x' }
        })
        expect(merged.telemetry?.isEnabled).toBe(false)
        expect(merged.telemetry?.functionId).toBe('x')
    })

    it('inherits undefined nested fields and retains telemetry choices when toggled', () => {
        const merged = mergeGenerationConfig(global, {
            timeout: { totalMs: undefined, chunkMs: 5000 },
            telemetry: { isEnabled: true, recordInputs: undefined }
        })
        expect(merged.timeout).toEqual({
            totalMs: 120000,
            stepMs: 60000,
            chunkMs: 5000
        })
        expect(merged.telemetry).toEqual({
            ...global.telemetry,
            isEnabled: true
        })
    })
})

describe('resolveGenerationConfig', () => {
    it('applies global → model → experiment → variant precedence', () => {
        const resolved = resolveGenerationConfig(
            global,
            { temperature: 0, maxTokens: 100 },
            { temperature: 0.3 },
            { maxTokens: 200 }
        )
        expect(resolved.requested.temperature).toBe(0.3)
        expect(resolved.requested.maxTokens).toBe(200)
        expect(resolved.sources.temperature).toBe('experiment')
        expect(resolved.sources.maxTokens).toBe('variant')
        expect(resolved.sources.topP).toBe('global')
        expect(resolved.effective.maxConcurrent).toBeUndefined()
        expect(resolved.effective.temperature).toBe(0.3)
    })

    it('merges nested fields per layer and reports dot-path sources', () => {
        const resolved = resolveGenerationConfig(global, {
            timeout: { chunkMs: 5000 }
        })
        expect(resolved.requested.timeout).toEqual({
            totalMs: 120000,
            stepMs: 60000,
            chunkMs: 5000
        })
        expect(resolved.sources['timeout.totalMs']).toBe('global')
        expect(resolved.sources['timeout.chunkMs']).toBe('model')
    })

    it('keeps undefined-meaningless fields inheriting while zeros stick', () => {
        const resolved = resolveGenerationConfig(global, {
            temperature: 0,
            topP: 0,
            systemPrompt: ''
        })
        expect(resolved.requested.temperature).toBe(0)
        expect(resolved.requested.topP).toBe(0)
        expect(resolved.requested.systemPrompt).toBe('')
        expect(resolved.sources.systemPrompt).toBe('model')
    })

    it('omits declared unsupported fields without rewriting requested values', () => {
        const resolved = resolveGenerationConfig(global, {
            seed: 0,
            temperature: 0
        })
        const filtered = applyModelCapabilities(resolved, {
            unsupportedParameters: ['seed', 'temperature', 'seed']
        })
        expect(filtered.requested.seed).toBe(0)
        expect(filtered.requested.temperature).toBe(0)
        expect(filtered.effective.seed).toBeUndefined()
        expect(filtered.effective.temperature).toBeUndefined()
        expect(filtered.effective.maxTokens).toBe(4096)
        expect(filtered.excludedParameters).toEqual(['seed', 'temperature'])
        expect(filtered.sources.temperature).toBe('model')
        expect(resolved.effective.seed).toBe(0)
    })
})

describe('mergeConfigPatch / resetConfigField', () => {
    it('clears a field back to inheritance on undefined input', () => {
        const patch = mergeConfigPatch(
            { temperature: 0.2 },
            {
                temperature: undefined
            }
        )
        expect(patch).toEqual({})
    })

    it('removes nested objects once every field is cleared', () => {
        const patch = resetConfigField(
            { timeout: { chunkMs: 5000 }, temperature: 1 },
            'timeout.chunkMs'
        )
        expect(patch).toEqual({ temperature: 1 })
    })

    it('keeps sibling fields when resetting one nested field', () => {
        const patch = resetConfigField(
            { timeout: { chunkMs: 5000, totalMs: 30000 } },
            'timeout.chunkMs'
        )
        expect(patch).toEqual({ timeout: { totalMs: 30000 } })
    })

    it('keeps telemetry metadata and output choices when another field changes', () => {
        const patch = mergeConfigPatch(
            { telemetry: { metadata: { run: 'a' }, recordOutputs: false } },
            { telemetry: { isEnabled: true } }
        )
        expect(patch.telemetry).toEqual({
            metadata: { run: 'a' },
            recordOutputs: false,
            isEnabled: true
        })
    })

    it('does not leak untouched fields into the patch', () => {
        const patch = mergeConfigPatch({}, { temperature: 0.4 })
        expect(patch).toEqual({ temperature: 0.4 })
    })
})
