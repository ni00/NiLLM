import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ConfigSlider } from '../ConfigSlider'
import { SectionHeader, ConfigSectionProps } from './SectionHeader'
import { FieldOverride } from './FieldOverride'

const sdkTimeouts = [
    {
        key: 'totalMs',
        label: 'Total',
        initial: 120000,
        min: 10000,
        max: 300000,
        step: 10000
    },
    {
        key: 'stepMs',
        label: 'Step',
        initial: 60000,
        min: 5000,
        max: 180000,
        step: 5000
    },
    {
        key: 'chunkMs',
        label: 'Chunk',
        initial: 10000,
        min: 1000,
        max: 60000,
        step: 1000
    }
] as const

const workerTimeouts = [
    {
        key: 'connectTimeout',
        label: 'First-event wait',
        initial: 15000,
        min: 1000,
        max: 60000,
        step: 1000
    },
    {
        key: 'readTimeout',
        label: 'No-chunk wait',
        initial: 30000,
        min: 5000,
        max: 120000,
        step: 5000
    }
] as const

export function TimeoutsConfig({
    config,
    onChange,
    sources,
    onResetField,
    idPrefix
}: ConfigSectionProps) {
    const t = useI18n()
    return (
        <div className="space-y-6 pt-4 border-t border-border/40">
            <SectionHeader title={t('Timeouts (ms)')} />
            <div className="space-y-4">
                <h3 className="text-sm font-medium">{t('AI SDK Timeouts')}</h3>
                <p className="text-sm text-muted-foreground">
                    {t(
                        'SDK total, step and chunk limits are separate from worker waiting guards.'
                    )}
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {sdkTimeouts.map(
                        ({ key, label, initial, min, max, step }) => {
                            const value = config.timeout?.[key]
                            const path = `timeout.${key}`
                            return (
                                <div key={key} className="min-w-0 space-y-3">
                                    <div className="flex flex-wrap justify-between items-center gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <Label
                                                htmlFor={`${idPrefix}-${path}`}
                                            >
                                                {t(label)}
                                            </Label>
                                            <FieldOverride
                                                path={path}
                                                sources={sources}
                                                onResetField={onResetField}
                                            />
                                        </div>
                                        <span className="text-sm tabular-nums">
                                            {value === undefined
                                                ? t('Not configured')
                                                : value}
                                        </span>
                                    </div>
                                    {value === undefined ? (
                                        <Button
                                            variant="outline"
                                            className="min-h-11"
                                            onClick={() =>
                                                onChange({
                                                    timeout: { [key]: initial }
                                                })
                                            }
                                        >
                                            {t('Configure')}
                                        </Button>
                                    ) : (
                                        <>
                                            <ConfigSlider
                                                id={`${idPrefix}-${path}`}
                                                value={value}
                                                min={min}
                                                max={max}
                                                step={step}
                                                onChange={(next) =>
                                                    onChange({
                                                        timeout: { [key]: next }
                                                    })
                                                }
                                            />
                                            {onResetField && (
                                                <Button
                                                    variant="ghost"
                                                    className="min-h-11"
                                                    onClick={() =>
                                                        onResetField(path)
                                                    }
                                                >
                                                    {t('Clear override')}
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>
                            )
                        }
                    )}
                </div>
            </div>
            <div className="space-y-4">
                <h3 className="text-sm font-medium">
                    {t('Worker waiting guards')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {workerTimeouts.map(
                        ({ key, label, initial, min, max, step }) => (
                            <div key={key} className="min-w-0 space-y-3">
                                <div className="flex flex-wrap justify-between items-center gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <Label htmlFor={`${idPrefix}-${key}`}>
                                            {t(label)}
                                        </Label>
                                        <FieldOverride
                                            path={key}
                                            sources={sources}
                                            onResetField={onResetField}
                                        />
                                    </div>
                                    <span className="text-sm tabular-nums">
                                        {config[key] ?? initial}
                                    </span>
                                </div>
                                <ConfigSlider
                                    id={`${idPrefix}-${key}`}
                                    value={config[key] ?? initial}
                                    min={min}
                                    max={max}
                                    step={step}
                                    onChange={(next) =>
                                        onChange({ [key]: next })
                                    }
                                />
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    )
}
