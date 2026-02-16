import { useEffect, useRef } from 'react'
import { broadcastMessage } from '@/features/benchmark/engine'
import { useAppStore } from '@/lib/store'
import {
    useMessageQueue,
    useIsProcessing,
    useSetProcessing,
    useRemoveFromQueue
} from '@/lib/hooks/useStoreSelectors'

export const useQueueProcessor = () => {
    const messageQueue = useMessageQueue()
    const isProcessing = useIsProcessing()
    const setProcessing = useSetProcessing()
    const removeFromQueue = useRemoveFromQueue()

    const processingRef = useRef(false)

    useEffect(() => {
        if (isProcessing || processingRef.current || messageQueue.length === 0)
            return

        const hasPending = messageQueue.some((m) => !m.paused)
        if (!hasPending) return

        processingRef.current = true

        const processNextItem = async () => {
            const nextItem = useAppStore
                .getState()
                .messageQueue.find((m) => !m.paused)

            if (!nextItem) {
                processingRef.current = false
                return
            }

            setProcessing(true)

            try {
                await broadcastMessage(nextItem.prompt, nextItem.sessionId)
            } catch (err) {
                console.error('Queue processing error:', err)
            } finally {
                removeFromQueue(nextItem.id)
                setProcessing(false)
                processingRef.current = false
            }
        }

        processNextItem()
    }, [messageQueue, isProcessing, setProcessing, removeFromQueue])
}
