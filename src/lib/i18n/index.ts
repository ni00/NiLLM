import { useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import type { AppLanguage } from '@/lib/store/config'
import { messages } from './messages'

export type TranslationParams = Record<string, string | number>

export function translate(
    language: AppLanguage,
    text: string,
    params: TranslationParams = {}
) {
    const entry = Object.hasOwn(messages, text)
        ? messages[text as keyof typeof messages]
        : undefined
    const template = language === 'en' || !entry ? text : entry[language]
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        Object.hasOwn(params, name) ? String(params[name]) : match
    )
}

export function useI18n() {
    const language = useAppStore((state) => state.language)
    return useCallback(
        (text: string, params?: TranslationParams) =>
            translate(language, text, params),
        [language]
    )
}
