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
    if (!mounted) return null

    return (
        <div className="grid gap-6 md:grid-cols-7 w-full max-w-full min-w-0">
            <Card className="md:col-span-4 transition-all hover:shadow-md">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500" /> Capability
                        Matrix
                    </CardTitle>
                    <CardDescription>
                        Comparative analysis across multiple performance
                        vectors.
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
                                data={radarData}
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
                                <Radar
                                    name="Speed"
                                    dataKey="Speed"
                                    stroke="var(--primary)"
                                    fill="var(--primary)"
                                    fillOpacity={0.3}
                                />
                                <Radar
                                    name="Quality"
                                    dataKey="Quality"
                                    stroke="var(--primary)"
                                    strokeOpacity={0.6}
                                    fill="var(--primary)"
                                    fillOpacity={0.2}
                                />
                                <Radar
                                    name="Responsiveness"
                                    dataKey="Responsiveness"
                                    stroke="var(--muted-foreground)"
                                    fill="var(--muted-foreground)"
                                    fillOpacity={0.1}
                                />
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
                            <Zap className="h-3 w-3" /> Leading Responsiveness
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold truncate">
                            {fastestModel?.name || 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {fastestModel?.avgTTFT.toFixed(0)}ms initial latency
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex-1 bg-muted/20 border-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Star className="h-3 w-3" /> Quality Leader
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold truncate">
                            {topRatingModel?.name || 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {topRatingModel?.avgRating.toFixed(1)} / 5.0 avg
                            score
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex-1 bg-muted/20 border-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <MessageSquare className="h-3 w-3" /> Message Volume
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {totalMessages}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            Total model interactions logged
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
