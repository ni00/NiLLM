import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MarkdownContent } from './MarkdownContent'
import { parseMarkdown } from '../markdown/parse'
import { markdownRenderer } from '../markdown/renderer'
import type { MarkdownReply, MarkdownRequest } from '../markdown/protocol'
import { ThinkingBlock } from './result/ThinkingBlock'

beforeEach(() => {
    vi.stubGlobal(
        'Worker',
        class {
            onmessage: ((event: MessageEvent<MarkdownReply>) => void) | null =
                null
            terminate() {}
            postMessage(request: MarkdownRequest) {
                queueMicrotask(() =>
                    this.onmessage?.({
                        data: {
                            id: request.id,
                            revision: request.revision,
                            blocks: parseMarkdown(request.content)
                        }
                    } as MessageEvent<MarkdownReply>)
                )
            }
        }
    )
})
afterEach(() => {
    cleanup()
    markdownRenderer.dispose()
    vi.unstubAllGlobals()
})

it('preserves images across updates and renders GFM without unsafe links', async () => {
    const image = 'data:image/png;base64,aGVsbG8='
    const content = `![preview](${image})\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n[unsafe](javascript:alert%281%29)`
    const { rerender } = render(<MarkdownContent content={content} />)
    const before = await screen.findByRole('img', { name: 'preview' })
    expect(before.getAttribute('src')).toBe(image)
    expect(screen.getByRole('table')).toBeTruthy()
    expect(screen.getByText('unsafe').getAttribute('href')).not.toContain(
        'javascript:'
    )
    rerender(<MarkdownContent content={content + '\n\nMore text.'} />)
    await screen.findByText('More text.')
    expect(screen.getByRole('img', { name: 'preview' })).toBe(before)
    expect(screen.getByText('More text.')).toBeTruthy()
})

it('only parses and mounts reasoning when its disclosure is open', async () => {
    const { rerender, container } = render(
        <ThinkingBlock reasoning="Hidden **reasoning**" isStreaming={false} />
    )
    expect(container.querySelector('.thinking-block-content')).toBeNull()
    rerender(
        <ThinkingBlock reasoning="Updated **reasoning**" isStreaming={false} />
    )
    expect(container.querySelector('.thinking-block-content')).toBeNull()
    fireEvent.click(screen.getByRole('button'))
    expect(await screen.findByText('reasoning')).toBeTruthy()
    expect(container.querySelector('strong')?.textContent).toBe('reasoning')
    fireEvent.click(screen.getByRole('button'))
    expect(container.querySelector('.thinking-block-content')).toBeNull()
})
