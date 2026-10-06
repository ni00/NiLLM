import { memo } from 'react'
import { useI18n } from '@/lib/i18n'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card'
import { Star, Zap, MessageSquare } from 'lucide-react'
import { formatStatNumber, type RadarDataPoint } from '../display'

export const CapabilityRadar = memo(function CapabilityRadar({
    radarData,
    fastestModel,
    topRatingModel,
    totalMessages
}: {
    radarData: RadarDataPoint[]
    fastestModel?: { name: string; avgTTFT: number }
    topRatingModel?: { name: string; avgRating: number }
    totalMessages: number
}) {
    const t = useI18n()
    const dimensions = ['Speed', 'Quality', 'Responsiveness'] as const
    const leaders = [
        {
            label: 'Leading Responsiveness',
            icon: Zap,
            name: fastestModel?.name ?? '—',
            value: fastestModel
                ? `${formatStatNumber(fastestModel.avgTTFT)} ${t('ms initial latency')}`
                : '—'
        },
        {
            label: 'Quality Leader',
            icon: Star,
            name: topRatingModel?.name ?? '—',
            value: topRatingModel
                ? `${formatStatNumber(topRatingModel.avgRating)} ${t('/ 5.0 avg score')}`
                : '—'
        },
        {
            label: 'Message Volume',
            icon: MessageSquare,
            name: formatStatNumber(totalMessages),
            value: t('Total model interactions logged')
        }
    ]
    return (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] min-w-0">
            <Card className="min-w-0" aria-label={t('Capability Matrix')}>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500" />
                        {t('Capability Matrix')}
                    </CardTitle>
                    <CardDescription>
                        {t(
                            'Speed and responsiveness are relative to the best measured model; quality uses the 1–5 rating scale.'
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-5" data-stats-capabilities>
                        {radarData.map((model) => (
                            <div
                                key={model.id}
                                className="min-w-0 border-b pb-5 last:border-0 last:pb-0"
                            >
                                <div className="min-w-0 mb-3">
                                    <p
                                        className="text-sm font-medium truncate"
                                        title={model.subject}
                                    >
                                        {model.subject}
                                    </p>
                                    <p
                                        className="text-xs text-muted-foreground truncate"
                                        title={model.provider}
                                    >
                                        {model.provider}
                                    </p>
                                </div>
                                <div className="grid grid-cols-3 gap-3 sm:gap-6">
                                    {dimensions.map((dimension) => (
                                        <div
                                            key={dimension}
                                            className="min-w-0"
                                        >
                                            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 mb-2 text-xs">
                                                <span className="text-muted-foreground">
                                                    {t(dimension)}
                                                </span>
                                                <span
                                                    className="font-medium tabular-nums"
                                                    data-stats-value
                                                >
                                                    {model[dimension] ===
                                                    undefined
                                                        ? '—'
                                                        : dimension ===
                                                            'Quality'
                                                          ? `${formatStatNumber(model.Quality! / 20)} / 5`
                                                          : `${formatStatNumber(model[dimension])}%`}
                                                </span>
                                            </div>
                                            <div
                                                className="h-1.5 rounded-full bg-muted overflow-hidden"
                                                aria-hidden
                                            >
                                                <div
                                                    className="h-full rounded-full bg-primary/70"
                                                    style={{
                                                        width: `${model[dimension] ?? 0}%`
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {!radarData.length && (
                            <p className="text-sm text-muted-foreground py-8 text-center">
                                {t('Insufficient Data')}
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1 content-start">
                {leaders.map(({ label, icon: Icon, name, value }) => (
                    <Card
                        key={label}
                        className="min-w-0 bg-muted/20 shadow-none"
                    >
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                {t(label)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-lg font-semibold break-words leading-7">
                                {name}
                            </p>
                            <p className="mt-2 text-xs text-muted-foreground">
                                {value}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
})
