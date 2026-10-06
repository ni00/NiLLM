import type { BenchmarkResult } from '@/lib/types'

// Transient streaming buffers: coalesces chunk updates into one rAF-driven
// store write so per-chunk work never reaches durable persistence.
let pendingUpdates: Record<string, Partial<BenchmarkResult>> = {}
let rafId: number | null = null
let isPaused = false

/** The store injects its batched-write action here; this module must not
 * import the store to avoid a lib-internal cycle. */
let setBatchedStreamingData:
    ((updates: Record<string, Partial<BenchmarkResult>>) => void) | null = null

export function configureStreamingUI(
    apply: (updates: Record<string, Partial<BenchmarkResult>>) => void
) {
    setBatchedStreamingData = apply
}

function scheduleFlush() {
    if (rafId === null && !isPaused) {
        rafId = requestAnimationFrame(flushUpdates)
    }
}

function flushUpdates() {
    rafId = null
    if (isPaused) return

    if (
        Object.keys(pendingUpdates).length > 0 &&
        setBatchedStreamingData !== null
    ) {
        setBatchedStreamingData(pendingUpdates)
        pendingUpdates = {}
    }
    if (Object.keys(pendingUpdates).length > 0 && !isPaused) {
        rafId = requestAnimationFrame(flushUpdates)
    }
}

export function pauseStreamingUI() {
    isPaused = true
    if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
    }
}

export function resumeStreamingUI() {
    const wasPaused = isPaused
    isPaused = false
    if (wasPaused && Object.keys(pendingUpdates).length > 0) {
        scheduleFlush()
    }
}

export function getPendingUpdatesCount(): number {
    return Object.keys(pendingUpdates).length
}

export function scheduleStreamingUpdate(
    id: string,
    update: Partial<BenchmarkResult> | null
) {
    if (update) {
        pendingUpdates[id] = update
        scheduleFlush()
    } else delete pendingUpdates[id]
}

/** Drops buffered updates when all streams are cancelled at once. */
export function abortStreamingUI() {
    pendingUpdates = {}
    if (rafId !== null) cancelAnimationFrame(rafId)
    rafId = null
}
