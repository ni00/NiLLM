import globals from 'globals'
import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'

export default [
    {
        ignores: [
            'src/components/ui/**',
            'src-tauri/**',
            'dist/**',
            'node_modules/**',
            'playwright-report/**',
            'test-results/**'
        ]
    },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    { languageOptions: { globals: { ...globals.browser, ...globals.worker } } },
    {
        files: ['*.{js,ts}', 'scripts/**', 'e2e/**'],
        languageOptions: { globals: globals.node }
    },
    eslintConfigPrettier
]
