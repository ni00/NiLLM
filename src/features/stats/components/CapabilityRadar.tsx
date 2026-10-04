import { useI18n } from '@/lib/i18n'
import { useMemo } from 'react'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card'
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts'
import { Star, Zap, MessageSquare } from 'lucide-react'
import type { RadarDataPoint } from '../hooks/useStats'

interface CapabilityRadarProps {
    radarData: RadarDataPoint[]
    mounted: boolean
    fastestModel?: { name: string; avgTTFT: number }
    topRatingModel?: { name: string; avgRating: number }
    totalMessages: number
}

export function CapabilityRadar({
    radarData,
    mounted,
    fastestModel,
    topRatingModel,
    totalMessages
}: CapabilityRadarProps) {
    const t = useI18n()
    const matrix = useMemo(
        () =>
            (['Speed', 'Quality', 'Responsiveness'] as const).map(
                (subject) => ({
                    subject: t(subject),
                    ...Object.fromEntries(
                        radarData.map((model, index) => [
                            `model${index}`,
                            model[subject]
                        ])
                    )
                })
            ),
        [radarData, t]
    )
    const colors = [
        'var(--primary)',
        '#3b82f6',
        '#10b981',
        '#f59e0b',
        '#8b5cf6',
        '#ec4899',
        '#06b6d4',
        '#f97316'
    ]
    if (!mounted) return null

    return (
        <div className="grid gap-6 md:grid-cols-7 w-full max-w-full min-w-0">
            <Card className="md:col-span-4 transition-all hover:shadow-md">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500" />{' '}
                        {t('Capability Matrix')}
                    </CardTitle>
                    <CardDescription>
                        {t(
                            'Speed and responsiveness are relative to the best measured model; quality uses the 1–5 rating scale.'
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent className="h-[320px] w-full">
                    <div className="h-full w-full">
                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                            minWidth={0}
                            minHeight={0}
                        >
                            <RadarChart
                                cx="50%"
                                cy="50%"
                                outerRadius="80%"
                                data={matrix}
                            >
                                <PolarGrid stroke="var(--muted)" />
                                <PolarAngleAxis
                                    dataKey="subject"
                                    fontSize={10}
                                    tick={{
                                        fill: 'var(--muted-foreground)'
                                    }}
                                />
                                <PolarRadiusAxis
                                    angle={30}
                                    domain={[0, 100]}
                                    tick={false}
                                    axisLine={false}
                                />
                                {radarData.map((model, index) => (
                                    <Radar
                                        key={index}
                                        name={model.subject}
                                        dataKey={`model${index}`}
                                        stroke={colors[index]}
                                        fill={colors[index]}
                                        fillOpacity={0.1}
                                        isAnimationActive={false}
                                    />
                                ))}
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--background)',
                                        borderColor: 'var(--border)',
                                        borderRadius: '8px',
                                        fontSize: '12px'
                                    }}
                                />
                                <Legend
                                    wrapperStyle={{
                                        fontSize: '11px',
                                        paddingTop: '20px'
                                    }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <div className="md:col-span-3 flex flex-col gap-4">
                <Card className="flex-1 bg-muted/20 border-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Zap className="h-3 w-3" />{' '}
                            {t('Leading Responsiveness')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold truncate">
                            {fastestModel?.name || 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {fastestModel?.avgTTFT.toFixed(0)}
                            {t('ms initial latency')}
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex-1 bg-muted/20 border-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Star className="h-3 w-3" /> {t('Quality Leader')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold truncate">
                            {topRatingModel?.name || 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {topRatingModel?.avgRating.toFixed(1)}{' '}
                            {t('/ 5.0 avg score')}
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex-1 bg-muted/20 border-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <MessageSquare className="h-3 w-3" />{' '}
                            {t('Message Volume')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {totalMessages}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {t('Total model interactions logged')}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
