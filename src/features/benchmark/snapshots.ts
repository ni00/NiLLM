import type { LLMModel, ModelSnapshot } from '@/lib/types'
import { getBaseURL } from '@/lib/providers/catalog'
import { resolveModelPricing } from '@/lib/providers/presets'

const fingerprintCache = new Map<string, Promise<string>>()
const MAX_FINGERPRINTS = 32

/** Public endpoint form: the normalized URL without query or hash. */
export function publicEndpoint(normalizedURL: string): string {
    const url = new URL(normalizedURL)
    url.search = ''
    url.hash = ''
    return url.href.replace(/\/$/, '')
}

/** Cache SHA-256 fingerprints of normalized endpoints (bounded LRU). */
export function endpointFingerprint(normalizedURL: string): Promise<string> {
    const cached = fingerprintCache.get(normalizedURL)
    if (cached) {
        fingerprintCache.delete(normalizedURL)
        fingerprintCache.set(normalizedURL, cached)
        return cached
    }
    const promise = crypto.subtle
        .digest('SHA-256', new TextEncoder().encode(normalizedURL))
        .then((digest) =>
            Array.from(new Uint8Array(digest))
                .map((byte) => byte.toString(16).padStart(2, '0'))
                .join('')
        )
    fingerprintCache.set(normalizedURL, promise)
    promise.catch(() => {
        if (fingerprintCache.get(normalizedURL) === promise)
            fingerprintCache.delete(normalizedURL)
    })
    if (fingerprintCache.size > MAX_FINGERPRINTS)
        fingerprintCache.delete(fingerprintCache.keys().next().value!)
    return promise
}

/** Freeze execution identity without credentials; reject invalid endpoints. */
export async function captureModelSnapshot(
    model: LLMModel
): Promise<ModelSnapshot> {
    // Capture mutable configuration before fingerprinting yields control.
    model = structuredClone(model)
    model.pricing = resolveModelPricing(model)
    const normalized = getBaseURL(model)
    const fingerprint = await endpointFingerprint(normalized)
    return {
        id: model.id,
        name: model.name,
        provider: model.provider,
        ...(model.providerName !== undefined && {
            providerName: model.providerName
        }),
        ...(model.providerId !== undefined && {
            providerId: model.providerId
        }),
        mode: model.mode ?? 'chat',
        ...(model.decisionProtocol !== undefined && {
            decisionProtocol: model.decisionProtocol
        }),
        ...(model.pricing !== undefined && {
            pricing: { ...model.pricing }
        }),
        endpoint: publicEndpoint(normalized),
        endpointFingerprint: fingerprint,
        ...(model.capabilities !== undefined && {
            capabilities: structuredClone(model.capabilities)
        })
    }
}
