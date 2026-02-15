import { BarChart3, Clock, Cpu, Star, Trash2, Zap } from 'lucide-react'
import type { ModelStat } from '../hooks/useStats'

// Fallback table components if not available in project
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
                minWidth: 700,
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
    className
}: {
    children: React.ReactNode
    className?: string
}) => (
    <th
        className={`h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 ${className}`}
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
        className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${className}`}
    >
        {children}
    </td>
)

interface EvaluationModelsProps {
    modelStats: ModelStat[]
    maxTPS: number
    onClearModel: (modelId: string) => void
}

export function EvaluationModels({
    modelStats,
    maxTPS,
    onClearModel
}: EvaluationModelsProps) {
    // Determine which table implementation to use (conceptually), but here I'll just use the simple one
    // since I saw the table component doesn't exist in the file list.
    // I will use local component definitions to emulate the shadcn/ui table structure
    // without needing to create a new file, ensuring it works immediately.

    // Using the local SimpleTable components defined above.

    if (modelStats.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-muted/10 border-2 border-dashed rounded-xl">
                <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">
                    Insufficient Data
                </h3>
                <p className="text-sm text-muted-foreground/60 max-w-xs text-center mt-2">
                    Start some conversations in the Arena to populate these
                    performance benchmarks.
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
                    <Cpu className="h-5 w-5 text-primary" /> Evaluation Models
                </h2>
                <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {modelStats.length} Models tracked
                </span>
            </div>

            <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
                <SimpleTable>
                    <SimpleTableHeader>
                        <SimpleTableRow>
                            <SimpleTableHead className="w-[200px]">
                                Model
                            </SimpleTableHead>
                            <SimpleTableHead>Provider</SimpleTableHead>
                            <SimpleTableHead>
                                <div className="flex items-center gap-1">
                                    <Zap className="h-3.5 w-3.5 text-yellow-500" />{' '}
                                    Speed
                                </div>
                            </SimpleTableHead>
                            <SimpleTableHead>
                                <div className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5 text-blue-400" />{' '}
                                    Latency
                                </div>
                            </SimpleTableHead>
                            <SimpleTableHead>
                                <div className="flex items-center gap-1">
                                    <Star className="h-3.5 w-3.5 text-amber-500" />{' '}
                                    Quality
                                </div>
                            </SimpleTableHead>
                            <SimpleTableHead>
                                <div className="flex items-center gap-1">
                                    <BarChart3 className="h-3.5 w-3.5 text-green-400" />{' '}
                                    Samples
                                </div>
                            </SimpleTableHead>
                            <SimpleTableHead className="text-right">
                                Actions
                            </SimpleTableHead>
                        </SimpleTableRow>
                    </SimpleTableHeader>
                    <SimpleTableBody>
                        {modelStats.map((stat) => (
                            <SimpleTableRow key={stat.id}>
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
                                    <span className="text-xs font-mono uppercase text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-muted">
                                        {stat.provider}
                                    </span>
                                </SimpleTableCell>
                                <SimpleTableCell>
                                    <div className="flex flex-col gap-1.5 w-[140px]">
                                        <div className="flex items-baseline justify-between">
                                            <span className="font-mono font-medium">
                                                {stat.avgTPS.toFixed(1)}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                t/s
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
                                        {stat.avgTTFT.toFixed(0)}{' '}
                                        <span className="text-xs text-muted-foreground">
                                            ms
                                        </span>
                                    </div>
                                </SimpleTableCell>
                                <SimpleTableCell>
                                    <div className="font-medium">
                                        {stat.avgRating > 0
                                            ? stat.avgRating.toFixed(1)
                                            : '—'}
                                    </div>
                                </SimpleTableCell>
                                <SimpleTableCell>
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {stat.completedCount} /{' '}
                                        {stat.totalCount} msg
                                    </span>
                                </SimpleTableCell>
                                <SimpleTableCell className="text-right">
                                    <button
                                        onClick={() => onClearModel(stat.id)}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                        title="Clear data"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">
                                            Clear data
                                        </span>
                                    </button>
                                </SimpleTableCell>
                            </SimpleTableRow>
                        ))}
                    </SimpleTableBody>
                </SimpleTable>
            </div>
        </div>
    )
}
