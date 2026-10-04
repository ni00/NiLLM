import { useI18n } from '@/lib/i18n'
import type { ModelStat } from '../domain/statistics'
import { exportStatsCSV } from '../domain/export'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from '@/components/ui/popover'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent
} from '@/components/ui/alert-dialog'
import {
    Trash2,
    AlertCircle,
    FileJson,
    FileSpreadsheet,
    ChevronDown,
    History,
    Database,
    FileBarChart,
    X
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { downloadJson, downloadFile } from '@/lib/utils'

interface ExportMenuProps {
    modelStats: ModelStat[]
    filters: { range: string; providerKey: string; mode: string }
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
    filters,
    totalSessions,
    totalMessages,
    totalTokensAcrossModels,
    avgGlobalTPS,
    topTPSModel,
    topRatingModel,
    fastestModel,
    onClearAll
}: ExportMenuProps) {
    const t = useI18n()
    const [confirmClearAll, setConfirmClearAll] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importStatus, setImportStatus] = useState('')
    const [backupOpen, setBackupOpen] = useState(false)
    const [includeSecrets, setIncludeSecrets] = useState(false)
    const isProcessing = useAppStore((state) => state.isProcessing)
    const isJudging = useAppStore((state) => state.isJudging)
    const persistenceState = useAppStore((state) => state.persistenceState)
    const busy = isProcessing || isJudging
    const storageBroken = persistenceState === 'error'

    const handleExport = async () => {
        const timestamp = new Date().toISOString()
        const data = {
            metadata: {
                title: 'NiLLM Arena Performance Report',
                generatedAt: timestamp,
                schemaVersion: 2,
                units: {
                    ttft: 'milliseconds',
                    duration: 'milliseconds',
                    tps: 'tokens/second',
                    cost: 'USD'
                },
                filters
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
            modelComparison: modelStats
        }

        await downloadJson(
            data,
            `nillm-benchmarks-${new Date().toISOString().split('T')[0]}.json`
        )
    }

    const handleExportCSV = async () => {
        const csvContent = exportStatsCSV(modelStats)

        await downloadFile(
            csvContent,
            `nillm-benchmarks-${new Date().toISOString().split('T')[0]}.csv`,
            'text/csv;charset=utf-8;'
        )
    }

    const handleExportGlobal = async () => {
        const json = useAppStore.getState().exportData({ includeSecrets })
        try {
            const data = JSON.parse(json)
            await downloadJson(
                data,
                `nillm-backup-${new Date().toISOString().slice(0, 10)}.json`
            )
            setBackupOpen(false)
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
        setImportStatus('')
        try {
            const { readJsonFile } = await import('@/lib/utils')
            const data = await readJsonFile(file)
            await useAppStore.getState().importData(JSON.stringify(data))
            setImportStatus(t('Data restored successfully.'))
        } catch (err) {
            console.error('Import failed', err)
            setImportStatus(
                err instanceof Error ? err.message : t('Failed to import data')
            )
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
            <div className="relative">
                <Button
                    variant="outline"
                    onClick={() =>
                        document.getElementById('import-global')?.click()
                    }
                    disabled={importing || busy || storageBroken}
                    title={
                        storageBroken
                            ? t(
                                  'Restore is unavailable while local storage is failing.'
                              )
                            : busy
                              ? t(
                                    'Stop running requests before restoring data.'
                                )
                              : t('Restore a backup file')
                    }
                    className="h-9 w-9 px-0 md:w-auto md:px-4 group gap-2 active:scale-95 transition-all"
                >
                    <History className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="hidden md:inline text-xs font-medium">
                        {importing ? t('Restoring...') : t('Restore')}
                    </span>
                </Button>
                {importStatus && (
                    <span
                        role="status"
                        className="absolute top-full right-0 mt-1 text-[11px] whitespace-nowrap text-muted-foreground"
                    >
                        {importStatus}
                    </span>
                )}
            </div>

            <Button
                variant="outline"
                onClick={() => setBackupOpen(true)}
                className="h-9 w-9 px-0 md:w-auto md:px-4 group gap-2 active:scale-95 transition-all"
            >
                <Database className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="hidden md:inline text-xs font-medium">
                    {t('Backup')}
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
                            {t('Reports')}
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
                            {t('Export Stats JSON')}
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left rounded-md hover:bg-primary/5 hover:text-primary transition-colors"
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                            {t('Export Stats CSV')}
                        </button>
                    </div>
                </PopoverContent>
            </Popover>

            <Dialog open={backupOpen} onOpenChange={setBackupOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('Download Full Backup')}</DialogTitle>
                        <DialogDescription>
                            {t(
                                'A full backup contains every workspace domain: models, sessions, test sets, prompts and experiments.'
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <label className="flex items-start gap-3 rounded-lg border p-3 text-sm cursor-pointer hover:bg-muted/40">
                        <input
                            type="checkbox"
                            checked={includeSecrets}
                            onChange={(event) =>
                                setIncludeSecrets(event.target.checked)
                            }
                            className="mt-0.5 accent-primary"
                        />
                        <span>
                            <span className="font-medium">
                                {t('Include API keys and endpoints')}
                            </span>
                            <span className="block text-xs text-muted-foreground mt-0.5">
                                {t(
                                    'Secrets stay on this machine unless you explicitly include them. Share carefully.'
                                )}
                            </span>
                        </span>
                    </label>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setBackupOpen(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button onClick={handleExportGlobal}>
                            {t('Download Backup')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={confirmClearAll}
                onOpenChange={setConfirmClearAll}
            >
                <Button
                    variant="outline"
                    onClick={() => setConfirmClearAll(true)}
                    disabled={busy || storageBroken}
                    title={
                        storageBroken
                            ? t(
                                  'Clearing is unavailable while local storage is failing.'
                              )
                            : busy
                              ? t('Stop running requests first.')
                              : undefined
                    }
                    className="h-9 w-9 px-0 md:w-auto md:px-4 group gap-2 active:scale-95 transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                >
                    <Trash2 className="h-4 w-4 text-muted-foreground group-hover:text-destructive transition-colors" />
                    <span className="hidden md:inline text-xs font-medium">
                        {t('Clear')}
                    </span>
                </Button>
                <AlertDialogContent className="p-0 overflow-hidden max-w-md border shadow-2xl rounded-2xl">
                    {/* Header - Segmented like Arena Settings */}
                    <div className="px-5 py-4 border-b flex items-center justify-between bg-muted/30">
                        <h3 className="font-semibold text-base flex items-center gap-2 text-destructive">
                            <AlertCircle className="w-4 h-4" />{' '}
                            {t('Danger Zone')}
                        </h3>
                        <AlertDialogCancel className="h-8 w-8 p-0 border-none bg-transparent hover:bg-muted/50 rounded-full mt-0 transition-colors">
                            <X className="h-4 w-4 text-muted-foreground" />
                        </AlertDialogCancel>
                    </div>

                    {/* Content - Clean and focused */}
                    <div className="p-8 space-y-4">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-foreground/90 leading-relaxed">
                                {t(
                                    'Permanently delete all session history, chat records, and benchmark performance results.'
                                )}
                            </p>
                            <p className="text-xs text-muted-foreground/70 leading-relaxed">
                                {t(
                                    'Once confirmed, this data cannot be recovered. Please ensure you have backed up any critical reports.'
                                )}
                            </p>
                            <p className="text-xs text-muted-foreground/70 leading-relaxed">
                                {t(
                                    'Arena data only: experiments and prompts are kept. Experiments are managed on their own page.'
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Footer - Solid background like Arena Settings */}
                    <div className="px-6 py-4 border-t bg-muted/20 flex gap-3">
                        <AlertDialogCancel className="flex-1 h-10 font-semibold border-muted-foreground/10 hover:bg-muted-foreground/5 mt-0">
                            {t('Cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                onClearAll()
                                setConfirmClearAll(false)
                            }}
                            className="flex-1 h-10 font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-sm active:scale-95 transition-all"
                        >
                            {t('Confirm Clear')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
