import type { LLMModel } from '@/lib/types'

/** Removes credentials from both dedicated fields and endpoint URLs. */
export function sanitizeModels(models: LLMModel[]): LLMModel[] {
    return models.map((model) => {
        let baseURL: string | undefined
        if (model.baseURL !== undefined) {
            try {
                const url = new URL(model.baseURL)
                if (['http:', 'https:'].includes(url.protocol)) {
                    url.username = ''
                    url.password = ''
                    url.search = ''
                    url.hash = ''
                    baseURL = url.href.replace(/\/$/, '')
                }
            } catch {
                // Invalid endpoints may contain secrets; never export verbatim.
            }
        }
        return { ...model, apiKey: undefined, baseURL }
    })
}
