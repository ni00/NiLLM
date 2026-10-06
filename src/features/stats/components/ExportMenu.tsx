import { useI18n } from '@/lib/i18n'
import { buildReportDocument } from '../domain/report'
import type { ReportInput } from '../domain/report-types'
import { exportStatsCSV, exportResultsCSV } from '../domain/export-csv'
import { exportReportMarkdown } from '../domain/export-markdown'
import { exportReportHTML } from '../domain/export-html'
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
    DialogBody,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter
} from '@/components/ui/alert-dialog'
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

type DownloadFormat = Exclude<'json' | 'csv' | 'md' | 'html', 'json'>

const DOWNLOAD_FORMATS: Record<
    DownloadFormat,
    { extension: string; mimeType: string }
> = {
    csv: { extension: 'csv', mimeType: 'text/csv;charset=utf-8;' },
    md: { extension: 'md', mimeType: 'text/markdown;charset=utf-8;' },
    html: { extension: 'html', mimeType: 'text/html;charset=utf-8;' }
}

interface ExportMenuProps {
    input?: ReportInput
    onClearAll?: () => void
}

export function ExportMenu({ input, onClearAll }: ExportMenuProps) {
    const t = useI18n()
    const [confirmClearAll, setConfirmClearAll] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importStatus, setImportStatus] = useState('')
    const [backupOpen, setBackupOpen] = useState(false)
    const [includeSecrets, setIncludeSecrets] = useState(false)
    const [rawFormat, setRawFormat] = useState<'json' | 'csv' | null>(null)
    const [rawInput, setRawInput] = useState<ReportInput>()
    const [includeReasoning, setIncludeReasoning] = useState(false)
    const isProcessing = useAppStore((state) => state.isProcessing)
    const isJudging = useAppStore((state) => state.isJudging)
    const persistenceState = useAppStore((state) => state.persistenceState)
    const busy = isProcessing || isJudging
    const storageBroken = persistenceState === 'error'

    const handleReportExport = async (
        format: 'json' | 'csv' | 'md' | 'html'
    ) => {
        if (!input) return
        const document = buildReportDocument(
            input,
            { includeContent: false, includeReasoning: false },
            Date.now()
        )
        const name = `nillm-${input.source}-report-${document.metadata.generatedAt.slice(0, 10)}`
        if (format === 'json') {
            await downloadJson(document, `${name}.json`)
        } else {
            const content =
                format === 'csv'
                    ? exportStatsCSV(document.modelComparison)
                    : format === 'md'
                      ? exportReportMarkdown(document)
                      : exportReportHTML(document)
            const { extension, mimeType } = DOWNLOAD_FORMATS[format]
            await downloadFile(content, `${name}.${extension}`, mimeType)
        }
    }

    const openRawExport = (format: 'json' | 'csv') => {
        if (!input) return
        setRawInput(input)
        setIncludeReasoning(false)
        setRawFormat(format)
    }

    const closeRawExport = () => {
        setRawFormat(null)
        setRawInput(undefined)
    }

    const handleRawExport = async () => {
        if (!rawInput || !rawFormat) return
        const document = buildReportDocument(
            rawInput,
            { includeContent: true, includeReasoning },
            Date.now()
        )
        const name = `nillm-${rawInput.source}-requests-${document.metadata.generatedAt.slice(0, 10)}`
        if (rawFormat === 'json') {
            await downloadJson(document, `${name}.json`)
        } else {
            await downloadFile(
                exportResultsCSV(document),
                `${name}.csv`,
                DOWNLOAD_FORMATS.csv.mimeType
            )
        }
        closeRawExport()
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
            setImportStatus(
                e instanceof Error ? e.message : t('Failed to export data')
            )
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
                    aria-label={t('Restore')}
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
                aria-label={t('Backup')}
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
                        aria-label={t('Reports')}
                        disabled={!input}
                    >
                        <FileBarChart className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="hidden md:inline text-xs font-medium">
                            {t('Reports')}
                        </span>
                        <ChevronDown className="hidden md:block h-3 w-3 opacity-50 transition-transform group-data-[state=open]:rotate-180" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-72 max-w-[calc(100vw-2rem)] p-2"
                    align="end"
                >
                    <div className="flex flex-col gap-1">
                        <Button
                            variant="ghost"
                            className="justify-start gap-2"
                            onClick={() => handleReportExport('json')}
                        >
                            <FileJson className="h-4 w-4" />
                            {t('Summary JSON')}
                        </Button>
                        <Button
                            variant="ghost"
                            className="justify-start gap-2"
                            onClick={() => handleReportExport('csv')}
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                            {t('Summary CSV')}
                        </Button>
                        <Button
                            variant="ghost"
                            className="justify-start gap-2"
                            onClick={() => openRawExport('json')}
                        >
                            <FileJson className="h-4 w-4" />
                            {t('Raw requests JSON')}
                        </Button>
                        <Button
                            variant="ghost"
                            className="justify-start gap-2"
                            onClick={() => openRawExport('csv')}
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                            {t('Raw requests CSV')}
                        </Button>
                        <Button
                            variant="ghost"
                            className="justify-start gap-2"
                            onClick={() => handleReportExport('md')}
                        >
                            <FileBarChart className="h-4 w-4" />
                            {t('Markdown report')}
                        </Button>
                        <Button
                            variant="ghost"
                            className="justify-start gap-2"
                            onClick={() => handleReportExport('html')}
                        >
                            <FileBarChart className="h-4 w-4" />
                            {t('Offline HTML report')}
                        </Button>
                        <p className="px-3 py-2 text-xs text-muted-foreground">
                            {t(
                                'Shared reports omit prompts and responses by default.'
                            )}
                        </p>
                    </div>
                </PopoverContent>
            </Popover>

            <Dialog
                open={rawFormat !== null}
                onOpenChange={(open) => {
                    if (!open) closeRawExport()
                }}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('Export raw requests')}</DialogTitle>
                        <DialogDescription>
                            {t(
                                'Raw requests contain user prompts and responses. API keys, private endpoint parts and telemetry metadata are never exported.'
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogBody className="space-y-4">
                        <p className="text-xs text-muted-foreground">
                            {t(
                                'The selection is captured when this confirmation opens.'
                            )}
                        </p>
                        <label className="min-h-11 flex items-start gap-3 rounded-lg border p-3 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeReasoning}
                                onChange={(event) =>
                                    setIncludeReasoning(event.target.checked)
                                }
                                className="mt-0.5 accent-primary"
                            />
                            <span>
                                <span className="font-medium">
                                    {t('Include reasoning text')}
                                </span>
                                <span className="block text-xs text-muted-foreground mt-1">
                                    {t(
                                        'Reasoning may contain additional sensitive content.'
                                    )}
                                </span>
                            </span>
                        </label>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={closeRawExport}>
                            {t('Cancel')}
                        </Button>
                        <Button onClick={handleRawExport}>
                            {t('Download raw requests')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                    <DialogBody>
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
                    </DialogBody>
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

            {onClearAll && (
                <AlertDialog
                    open={confirmClearAll}
                    onOpenChange={setConfirmClearAll}
                >
                    <Button
                        variant="outline"
                        onClick={() => setConfirmClearAll(true)}
                        disabled={busy || storageBroken}
                        aria-label={t('Clear arena history')}
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
                    <AlertDialogContent className="max-w-md">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                                <AlertCircle className="w-4 h-4" />{' '}
                                {t('Danger Zone')}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {t(
                                    'Permanently delete all session history, chat records, and benchmark performance results.'
                                )}
                            </AlertDialogDescription>
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
                        </AlertDialogHeader>

                        <AlertDialogFooter>
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
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    )
}
