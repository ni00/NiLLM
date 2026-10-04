/**
 * Bounded cursor loop shared by arena broadcasts and experiment runners.
 *
 * Task failures that are legitimate outcomes must be represented by the task
 * itself (never thrown). An unexpected throw records the first error, stops
 * claiming new items, and only rethrows after every in-flight task has
 * settled — no fail-fast `Promise.all` that strands background requests.
 */
export async function runConcurrent<T>(
    items: readonly T[],
    concurrency: number,
    task: (item: T) => Promise<void>
): Promise<void> {
    let index = 0
    let firstError: unknown
    let failed = false
    const width = Math.max(1, Math.min(concurrency, items.length))
    const workers = Array.from({ length: width }, async () => {
        while (index < items.length) {
            if (failed) return
            const item = items[index++]
            try {
                await task(item)
            } catch (error) {
                if (!failed) {
                    failed = true
                    firstError = error
                }
                return
            }
        }
    })
    await Promise.all(workers)
    if (failed) throw firstError
}
