export interface MarkdownRequest {
    id: string
    revision: number
    content: string
}

export interface MarkdownReply {
    id: string
    revision: number
    blocks?: string[]
    failed?: boolean
}
