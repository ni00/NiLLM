import { isTauri } from '@tauri-apps/api/core'
import type { LLMModel } from '@/lib/types'
import { getBaseURL } from './catalog'
import { version } from '../../../package.json'

function isOpenCodeURL(value: string) {
    const url = new URL(value)
    return (
        url.origin === 'https://opencode.ai' && url.pathname.startsWith('/zen/')
    )
}

export function needsNativeTransport(
    model: Pick<LLMModel, 'provider' | 'baseURL'>
) {
    return isTauri() && isOpenCodeURL(getBaseURL(model))
}

/** OpenCode responses lack CORS headers, including successful model lists.
 * Use the desktop HTTP client; never retry a billed request on another transport. */
export const providerFetch: typeof fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input)
    if (!isTauri() || !isOpenCodeURL(url)) return globalThis.fetch(input, init)
    const { fetch: nativeFetch } = await import('@tauri-apps/plugin-http')
    const headers = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined)
    )
    headers.set('User-Agent', `NiLLM/${version}`)
    if (!headers.has('x-opencode-session'))
        headers.set('x-opencode-session', crypto.randomUUID())
    return nativeFetch(input, { ...init, headers, maxRedirections: 0 })
}
