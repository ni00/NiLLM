export function isSendShortcut(event: KeyboardEvent): boolean {
    return (
        (event.ctrlKey || event.metaKey) &&
        event.key === 'Enter' &&
        !event.shiftKey
    )
}
