import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from '@/components/ui/popover'
import {
    Trash2,
    AlertCircle,
    FileJson,
    FileSpreadsheet,
    ChevronDown,
    History,
    Database,
    FileBarChart
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { downloadJson, downloadFile } from '@/lib/utils'

interface ExportMenuProps {
    modelStats: Array<{
        name: string
        provider: string
        avgTPS: number
        avgTTFT: number
        avgRating: number
        totalTokens: number
        completedCount: number
    }>
    totalSessions: number
    totalMessages: number
    totalTokensAcrossModels: number
    avgGlobalTPS: number
    topTPSModel?: { name: string }
    topRatingModel?: { name: string }
    fastestModel?: { name: string }
    onClearAll: () => void
}

export function ExportMenu({
    modelStats,
    totalSessions,
    totalMessages,
    totalTokensAcrossModels,
    avgGlobalTPS,
    topTPSModel,
    topRatingModel,
    fastestModel,
    onClearAll
}: ExportMenuProps) {
    const [confirmClearAll, setConfirmClearAll] = useState(false)
    const [importing, setImporting] = useState(false)

    const handleExport = async () => {
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

        await downloadJson(
            data,
            `nillm-benchmarks-${new Date().toISOString().split('T')[0]}.json`
        )
    }

    const handleExportCSV = async () => {
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

        await downloadFile(
            csvContent,
            `nillm-benchmarks-${new Date().toISOString().split('T')[0]}.csv`,
            'text/csv;charset=utf-8;'
        )
    }

    const handleExportGlobal = async () => {
        const json = useAppStore.getState().exportData()
        try {
            const data = JSON.parse(json)
            await downloadJson(
                data,
                `nillm-backup-${new Date().toISOString().slice(0, 10)}.json`
            )
        } catch (e) {
            console.error('Export failed', e)
        }
    }

    const handleImportGlobal = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0]
        if (!file) return
        setImporting(true)
        try {
            const { readJsonFile } = await import('@/lib/utils')
            const data = await readJsonFile(file)
            useAppStore.getState().importData(JSON.stringify(data))
            alert('Data restored successfully.')
        } catch (err) {
            console.error('Import failed', err)
            alert('Failed to import data')
        } finally {
            setImporting(false)
            e.target.value = ''
        }
    }

    return (
        <div className="flex items-center gap-1 md:gap-2">
            <input
                type="file"
                id="import-global"
                className="hidden"
                accept=".json"
                onChange={handleImportGlobal}
            />
            <Button
                variant="outline"
                onClick={() =>
                    document.getElementById('import-global')?.click()
                }
                disabled={importing}
                className="h-9 w-9 px-0 md:w-auto md:px-4 group gap-2 active:scale-95 transition-all"
            >
                <History className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="hidden md:inline text-xs font-medium">
                    {importing ? 'Restoring...' : 'Restore'}
                </span>
            </Button>

            <Button
                variant="outline"
                onClick={handleExportGlobal}
                className="h-9 w-9 px-0 md:w-auto md:px-4 group gap-2 active:scale-95 transition-all"
            >
                <Database className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="hidden md:inline text-xs font-medium">
                    Backup
                </span>
            </Button>

            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className="h-9 w-9 px-0 md:w-auto md:px-4 group gap-2 transition-colors"
                    >
                        <FileBarChart className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="hidden md:inline text-xs font-medium">
                            Reports
                        </span>
                        <ChevronDown className="hidden md:block h-3 w-3 opacity-50 transition-transform group-data-[state=open]:rotate-180" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="end">
                    <div className="flex flex-col gap-1">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left rounded-md hover:bg-primary/5 hover:text-primary transition-colors"
                        >
                            <FileJson className="h-4 w-4" />
                            Export Stats JSON
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left rounded-md hover:bg-primary/5 hover:text-primary transition-colors"
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                            Export Stats CSV
                        </button>
                    </div>
                </PopoverContent>
            </Popover>

            <Popover open={confirmClearAll} onOpenChange={setConfirmClearAll}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className="h-9 w-9 px-0 md:w-auto md:px-4 group gap-2 active:scale-95 transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                    >
                        <Trash2 className="h-4 w-4 text-muted-foreground group-hover:text-destructive transition-colors" />
                        <span className="hidden md:inline text-xs font-medium">
                            Clear
                        </span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 border-destructive/50">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-destructive font-semibold">
                            <AlertCircle className="h-5 w-5" />
                            <span>Danger Zone</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            This will permanently delete ALL session history and
                            benchmark results.
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmClearAll(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                    onClearAll()
                                    setConfirmClearAll(false)
                                }}
                            >
                                Confirm
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
