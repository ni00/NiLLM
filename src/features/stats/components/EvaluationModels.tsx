import { useI18n } from '@/lib/i18n'
import { memo, useState, useMemo } from 'react'
import {
    BarChart3,
    Clock,
    Cpu,
    Star,
    Trash2,
    Zap,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    MessageSquare,
    Image as ImageIcon,
    Tag
} from 'lucide-react'
import type { ModelStat } from '../hooks/useStats'
import { formatStatCost, formatStatNumber } from '../display'
import { Button } from '@/components/ui/button'

const SimpleTable = ({ children }: { children: React.ReactNode }) => (
    <div
        style={{
            width: '100%',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch'
        }}
    >
        <table
            style={{
                minWidth: 1300,
                width: '100%',
                captionSide: 'bottom',
                fontSize: '0.875rem',
                textAlign: 'left'
            }}
        >
            {children}
        </table>
    </div>
)
const SimpleTableHeader = ({ children }: { children: React.ReactNode }) => (
    <thead className="[&_tr]:border-b">{children}</thead>
)
const SimpleTableBody = ({ children }: { children: React.ReactNode }) => (
    <tbody className="[&_tr:last-child]:border-0">{children}</tbody>
)
const SimpleTableRow = ({
    children,
    className
}: {
    children: React.ReactNode
    className?: string
}) => (
    <tr
        className={`border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted ${className}`}
    >
        {children}
    </tr>
)
const SimpleTableHead = ({
    children,
    className,
    onClick
}: {
    children: React.ReactNode
    className?: string
    onClick?: () => void
}) => (
    <th
        className={`h-12 px-4 text-left align-middle whitespace-nowrap font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 ${className}`}
        onClick={onClick}
    >
        {children}
    </th>
)
const SimpleTableCell = ({
    children,
    className
}: {
    children: React.ReactNode
    className?: string
}) => (
    <td
        className={`p-4 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 ${className}`}
    >
        {children}
    </td>
)

interface EvaluationModelsProps {
    modelStats: ModelStat[]
    maxTPS: number
    onClearModel: (modelId: string) => void
}

export const EvaluationModels = memo(function EvaluationModels({
    modelStats,
    maxTPS,
    onClearModel
}: EvaluationModelsProps) {
    const t = useI18n()
    const [page, setPage] = useState(0)
    const [sortConfig, setSortConfig] = useState<{
        key: keyof ModelStat
        direction: 'asc' | 'desc'
    }>({
        key: 'avgTPS',
        direction: 'desc'
    })

    const sortedStats = useMemo(() => {
        const sorted = [...modelStats]
        sorted.sort((a, b) => {
            const aValue = a[sortConfig.key] ?? ''
            const bValue = b[sortConfig.key] ?? ''

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
            return 0
        })
        return sorted
    }, [modelStats, sortConfig])

    const handleSort = (key: keyof ModelStat) => {
        setPage(0)
        setSortConfig((current) => ({
            key,
            direction:
                current.key === key && current.direction === 'desc'
                    ? 'asc'
                    : 'desc'
        }))
    }

    const pageCount = Math.max(1, Math.ceil(sortedStats.length / 25))
    const currentPage = Math.min(page, pageCount - 1)
    const visibleStats = sortedStats.slice(
        currentPage * 25,
        (currentPage + 1) * 25
    )

    const SortHeader = ({
        column,
        children,
        className
    }: {
        column: keyof ModelStat
        children: React.ReactNode
        className?: string
    }) => {
        const isSorted = sortConfig.key === column
        return (
            <SimpleTableHead
                className={`cursor-pointer select-none hover:bg-muted/50 transition-colors ${className}`}
            >
                <button
                    type="button"
                    className="flex items-center gap-1"
                    onClick={() => handleSort(column)}
                    aria-label={`Sort by ${column}`}
                >
                    {children}
                    {isSorted ? (
                        sortConfig.direction === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5 ml-1" />
                        ) : (
                            <ArrowDown className="h-3.5 w-3.5 ml-1" />
                        )
                    ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-20" />
                    )}
                </button>
            </SimpleTableHead>
        )
    }

    if (modelStats.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-muted/10 border-2 border-dashed rounded-xl">
                <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">
                    {t('Insufficient Data')}
                </h3>
                <p className="text-sm text-muted-foreground/60 max-w-xs text-center mt-2">
                    {t(
                        'Start some conversations in the Arena to populate these performance benchmarks.'
                    )}
                </p>
            </div>
        )
    }

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr)',
                gap: '1rem',
                width: '100%'
            }}
        >
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-primary" />{' '}
                    {t('Evaluation Models')}
                </h2>
                <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {sortedStats.length} {t('Models tracked')}
                </span>
            </div>

            <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
                <SimpleTable>
                    <SimpleTableHeader>
                        <SimpleTableRow>
                            <SortHeader column="name" className="w-[180px]">
                                {t('Model')}
                            </SortHeader>
                            <SortHeader column="mode" className="w-[100px]">
                                <Tag className="h-3.5 w-3.5 text-orange-400 mr-1" />{' '}
                                {t('Category')}
                            </SortHeader>
                            <SortHeader column="provider">
                                {t('Provider')}
                            </SortHeader>
                            <SortHeader column="avgTPS">
                                <Zap className="h-3.5 w-3.5 text-yellow-500 mr-1" />{' '}
                                {t('Speed')}
                            </SortHeader>
                            <SortHeader column="avgTTFT">
                                <Clock className="h-3.5 w-3.5 text-blue-400 mr-1" />{' '}
                                {t('Latency')}
                            </SortHeader>
                            <SortHeader column="p95TTFT">
                                {t('P95 latency')}
                            </SortHeader>
                            <SortHeader column="avgDuration">
                                {t('Duration')}
                            </SortHeader>
                            <SortHeader column="successRate">
                                {t('Success')}
                            </SortHeader>
                            <SortHeader column="totalTokens">
                                {t('Tokens')}
                            </SortHeader>
                            <SortHeader column="totalCost">
                                {t('Cost (USD)')}
                            </SortHeader>
                            <SortHeader column="avgRating">
                                <Star className="h-3.5 w-3.5 text-amber-500 mr-1" />{' '}
                                {t('Quality')}
                            </SortHeader>
                            <SortHeader column="completedCount">
                                <BarChart3 className="h-3.5 w-3.5 text-green-400 mr-1" />{' '}
                                {t('Samples')}
                            </SortHeader>
                            <SimpleTableHead className="text-right">
                                {t('Actions')}
                            </SimpleTableHead>
                        </SimpleTableRow>
                    </SimpleTableHeader>
                    <SimpleTableBody>
                        {visibleStats.map((stat) => (
                            <SimpleTableRow key={stat.groupKey ?? stat.id}>
                                <SimpleTableCell className="font-medium">
                                    <div className="flex flex-col">
                                        <span
                                            className="truncate max-w-[180px]"
                                            title={stat.name}
                                        >
                                            {stat.name}
                                        </span>
                                    </div>
                                </SimpleTableCell>
                                <SimpleTableCell>
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary/50 border border-secondary w-fit">
                                        {stat.mode === 'image' ? (
                                            <>
                                                <ImageIcon className="h-3 w-3 text-purple-500" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">
                                                    {t('Image')}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <MessageSquare className="h-3 w-3 text-blue-500" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">
                                                    {t(
                                                        stat.mode === 'decision'
                                                            ? 'Decision'
                                                            : 'Chat'
                                                    )}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </SimpleTableCell>
                                <SimpleTableCell>
                                    <span
                                        className="block max-w-[180px] truncate text-xs font-mono uppercase text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-muted"
                                        title={stat.provider}
                                    >
                                        {stat.provider}
                                    </span>
                                </SimpleTableCell>
                                <SimpleTableCell>
                                    <div className="flex flex-col gap-1.5 w-[140px]">
                                        <div className="flex items-baseline justify-between">
                                            <span className="font-mono font-medium">
                                                {stat.speedSampleCount
                                                    ? formatStatNumber(
                                                          stat.avgTPS
                                                      )
                                                    : '—'}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {'t/s'}
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all duration-500"
                                                style={{
                                                    width: `${Math.min((stat.avgTPS / maxTPS) * 100, 100)}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                </SimpleTableCell>
                                <SimpleTableCell>
                                    <div className="font-mono">
                                        {stat.latencySampleCount
                                            ? formatStatNumber(stat.avgTTFT)
                                            : '—'}{' '}
                                        <span className="text-xs text-muted-foreground">
                                            {'ms'}
                                        </span>
                                    </div>
                                </SimpleTableCell>
                                <SimpleTableCell>
                                    <span className="font-mono">
                                        {stat.latencySampleCount
                                            ? `${formatStatNumber(stat.p95TTFT)} ms`
                                            : '—'}
                                    </span>
                                </SimpleTableCell>
                                <SimpleTableCell>
                                    <span className="font-mono">
                                        {stat.avgDuration
                                            ? `${formatStatNumber(stat.avgDuration / 1000)} s`
                                            : '—'}
                                    </span>
                                </SimpleTableCell>
                                <SimpleTableCell>
                                    <span>
                                        {stat.completedCount +
                                        stat.errorCount +
                                        stat.cancelledCount
                                            ? `${formatStatNumber(stat.successRate)}%`
                                            : '—'}
                                    </span>
                                    <p className="text-xs text-muted-foreground">
                                        {stat.errorCount} {t('failed ·')}{' '}
                                        {stat.cancelledCount} {t('cancelled ·')}{' '}
                                        {stat.pendingCount} {t('pending')}
                                    </p>
                                </SimpleTableCell>
                                <SimpleTableCell>
                                    <span>
                                        {stat.totalTokens.toLocaleString()}
                                    </span>
                                    <p className="text-xs text-muted-foreground">
                                        {t('In')}{' '}
                                        {stat.inputTokens.toLocaleString()}{' '}
                                        {t('/ Out')}{' '}
                                        {stat.outputTokens.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {stat.estimatedCount}{' '}
                                        {t('estimated samples')}
                                    </p>
                                </SimpleTableCell>
                                <SimpleTableCell>
                                    {stat.costSampleCount
                                        ? formatStatCost(stat.totalCost)
                                        : '—'}
                                </SimpleTableCell>
                                <SimpleTableCell>
                                    <div className="font-medium">
                                        {stat.avgRating > 0
                                            ? formatStatNumber(stat.avgRating)
                                            : '—'}
                                    </div>
                                </SimpleTableCell>
                                <SimpleTableCell>
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {stat.completedCount} /{' '}
                                        {stat.totalCount} {'msg'}
                                    </span>
                                </SimpleTableCell>
                                <SimpleTableCell className="text-right">
                                    <button
                                        onClick={() => onClearModel(stat.id)}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                        title={t('Clear data')}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">
                                            {t('Clear data')}
                                        </span>
                                    </button>
                                </SimpleTableCell>
                            </SimpleTableRow>
                        ))}
                    </SimpleTableBody>
                </SimpleTable>
            </div>
            {pageCount > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <p className="text-muted-foreground">
                        {t('Page {page} of {pages}', {
                            page: currentPage + 1,
                            pages: pageCount
                        })}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            disabled={currentPage === 0}
                            onClick={() => setPage(currentPage - 1)}
                        >
                            {t('Previous page')}
                        </Button>
                        <Button
                            variant="outline"
                            disabled={currentPage === pageCount - 1}
                            onClick={() => setPage(currentPage + 1)}
                        >
                            {t('Next page')}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
})
