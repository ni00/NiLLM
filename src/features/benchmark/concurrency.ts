/** Bound parallel dispatch; on an unexpected error stop claiming items and
 * wait for in-flight tasks before rethrowing. Expected failures are task outcomes. */
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
