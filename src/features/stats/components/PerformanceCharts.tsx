import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts'
import { Activity, Clock } from 'lucide-react'
import type { ChartDataPoint } from '../hooks/useStats'

interface PerformanceChartsProps {
    chartData: ChartDataPoint[]
    mounted: boolean
}

export function PerformanceCharts({
    chartData,
    mounted
}: PerformanceChartsProps) {
    if (!mounted) return null

    return (
        <div className="grid gap-6 md:grid-cols-2 w-full max-w-full min-w-0">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" /> Generation
                        Speed (t/s)
                    </CardTitle>
                    <CardDescription>
                        Throughput comparison per model.
                    </CardDescription>
                </CardHeader>
                <CardContent className="h-[280px] w-full">
                    <div className="h-full w-full">
                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                            minWidth={0}
                            minHeight={0}
                        >
                            <BarChart
                                data={chartData}
                                margin={{
                                    top: 10,
                                    right: 10,
                                    left: -20,
                                    bottom: 0
                                }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="hsl(var(--muted))"
                                />
                                <XAxis
                                    dataKey="name"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    stroke="hsl(var(--muted-foreground))"
                                />
                                <YAxis
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    stroke="hsl(var(--muted-foreground))"
                                />
                                <Tooltip
                                    cursor={{
                                        fill: 'var(--muted)',
                                        fillOpacity: 0.15
                                    }}
                                    contentStyle={{
                                        backgroundColor: 'var(--background)',
                                        borderColor: 'var(--border)',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                    }}
                                />
                                <Bar
                                    dataKey="speed"
                                    radius={[4, 4, 0, 0]}
                                    barSize={32}
                                >
                                    {chartData.map((_, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill="var(--primary)"
                                            fillOpacity={
                                                index === 0
                                                    ? 1
                                                    : Math.max(
                                                          0.2,
                                                          0.8 - index * 0.15
                                                      )
                                            }
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" /> Avg. Latency
                        (ms)
                    </CardTitle>
                    <CardDescription>
                        Time to first token (Lower is better).
                    </CardDescription>
                </CardHeader>
                <CardContent className="h-[280px] w-full">
                    <div className="h-full w-full">
                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                            minWidth={0}
                            minHeight={0}
                        >
                            <BarChart
                                layout="vertical"
                                data={chartData}
                                margin={{
                                    top: 10,
                                    right: 30,
                                    left: 20,
                                    bottom: 0
                                }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    horizontal={false}
                                    stroke="var(--muted)"
                                />
                                <XAxis
                                    type="number"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    stroke="var(--muted-foreground)"
                                />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    width={100}
                                    stroke="var(--muted-foreground)"
                                />
                                <Tooltip
                                    cursor={{
                                        fill: 'var(--muted)',
                                        fillOpacity: 0.15
                                    }}
                                    contentStyle={{
                                        backgroundColor: 'var(--background)',
                                        borderColor: 'var(--border)',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                    }}
                                />
                                <Bar
                                    dataKey="latency"
                                    fill="var(--muted-foreground)"
                                    fillOpacity={0.2}
                                    radius={[0, 4, 4, 0]}
                                    barSize={20}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
