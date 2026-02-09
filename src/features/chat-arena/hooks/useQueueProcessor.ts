import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { broadcastMessage } from '@/features/benchmark/engine'

export const useQueueProcessor = () => {
    const { messageQueue, isProcessing, setProcessing, removeFromQueue } =
        useAppStore()

    useEffect(() => {
        const processQueue = async () => {
            const state = useAppStore.getState()
            const {
                isProcessing,
                messageQueue,
                setProcessing,
                removeFromQueue
            } = state

            const nextItem = messageQueue.find((m) => !m.paused)

            if (isProcessing || !nextItem) return

            setProcessing(true)

            try {
                await broadcastMessage(nextItem.prompt, nextItem.sessionId)
            } catch (err) {
                console.error('Queue processing error:', err)
            } finally {
                removeFromQueue(nextItem.id)
                setProcessing(false)
            }
        }

        processQueue()
    }, [messageQueue, isProcessing, setProcessing, removeFromQueue])
}
