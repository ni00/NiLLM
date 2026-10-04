import { useEffect, useRef } from 'react'
import { broadcastMessage, retryResult } from '@/features/benchmark/engine'
import { runExperiment } from '@/features/experiments/runner'
import { useAppStore, storeHydration } from '@/lib/store'
import {
    useMessageQueue,
    useIsProcessing,
    useSetProcessing,
    useRemoveFromQueue,
    useFailQueueItem
} from '@/lib/hooks/useStoreSelectors'

/**
 * The single scheduler, mounted once from the Layout: leaving a page never
 * stops work. It serializes one unit at a time — a queued experiment run
 * (creation order) or one ordinary/retry broadcast — and releases
 * `isProcessing` only after the unit settles, so Stop All cannot strand a
 * lock while stale finally-blocks still run.
 */
export const useQueueProcessor = () => {
    const messageQueue = useMessageQueue()
    const isProcessing = useIsProcessing()
    const setProcessing = useSetProcessing()
    const removeFromQueue = useRemoveFromQueue()
    const failQueueItem = useFailQueueItem()
    const experimentRuns = useAppStore((state) => state.experimentRuns)
    const isJudging = useAppStore((state) => state.isJudging)

    const processingRef = useRef(false)

    useEffect(() => {
        if (isProcessing || processingRef.current || isJudging) return

        const hasPendingQueue = messageQueue.some((m) => !m.paused)
        const queuedRun = experimentRuns.find((run) => run.status === 'queued')
        if (!queuedRun && !hasPendingQueue) return

        let cancelled = false
        processingRef.current = true

        const process = async () => {
            await storeHydration
            if (cancelled) {
                processingRef.current = false
                return
            }
            const state = useAppStore.getState()
            try {
                // Queued runs take priority over ordinary queue items.
                const run = state.experimentRuns.find(
                    (candidate) => candidate.status === 'queued'
                )
                if (run) {
                    setProcessing(true)
                    await runExperiment(run.id)
                    return
                }
                const item = state.messageQueue.find((entry) => !entry.paused)
                if (!item) return
                setProcessing(true)
                try {
                    if (item.retry)
                        await retryResult(
                            item.sessionId ?? '',
                            item.retry.modelId,
                            item.retry.resultId
                        )
                    else await broadcastMessage(item.prompt, item.sessionId)
                    removeFromQueue(item.id)
                } catch (error) {
                    // Failed dispatches stay visible and paused with their
                    // prompt intact instead of vanishing into a catch.
                    failQueueItem(
                        item.id,
                        error instanceof Error
                            ? error.message
                            : 'Request could not be dispatched.'
                    )
                }
            } catch (error) {
                console.error('Queue processing error:', error)
            } finally {
                setProcessing(false)
                processingRef.current = false
            }
        }

        void process()
        return () => {
            cancelled = true
        }
    }, [
        messageQueue,
        experimentRuns,
        isProcessing,
        isJudging,
        setProcessing,
        removeFromQueue,
        failQueueItem
    ])
}
