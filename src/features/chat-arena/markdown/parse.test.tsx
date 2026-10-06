import { expect, it } from 'vitest'
import { Fragment } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import type { Nodes } from 'hast'
import { parseMarkdown, safeMarkdownUrl } from './parse'

function html(content: string) {
    return renderToStaticMarkup(
        <>
            {parseMarkdown(content).map((block, index) => (
                <Fragment key={index}>
                    {toJsxRuntime(JSON.parse(block) as Nodes, {
                        Fragment,
                        jsx,
                        jsxs,
                        passKeys: true
                    })}
                </Fragment>
            ))}
        </>
    )
}

it('preserves full-document Markdown semantics through unfinished fences, tables and late definitions', () => {
    const documents = [
        '## Heading\n\n- first\n- second\n\n> Quote\n> continuation',
        '| A | B |\n| --- | --- |\n| 1 | 2 |',
        '```typescript\nconst x = "<tag>";\n\nlet y = 2;',
        '```typescript\nconst x = "<tag>";\n\nlet y = 2;\n```\n\nAfter',
        'See [reference][later].\n\n[later]: https://example.com',
        '- [x] done\n- [ ] pending\n\n~~deleted~~\n\nwww.example.com',
        'Entities &copy; &NotEqualTilde; &#x1f600; &colon;',
        'Text <img src=x onerror="alert(1)">\n\n<script>alert(1)</script>'
    ]
    for (const content of documents) {
        const expected = renderToStaticMarkup(
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        )
        expect(html(content).replaceAll('\n', '')).toBe(
            expected.replaceAll('\n', '')
        )
    }
    expect(html('See [reference][later].')).not.toContain('href=')
})

it('pins literal HTML for representative Markdown constructs', () => {
    expect(html('[unsafe](javascript:alert%281%29)')).toBe(
        '<p><a href="">unsafe</a></p>'
    )
    expect(
        html('See [reference][later].\n\n[later]: https://example.com')
    ).toBe('<p>See <a href="https://example.com">reference</a>.</p>')
    expect(html('*a* and **b**')).toBe(
        '<p><em>a</em> and <strong>b</strong></p>'
    )
    expect(html('```typescript\nconst x = "<tag>";\n```')).toBe(
        '<pre><code class="language-typescript">const x = &quot;&lt;tag&gt;&quot;;\n</code></pre>'
    )
})

it('blocks unsafe URLs and raw HTML while allowing only raster data images', () => {
    const output = html(
        '[unsafe](javascript:alert%281%29)\n\n![svg](data:image/svg+xml;base64,PHN2Zz4=)\n\n![png](data:image/png;base64,aGVsbG8=)\n\n<img onerror="alert(1)">'
    )
    expect(output).not.toContain('href="javascript:')
    expect(output).not.toContain('src="data:image/svg')
    expect(output).toContain('src="data:image/png;base64,aGVsbG8="')
    expect(output).toContain('&lt;img onerror=')
    for (const url of [
        'javascript:alert(1)',
        'data:text/html,a',
        'https://example.com',
        '/relative?a:b',
        'https:relative',
        'mailto:test@example.com',
        '#fragment:abc',
        'ftp://example.com',
        'IRCS://example.com',
        'tel:123'
    ]) {
        expect(safeMarkdownUrl(url)).toBe(defaultUrlTransform(url))
    }
})

it('keeps unchanged blocks identical and removes parse positions from transferred data', () => {
    const prefix =
        '![preview](https://example.com/image.png)\n\nStable paragraph.\n\n'
    const before = parseMarkdown(prefix + 'Growing')
    const after = parseMarkdown(prefix + 'Growing answer')
    expect(after.slice(0, 2)).toEqual(before.slice(0, 2))
    expect(after.join('')).not.toContain('"position"')
    expect(after.at(-1)).not.toBe(before.at(-1))
})
