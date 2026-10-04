import type { ModelMessage, UserContent } from 'ai'
import type { Message } from '@/lib/types'

export function toModelMessages(messages: Message[]): ModelMessage[] {
    return messages.map((message) => {
        if (
            message.role !== 'user' ||
            !message.content.includes('<<<<IMAGE_START>>>>')
        )
            return message
        const parts: UserContent = []
        const pattern = /<<<<IMAGE_START>>>>(.*?)<<<<IMAGE_END>>>>/gs
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
