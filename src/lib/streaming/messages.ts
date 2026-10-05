import type { ModelMessage, UserContent } from 'ai'
import type { Message } from '@/lib/types'

const IMAGE_MARKER_PATTERN = /<<<<IMAGE_START>>>>(.*?)<<<<IMAGE_END>>>>/gs

export function toModelMessages(messages: Message[]): ModelMessage[] {
    return messages.map((message) => {
        if (
            message.role !== 'user' ||
            !message.content.includes('<<<<IMAGE_START>>>>')
        )
            return message
        const parts: UserContent = []
        const pattern = IMAGE_MARKER_PATTERN
        let previous = 0
        for (const match of message.content.matchAll(pattern)) {
            const text = message.content.slice(previous, match.index)
            if (text.trim()) parts.push({ type: 'text', text })
            const data = match[1]
            const mediaType = /^data:([^;]+);/.exec(data)?.[1] || 'image/png'
            parts.push({ type: 'file', data, mediaType })
            previous = match.index + match[0].length
        }
        const tail = message.content.slice(previous)
        if (tail.trim()) parts.push({ type: 'text', text: tail })
        return { role: 'user', content: parts.length ? parts : message.content }
    })
}

/** Uses exactly the complete marker pairs consumed by toModelMessages. */
export function hasImageInput(messages: Message[]): boolean {
    return messages.some(
        (message) =>
            message.role === 'user' &&
            !message.content.matchAll(IMAGE_MARKER_PATTERN).next().done
    )
}
