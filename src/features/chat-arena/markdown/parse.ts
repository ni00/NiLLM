import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import type { Root, RootContent, ElementContent } from 'hast'

const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })

export function safeMarkdownUrl(url: string): string {
    const colon = url.indexOf(':')
    if (colon < 0 || /^(https?|ircs?|mailto|xmpp)$/i.test(url.slice(0, colon)))
        return url
    for (const delimiter of ['/', '?', '#']) {
        const index = url.indexOf(delimiter)
        if (index >= 0 && index < colon) return url
    }
    return ''
}

function clean(node: ElementContent): ElementContent
function clean(node: RootContent): RootContent
function clean(node: RootContent): RootContent {
    if (node.type === 'raw') return { type: 'text', value: node.value }
    delete node.position
    if (node.type === 'element') {
        for (const key of ['href', 'src'] as const) {
            const value = node.properties[key]
            if (value !== undefined) {
                const url = String(value)
                node.properties[key] =
                    key === 'src' &&
                    /^data:image\/(png|jpeg|gif|webp);base64,/i.test(url)
                        ? url
                        : safeMarkdownUrl(url)
            }
        }
        node.children = node.children.map((child) => clean(child))
    }
    return node
}

/** Parse the whole document so late reference definitions and unfinished
 * tables/fences keep the same semantics as the completed Markdown. */
export function parseMarkdown(content: string): string[] {
    const tree = processor.runSync(processor.parse(content)) as Root
    return tree.children
        .filter((node) => node.type !== 'text' || node.value.trim() !== '')
        .map((node) => JSON.stringify(clean(node)))
}
