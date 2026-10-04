import { createServer } from 'vite'

async function readSecret() {
    if (process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY
    if (!process.stdin.isTTY)
        throw new Error('Provide DEEPSEEK_API_KEY through the environment.')
    process.stdout.write('Enter test API key (hidden): ')
    process.stdin.setRawMode(true)
    process.stdin.resume()
    return new Promise((resolve, reject) => {
        let secret = ''
        const read = (data) => {
            const value = data.toString()
            if (value.includes('\u0003')) {
                cleanup()
                reject(new Error('Cancelled.'))
                return
            }
            secret += value.replace(/[\r\n]/g, '')
            if (/[\r\n]/.test(value)) {
                cleanup()
                resolve(secret.trim())
            }
        }
        const cleanup = () => {
            process.stdin.off('data', read)
            process.stdin.setRawMode(false)
            process.stdin.pause()
            process.stdout.write('\n')
        }
        process.stdin.on('data', read)
    })
}
let server
try {
    const apiKey = await readSecret()
    process.env.DEEPSEEK_API_KEY = apiKey
    server = await createServer({
        logLevel: 'silent',
        server: { middlewareMode: true, hmr: false }
    })
    const { discoverModels } = await server.ssrLoadModule(
        '/src/lib/providers/discovery.ts'
    )
    const { streamModel } = await server.ssrLoadModule(
        '/src/lib/streaming/stream.ts'
    )
    const connection = { provider: 'deepseek', apiKey }
    const catalog = await discoverModels(connection)
    if (!catalog.length) throw new Error('The provider returned no models.')
    const selected =
        catalog.find(
            (model) => /chat|flash/.test(model.id) && !/reasoner/.test(model.id)
        ) || catalog[0]
    let characters = 0,
        finalMetrics
    await streamModel(
        {
            ...connection,
            id: 'live-smoke',
            name: selected.name,
            providerId: selected.id,
            enabled: true,
            config: {
                temperature: 0,
                maxTokens: 32,
                topP: 1,
                timeout: { totalMs: 30000 }
            }
        },
        [{ role: 'user', content: 'Reply with exactly OK.' }],
        'smoke',
        (event) => {
            if (event.type === 'update') {
                characters += event.textDelta.length
                if (event.isFinal) finalMetrics = event.metrics
            }
        }
    )
    if (!characters || !finalMetrics || finalMetrics.tokenSource !== 'api')
        throw new Error('Incomplete stream or missing API usage.')
    process.stdout.write(
        JSON.stringify({
            provider: 'DeepSeek',
            discoveredModels: catalog.map((model) => model.id),
            testedModel: selected.id,
            completed: true,
            responseCharacters: characters,
            inputTokens: finalMetrics.inputTokens,
            outputTokens: finalMetrics.outputTokens,
            ttftMs: Math.round(finalMetrics.ttft)
        }) + '\n'
    )
} catch (error) {
    const status =
        error && typeof error === 'object' && 'statusCode' in error
            ? error.statusCode
            : undefined
    process.stderr.write(
        `Provider smoke test failed${typeof status === 'number' ? ` (HTTP ${status})` : ''}. No credentials were written to disk.\n`
    )
    process.exitCode = 1
} finally {
    delete process.env.DEEPSEEK_API_KEY
    await server?.close()
}
