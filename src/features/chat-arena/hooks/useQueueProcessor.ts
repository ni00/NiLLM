import { useEffect, useRef } from 'react'
import { broadcastMessage } from '@/features/benchmark/engine'
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
    const isProcessingRef = useRef(isProcessing)
    const messageQueueRef = useRef(messageQueue)
    const processingItemIdRef = useRef<string | null>(null)
    const isMountedRef = useRef(true)

    useEffect(() => {
        isProcessingRef.current = isProcessing
        messageQueueRef.current = messageQueue
    }, [isProcessing, messageQueue])

    useEffect(() => {
        isMountedRef.current = true

        return () => {
            isMountedRef.current = false
        }
    }, [])

    useEffect(() => {
        const processQueue = async () => {
            const nextItem = messageQueueRef.current.find(
                (m: { paused?: boolean }) => !m.paused
            )

            if (isProcessingRef.current || !nextItem) return

            // StrictMode protection: check if this specific item is already being processed
            if (processingItemIdRef.current === nextItem.id) return

            // Mark item as processing BEFORE any async operations
            processingItemIdRef.current = nextItem.id
            setProcessing(true)

            try {
                await broadcastMessage(nextItem.prompt, nextItem.sessionId)
            } catch (err) {
                console.error('Queue processing error:', err)
            } finally {
                // Only update state if still mounted
                if (isMountedRef.current) {
                    removeFromQueue(nextItem.id)
                    setProcessing(false)
                    processingItemIdRef.current = null
                }
            }
        }

        processQueue()
    }, [messageQueue, isProcessing, setProcessing, removeFromQueue])
}
