import { BUILTIN_TESTS_EN } from './en'
import { BUILTIN_TESTS_ZH } from './zh'
import { BUILTIN_TESTS_JA } from './ja'
import { TestSet } from '@/lib/types'
import { getDecisionTests } from './decisions'

export const getBuiltinTests = (lang: 'en' | 'zh' | 'ja'): TestSet[] => {
    switch (lang) {
        case 'zh':
            return [...BUILTIN_TESTS_ZH, getDecisionTests(lang)]
        case 'ja':
            return [...BUILTIN_TESTS_JA, getDecisionTests(lang)]
        default:
            return [...BUILTIN_TESTS_EN, getDecisionTests(lang)]
    }
}
