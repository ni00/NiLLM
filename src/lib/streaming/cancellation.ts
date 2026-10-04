const cancellations = new Set<() => void>()
let generation = 0
export const streamGeneration = () => generation
export function registerStreamCancellation(cancel: () => void) {
    cancellations.add(cancel)
    return () => cancellations.delete(cancel)
}
export function cancelAllStreams() {
    generation++
    for (const cancel of [...cancellations]) cancel()
    cancellations.clear()
}
