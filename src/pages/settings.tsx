import { Settings, Languages, Palette, Gauge } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { PageLayout } from '@/features/layout/PageLayout'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/lib/i18n'
import { version } from '../../package.json'
import { useAppStore } from '@/lib/store'
import type { AppLanguage, AppTheme, AppDensity } from '@/lib/store/config'

const languages = [
    { value: 'en', label: 'English' },
    { value: 'zh', label: '简体中文' },
    { value: 'ja', label: '日本語' }
]

export function SettingsPage() {
    const t = useI18n()
    const {
        language,
        setLanguage,
        theme,
        setTheme,
        density,
        setDensity,
        benchmarkLanguage,
        setBenchmarkLanguage,
        globalConfig,
        updateGlobalConfig
    } = useAppStore(
        useShallow((state) => ({
            language: state.language,
            setLanguage: state.setLanguage,
            theme: state.theme,
            setTheme: state.setTheme,
            density: state.density,
            setDensity: state.setDensity,
            benchmarkLanguage: state.benchmarkLanguage,
            setBenchmarkLanguage: state.setBenchmarkLanguage,
            globalConfig: state.globalConfig,
            updateGlobalConfig: state.updateGlobalConfig
        }))
    )
    return (
        <PageLayout
            title={t('Settings')}
            icon={Settings}
            footer={
                <p className="text-center text-xs text-muted-foreground">
                    NiLLM · {t('Version')} {version}
                </p>
            }
        >
            <div className="grid w-full min-w-0 grid-cols-1 gap-6 pb-6 lg:grid-cols-2 2xl:grid-cols-3">
                <section className="rounded-xl border p-4 sm:p-6 space-y-6">
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                        <Languages className="h-5 w-5" />
                        {t('Language')}
                    </h2>
                    <div className="grid min-w-0 gap-2 sm:grid-cols-2 sm:items-center">
                        <Label>{t('Interface language')}</Label>
                        <SelectDropdown
                            ariaLabel={t('Interface language')}
                            value={language}
                            options={languages}
                            onChange={(value) =>
                                setLanguage(value as AppLanguage)
                            }
                        />
                    </div>
                    <div className="grid min-w-0 gap-2 sm:grid-cols-2 sm:items-center">
                        <Label>{t('Built-in test language')}</Label>
                        <SelectDropdown
                            ariaLabel={t('Built-in test language')}
                            value={benchmarkLanguage ?? 'auto'}
                            options={[
                                {
                                    value: 'auto',
                                    label: t('Follow interface language')
                                },
                                ...languages
                            ]}
                            onChange={(value) =>
                                setBenchmarkLanguage(
                                    value === 'auto'
                                        ? null
                                        : (value as AppLanguage)
                                )
                            }
                        />
                    </div>
                </section>
                <section className="rounded-xl border p-4 sm:p-6 space-y-6">
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                        <Palette className="h-5 w-5" />
                        {t('Appearance')}
                    </h2>
                    <div className="grid min-w-0 gap-2 sm:grid-cols-2 sm:items-center">
                        <Label>{t('Theme')}</Label>
                        <SelectDropdown
                            ariaLabel={t('Theme')}
                            value={theme}
                            options={['system', 'light', 'dark'].map(
                                (value, index) => ({
                                    value,
                                    label: t(['System', 'Light', 'Dark'][index])
                                })
                            )}
                            onChange={(value) => setTheme(value as AppTheme)}
                        />
                    </div>
                    <div className="grid min-w-0 gap-2 sm:grid-cols-2 sm:items-center">
                        <Label>{t('Density')}</Label>
                        <SelectDropdown
                            ariaLabel={t('Density')}
                            value={density}
                            options={[
                                {
                                    value: 'comfortable',
                                    label: t('Comfortable')
                                },
                                { value: 'compact', label: t('Compact') }
                            ]}
                            onChange={(value) =>
                                setDensity(value as AppDensity)
                            }
                        />
                    </div>
                </section>
                <section className="rounded-xl border p-4 sm:p-6 space-y-6">
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                        <Gauge className="h-5 w-5" />
                        {t('Generation')}
                    </h2>
                    <div className="grid min-w-0 gap-2 sm:grid-cols-2 sm:items-center">
                        <Label>{t('Concurrent models')}</Label>
                        <SelectDropdown
                            ariaLabel={t('Concurrent models')}
                            value={String(globalConfig.maxConcurrent ?? 4)}
                            options={Array.from({ length: 16 }, (_, index) => ({
                                value: String(index + 1),
                                label: String(index + 1)
                            }))}
                            onChange={(value) =>
                                updateGlobalConfig({
                                    maxConcurrent: Number(value)
                                })
                            }
                        />
                    </div>
                </section>
            </div>
        </PageLayout>
    )
}

export const Component = SettingsPage
