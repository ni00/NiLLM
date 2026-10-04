import { useAppStore } from '@/lib/store'
import type { BenchmarkResult } from '@/lib/types'

// Transient streaming buffers: coalesces chunk updates into one rAF-driven
// store write so per-chunk work never reaches durable persistence.
let pendingUpdates: Record<string, Partial<BenchmarkResult>> = {}
let rafId: number | null = null
let isPaused = false

function scheduleFlush() {
    if (rafId === null && !isPaused) {
        rafId = requestAnimationFrame(flushUpdates)
    }
}

function flushUpdates() {
    rafId = null
    if (isPaused) return

    const store = useAppStore.getState()
    if (Object.keys(pendingUpdates).length > 0) {
        store.setBatchedStreamingData(pendingUpdates)
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
