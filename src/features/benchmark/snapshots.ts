import type { LLMModel, ModelSnapshot } from '@/lib/types'
import { getBaseURL } from '@/lib/providers/catalog'

const fingerprintCache = new Map<string, Promise<string>>()
const MAX_FINGERPRINTS = 32

/** Public endpoint form: the normalized URL without query or hash. */
export function publicEndpoint(normalizedURL: string): string {
    const url = new URL(normalizedURL)
    url.search = ''
    url.hash = ''
    return url.href.replace(/\/$/, '')
}

/**
 * SHA-256 of the fully normalized base URL, hex-encoded (64 lowercase chars).
 * Same-URL promises are cached (bounded, LRU-touched like the provider cache)
 * so capturing many requests does not re-hash or drift.
 */
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

/**
 * Freezes a model's execution identity. Throws when `getBaseURL` rejects the
 * endpoint, so callers decide whether one bad model may affect others.
 * Never contains `apiKey`; the endpoint is the sanitized public form.
 */
export async function captureModelSnapshot(
    model: LLMModel
): Promise<ModelSnapshot> {
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
        ...(model.pricing !== undefined && {
            pricing: { ...model.pricing }
        }),
        endpoint: publicEndpoint(normalized),
        endpointFingerprint: fingerprint,
        ...(model.capabilities !== undefined && {
            capabilities: { ...model.capabilities }
        })
    }
}
