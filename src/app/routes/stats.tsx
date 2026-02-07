import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    BarChart3,
    Clock,
    Zap,
    Star,
    MessageSquare,
    Cpu,
    Trophy,
    Activity,
    Hash,
    Trash2,
    AlertCircle,
    Eraser,
    Download,
    FileJson,
    FileSpreadsheet,
    ChevronDown
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from '@/components/ui/popover'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    Legend
} from 'recharts'

export function StatsPage() {
    const { sessions, models, clearAllResults, clearModelResults } =
        useAppStore()
    const [confirmClearAll, setConfirmClearAll] = useState(false)
    const [confirmClearModel, setConfirmClearModel] = useState<string | null>(
        null
    )
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 100)
        return () => clearTimeout(timer)
    }, [])

    // 1. Calculate detailed stats per model
    const modelStats = models
        .map((model) => {
            let totalTPS = 0
            let tpsCount = 0
            let totalTTFT = 0
            let ttftCount = 0
            let totalCount = 0
            let totalRating = 0
            let ratingCount = 0
            let totalTokens = 0

            sessions.forEach((session) => {
                const results = session.results[model.id] || []
                results.forEach((r) => {
                    totalCount++
                    if (r.metrics?.tps > 0) {
                        totalTPS += r.metrics.tps
                        tpsCount++
                    }
                    if (r.metrics?.ttft > 0) {
                        totalTTFT += r.metrics.ttft
                        ttftCount++
                    }
                    if (r.metrics?.tokenCount > 0) {
                        totalTokens += r.metrics.tokenCount
                    }
                    if (r.rating) {
                        totalRating += r.rating
                        ratingCount++
                    }
                })
            })

            const avgTPS = tpsCount > 0 ? totalTPS / tpsCount : 0
            const avgTTFT = ttftCount > 0 ? totalTTFT / ttftCount : 0
            const avgRating = ratingCount > 0 ? totalRating / ratingCount : 0

            return {
                id: model.id,
                name: model.name,
                provider: model.providerName || model.provider,
                avgTPS,
                avgTTFT,
                avgRating,
                totalTokens,
                totalCount,
                completedCount: tpsCount
            }
        })
        .filter((s) => s.totalCount > 0)

    // 2. Aggregate overall stats
    const totalSessions = sessions.length
    const totalMessages = sessions.reduce(
        (acc, s) => acc + s.messages.length,
        0
    )
    const totalTokensAcrossModels = modelStats.reduce(
        (acc, s) => acc + s.totalTokens,
        0
    )
    const avgGlobalTPS =
        modelStats.length > 0
            ? modelStats.reduce((acc, s) => acc + s.avgTPS, 0) /
              modelStats.length
            : 0

    // 3. Identify "Best" models
    const topTPSModel = [...modelStats].sort((a, b) => b.avgTPS - a.avgTPS)[0]
    const topRatingModel = [...modelStats].sort(
        (a, b) => b.avgRating - a.avgRating
    )[0]
    const fastestModel = [...modelStats].sort(
        (a, b) => a.avgTTFT - b.avgTTFT
    )[0]

    // 4. Prepare chart data
    const chartData = modelStats.map((s) => ({
        name: s.name,
        speed: parseFloat(s.avgTPS.toFixed(2)),
        latency: parseFloat(s.avgTTFT.toFixed(0)),
        rating: parseFloat(s.avgRating.toFixed(1)),
        tokens: s.totalTokens
    }))

    // Radar data (normalized for comparison)
    const maxTPS = Math.max(...modelStats.map((s) => s.avgTPS), 1)
    const maxRating = 5
    const minTTFT = Math.min(...modelStats.map((s) => s.avgTTFT), 100)

    const radarData = modelStats.map((s) => ({
        subject: s.name,
        Speed: (s.avgTPS / maxTPS) * 100,
        Quality: (s.avgRating / maxRating) * 100,
        Responsiveness: (minTTFT / Math.max(s.avgTTFT, 1)) * 100
    }))

    const handleExport = () => {
        const timestamp = new Date().toISOString()
        const data = {
            metadata: {
                title: 'NiLLM Arena Performance Report',
                generatedAt: timestamp,
                version: '1.0.0'
            },
            summary: {
                totalSessions,
                totalMessages,
                totalTokens: totalTokensAcrossModels,
                avgSystemTPS: parseFloat(avgGlobalTPS.toFixed(2)),
                topPerformers: {
                    tps: topTPSModel?.name,
                    rating: topRatingModel?.name,
                    latency: fastestModel?.name
                }
            },
            modelComparison: modelStats.map((s) => ({
                name: s.name,
                provider: s.provider,
                metrics: {
                    avgTPS: parseFloat(s.avgTPS.toFixed(2)),
                    avgTTFT: parseFloat(s.avgTTFT.toFixed(1)),
                    avgRating: parseFloat(s.avgRating.toFixed(1)),
                    totalTokens: s.totalTokens,
                    sampleCount: s.completedCount
                }
            }))
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `nillm-benchmarks-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const handleExportCSV = () => {
        const headers = [
            'Model',
            'Provider',
            'Avg Speed (t/s)',
            'Avg Latency (ms)',
            'Avg Quality',
            'Total Tokens',
            'Sample Size'
        ]
        const rows = modelStats.map((s) => [
            `"${s.name.replace(/"/g, '""')}"`,
            `"${s.provider.replace(/"/g, '""')}"`,
            s.avgTPS.toFixed(2),
            s.avgTTFT.toFixed(1),
            s.avgRating.toFixed(1),
            s.totalTokens,
            s.completedCount
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map((r) => r.join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `nillm-benchmarks-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    return (
        <div className="flex flex-col h-full gap-6 p-6 overflow-hidden bg-background">
            <PageHeader
                title="Statistics"
                description="Comprehensive performance analysis and usage metrics for all active models."
                icon={BarChart3}
            >
                {modelStats.length > 0 && (
                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-primary hover:bg-primary/5 transition-colors h-10 px-4"
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Export Statistics
                                    <ChevronDown className="h-3 w-3 ml-2 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2" align="end">
                                <div className="flex flex-col gap-1">
                                    <button
                                        onClick={handleExport}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left rounded-md hover:bg-primary/5 hover:text-primary transition-colors"
                                    >
                                        <FileJson className="h-4 w-4" />
                                        Export as JSON
                                    </button>
                                    <button
                                        onClick={handleExportCSV}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left rounded-md hover:bg-primary/5 hover:text-primary transition-colors"
                                    >
                                        <FileSpreadsheet className="h-4 w-4" />
                                        Export as CSV
                                    </button>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors border-dashed h-10 px-4"
                            onClick={() => setConfirmClearAll(true)}
                        >
                            <Eraser className="h-4 w-4 mr-2" />
                            Clear All Data
                        </Button>
                    </div>
                )}
            </PageHeader>

            <ScrollArea className="flex-1 min-h-0 -mr-4 pr-4">
                <div className="flex flex-col gap-8 pb-8">
                    {/* Top Aggregate Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="relative overflow-hidden border-none bg-primary/5 shadow-none">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Total Sessions
                                </CardTitle>
                                <MessageSquare className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    {totalSessions}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Active conversation threads
                                </p>
                            </CardContent>
                            <div className="absolute -right-2 -bottom-2 opacity-10">
                                <MessageSquare className="h-16 w-16" />
                            </div>
                        </Card>
                        <Card className="relative overflow-hidden border-none bg-blue-500/5 shadow-none">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Generated Tokens
                                </CardTitle>
                                <Hash className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    {totalTokensAcrossModels.toLocaleString()}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Total model output volume
                                </p>
                            </CardContent>
                            <div className="absolute -right-2 -bottom-2 opacity-10 text-blue-500">
                                <Hash className="h-16 w-16" />
                            </div>
                        </Card>
                        <Card className="relative overflow-hidden border-none bg-yellow-500/5 shadow-none">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Avg. System Speed
                                </CardTitle>
                                <Zap className="h-4 w-4 text-yellow-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    {avgGlobalTPS.toFixed(2)}{' '}
                                    <span className="text-sm font-normal text-muted-foreground">
                                        t/s
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    System-wide throughput
                                </p>
                            </CardContent>
                            <div className="absolute -right-2 -bottom-2 opacity-10 text-yellow-500">
                                <Zap className="h-16 w-16" />
                            </div>
                        </Card>
                        <Card className="relative overflow-hidden border-none bg-amber-500/5 shadow-none">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Top Performer
                                </CardTitle>
                                <Trophy className="h-4 w-4 text-amber-500" />
                            </CardHeader>
                            <CardContent>
                                <div
                                    className="text-2xl font-extrabold truncate"
                                    title={topTPSModel?.name || 'N/A'}
                                >
                                    {topTPSModel?.name || 'N/A'}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Highest throughput (TPS)
                                </p>
                            </CardContent>
                            <div className="absolute -right-2 -bottom-2 opacity-10 text-amber-500">
                                <Trophy className="h-16 w-16" />
                            </div>
                        </Card>
                    </div>

                    {/* Performance Comparison Charts */}
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Speed Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-primary" />{' '}
                                    Generation Speed (t/s)
                                </CardTitle>
                                <CardDescription>
                                    Throughput comparison per model.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-[280px] w-full">
                                {mounted && (
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
                                                        backgroundColor:
                                                            'var(--background)',
                                                        borderColor:
                                                            'var(--border)',
                                                        borderRadius: '8px',
                                                        fontSize: '12px',
                                                        boxShadow:
                                                            '0 4px 12px rgba(0,0,0,0.1)'
                                                    }}
                                                />
                                                <Bar
                                                    dataKey="speed"
                                                    radius={[4, 4, 0, 0]}
                                                    barSize={32}
                                                >
                                                    {chartData.map(
                                                        (_, index) => (
                                                            <Cell
                                                                key={`cell-${index}`}
                                                                fill="var(--primary)"
                                                                fillOpacity={
                                                                    index === 0
                                                                        ? 1
                                                                        : Math.max(
                                                                              0.2,
                                                                              0.8 -
                                                                                  index *
                                                                                      0.15
                                                                          )
                                                                }
                                                            />
                                                        )
                                                    )}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Latency Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-blue-500" />{' '}
                                    Avg. Latency (ms)
                                </CardTitle>
                                <CardDescription>
                                    Time to first token (Lower is better).
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-[280px] w-full">
                                {mounted && (
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
                                                        backgroundColor:
                                                            'var(--background)',
                                                        borderColor:
                                                            'var(--border)',
                                                        borderRadius: '8px',
                                                        fontSize: '12px',
                                                        boxShadow:
                                                            '0 4px 12px rgba(0,0,0,0.1)'
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
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Capability Radar & Quick Insights */}
                    <div className="grid gap-6 md:grid-cols-7">
                        <Card className="md:col-span-4 transition-all hover:shadow-md">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Star className="h-4 w-4 text-amber-500" />{' '}
                                    Capability Matrix
                                </CardTitle>
                                <CardDescription>
                                    Comparative analysis across multiple
                                    performance vectors.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-[320px] w-full">
                                {mounted && (
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
                                                        backgroundColor:
                                                            'var(--background)',
                                                        borderColor:
                                                            'var(--border)',
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
                                )}
                            </CardContent>
                        </Card>

                        <div className="md:col-span-3 flex flex-col gap-4">
                            <Card className="flex-1 bg-muted/20 border-none">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <Zap className="h-3 w-3" /> Leading
                                        Responsiveness
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xl font-bold truncate">
                                        {fastestModel?.name || 'N/A'}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {fastestModel?.avgTTFT.toFixed(0)}ms
                                        initial latency
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="flex-1 bg-muted/20 border-none">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <Star className="h-3 w-3" /> Quality
                                        Leader
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xl font-bold truncate">
                                        {topRatingModel?.name || 'N/A'}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {topRatingModel?.avgRating.toFixed(1)} /
                                        5.0 avg score
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="flex-1 bg-muted/20 border-none">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <MessageSquare className="h-3 w-3" />{' '}
                                        Message Volume
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

                    {/* Model Breakdown List */}
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Cpu className="h-5 w-5 text-primary" /> Model
                                Breakdown
                            </h2>
                            <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                {modelStats.length} Models tracked
                            </span>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {modelStats.map((stat) => (
                                <Card
                                    key={stat.id}
                                    className="group hover:border-primary/50 transition-all hover:shadow-md"
                                >
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center justify-between gap-2">
                                            <span
                                                className="truncate group-hover:text-primary transition-colors"
                                                title={stat.name}
                                            >
                                                {stat.name}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setConfirmClearModel(
                                                            stat.id
                                                        )
                                                    }}
                                                    className="p-1.5 opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                                    title="Clear this model's data"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 border border-muted-foreground/20 px-1.5 py-0.5 rounded">
                                                    {stat.provider}
                                                </span>
                                            </div>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between text-sm py-1 border-b border-muted/50">
                                                <div className="flex items-center text-muted-foreground">
                                                    <Zap className="mr-2 h-3.5 w-3.5 text-yellow-500" />{' '}
                                                    Speed
                                                </div>
                                                <div className="font-mono font-bold">
                                                    {stat.avgTPS.toFixed(1)}{' '}
                                                    <span className="text-[10px] font-normal text-muted-foreground">
                                                        t/s
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between text-sm py-1 border-b border-muted/50">
                                                <div className="flex items-center text-muted-foreground">
                                                    <Clock className="mr-2 h-3.5 w-3.5 text-blue-400" />{' '}
                                                    Latency
                                                </div>
                                                <div className="font-mono font-bold">
                                                    {stat.avgTTFT.toFixed(0)}{' '}
                                                    <span className="text-[10px] font-normal text-muted-foreground">
                                                        ms
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between text-sm py-1 border-b border-muted/50">
                                                <div className="flex items-center text-muted-foreground">
                                                    <Star className="mr-2 h-3.5 w-3.5 text-amber-500" />{' '}
                                                    Quality
                                                </div>
                                                <div className="font-bold">
                                                    {stat.avgRating > 0
                                                        ? stat.avgRating.toFixed(
                                                              1
                                                          )
                                                        : '—'}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between text-sm py-1">
                                                <div className="flex items-center text-muted-foreground">
                                                    <BarChart3 className="mr-2 h-3.5 w-3.5 text-green-400" />{' '}
                                                    Samples
                                                </div>
                                                <div className="text-xs font-semibold">
                                                    {stat.completedCount} /{' '}
                                                    {stat.totalCount} msg
                                                </div>
                                            </div>

                                            <div className="h-1 w-full bg-muted rounded-full overflow-hidden mt-1">
                                                <div
                                                    className="h-full bg-primary transition-all duration-500"
                                                    style={{
                                                        width: `${(stat.avgTPS / maxTPS) * 100}%`
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {modelStats.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 bg-muted/10 border-2 border-dashed rounded-xl">
                            <Activity className="h-12 w-12 text-muted-foreground/30 mb-4" />
                            <h3 className="text-lg font-semibold text-muted-foreground">
                                Insufficient Data
                            </h3>
                            <p className="text-sm text-muted-foreground/60 max-w-xs text-center mt-2">
                                Start some conversations in the Arena to
                                populate these performance benchmarks.
                            </p>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Confirmation Dialogs */}
            {(confirmClearAll || confirmClearModel) && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => {
                        setConfirmClearAll(false)
                        setConfirmClearModel(null)
                    }}
                >
                    <div
                        className="bg-background border rounded-lg shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4 text-destructive">
                                <AlertCircle className="h-6 w-6" />
                                <h3 className="text-lg font-bold">
                                    Clear Statistics?
                                </h3>
                            </div>
                            <p className="text-sm text-muted-foreground mb-6">
                                {confirmClearAll
                                    ? 'This will permanently delete ALL performance data across all sessions. This action cannot be undone.'
                                    : `This will permanently delete all performance data for "${modelStats.find((s) => s.id === confirmClearModel)?.name}".`}
                            </p>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                        setConfirmClearAll(false)
                                        setConfirmClearModel(null)
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="flex-1"
                                    onClick={() => {
                                        if (confirmClearAll) {
                                            clearAllResults()
                                            setConfirmClearAll(false)
                                        } else if (confirmClearModel) {
                                            clearModelResults(confirmClearModel)
                                            setConfirmClearModel(null)
                                        }
                                    }}
                                >
                                    Clear Data
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export const Component = StatsPage
