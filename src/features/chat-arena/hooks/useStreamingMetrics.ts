import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import type { BenchmarkMetrics } from '@/lib/types'

function snapshot(): Record<string, { metrics?: Partial<BenchmarkMetrics> }> {
    return Object.fromEntries(
        Object.entries(useAppStore.getState().streamingData).map(
            ([id, data]) => [id, { metrics: data.metrics }]
        )
    )
}

/** Cross-model comparisons refresh four times a second without subscribing
 * the whole arena to response strings or retaining old text buffers. */
export function useStreamingMetrics() {
    const [metrics, setMetrics] = useState(snapshot)
    useEffect(() => {
        let previous = useAppStore.getState().streamingData
        let timer: ReturnType<typeof setTimeout> | undefined
        const publish = () => {
            timer = undefined
            setMetrics(snapshot())
        }
        const unsubscribe = useAppStore.subscribe((state) => {
            if (previous === state.streamingData) return
            previous = state.streamingData
            if (Object.keys(previous).length === 0) {
                clearTimeout(timer)
                publish()
            } else if (timer === undefined) {
                timer = setTimeout(publish, 250)
            }
        })
        publish()
        return () => {
            unsubscribe()
            clearTimeout(timer)
        }
    }, [])
    return metrics
}
