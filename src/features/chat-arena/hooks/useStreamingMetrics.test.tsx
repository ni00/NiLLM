import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { storeHydration, useAppStore } from '@/lib/store'
import type { BenchmarkResult, LLMModel } from '@/lib/types'
import { useStreamingMetrics } from './useStreamingMetrics'
import { useArenaMetrics } from './useArenaMetrics'

const metricDefaults = { ttft: 100, totalDuration: 1000, tokenCount: 10 }

beforeEach(async () => {
    await storeHydration
    vi.useFakeTimers()
    useAppStore.setState({ streamingData: {} })
})
afterEach(() => {
    cleanup()
    useAppStore.setState({ streamingData: {} })
    vi.useRealTimers()
})

it('samples only the latest metrics without retaining response strings and clears immediately', () => {
    const { result, unmount } = renderHook(useStreamingMetrics)
    act(() => {
        for (let index = 0; index < 100; index++) {
            useAppStore.setState({
                streamingData: {
                    answer: {
                        response: 'x'.repeat(index * 1000),
                        metrics: { ...metricDefaults, tps: index }
                    }
                }
            })
        }
    })
    expect(result.current).toEqual({})
    act(() => vi.advanceTimersByTime(250))
    expect(result.current).toEqual({
        answer: { metrics: { ...metricDefaults, tps: 99 } }
    })
    act(() => useAppStore.setState({ streamingData: {} }))
    expect(result.current).toEqual({})
    unmount()
    expect(vi.getTimerCount()).toBe(0)
})

it('uses final recorded metrics immediately even while another model is still streaming', () => {
    const models: LLMModel[] = [
        { id: 'model', name: 'Model', provider: 'custom', enabled: true }
    ]
    const metrics = { ttft: 100, tps: 10, totalDuration: 1000, tokenCount: 10 }
    const answer: BenchmarkResult = {
        id: 'answer',
        modelId: 'model',
        prompt: 'Hi',
        response: '',
        status: 'pending',
        timestamp: 0,
        metrics
    }
    useAppStore.setState({
        streamingData: {
            answer: { metrics: { ...metricDefaults, tps: 20 } },
            other: { metrics: { ...metricDefaults, tps: 5 } }
        }
    })
    const { result, rerender } = renderHook(
        ({ record }) =>
            useArenaMetrics(
                models,
                { results: { model: [record] } },
                'default'
            ),
        { initialProps: { record: answer } }
    )
    expect(result.current.metricsRanges.tps.max).toBe(20)
    rerender({
        record: {
            ...answer,
            status: 'completed',
            metrics: { ...metrics, tps: 30 }
        }
    })
    expect(result.current.metricsRanges.tps.max).toBe(30)
    expect(result.current.aggregateMetrics[0].avgTps).toBe(30)
    expect(result.current.displayModels).toBe(models)
})
