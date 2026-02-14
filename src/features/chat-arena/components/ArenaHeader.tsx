import {
    FolderOutput,
    Sparkles,
    Settings2,
    LayoutGrid,
    ArrowUpDown,
    Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QueuePopover } from './QueuePopover'
import { useAppStore } from '@/lib/store'
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface ArenaHeaderProps {
    onExportAll: () => void
    onShowJudgePanel: () => void
    onShowArenaSettings: () => void
}

export const ArenaHeader = ({
    onExportAll,
    onShowJudgePanel,
    onShowArenaSettings
}: ArenaHeaderProps) => {
    const { arenaColumns, setArenaColumns, arenaSortBy, setArenaSortBy } =
        useAppStore()

    const layoutOptions = [
        { label: 'Auto', value: 0 },
        { label: '1 Column', value: 1 },
        { label: '2 Columns', value: 2 },
        { label: '3 Columns', value: 3 },
        { label: '4 Columns', value: 4 }
    ]

    const sortOptions = [
        { label: 'Default', value: 'default' },
        { label: 'Model Name', value: 'name' },
        { label: 'Avg TTFT', value: 'ttft' },
        { label: 'Avg TPS', value: 'tps' },
        { label: 'Avg Rating', value: 'rating' }
    ]

    return (
        <div className="flex gap-2">
            <QueuePopover />

            <div className="h-10 w-px bg-border/50 mx-1" />

            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-4 group gap-2"
                    >
                        <LayoutGrid className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-xs font-medium">Layout</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-1" align="end">
                    <div className="flex flex-col">
                        {layoutOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setArenaColumns(opt.value)}
                                className={cn(
                                    'flex items-center justify-between px-3 py-2 text-sm rounded-sm hover:bg-accent transition-colors text-left',
                                    arenaColumns === opt.value
                                        ? 'text-primary'
                                        : 'text-muted-foreground'
                                )}
                            >
                                {opt.label}
                                {arenaColumns === opt.value && (
                                    <Check className="w-3.5 h-3.5" />
                                )}
                            </button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>

            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-4 group gap-2"
                    >
                        <ArrowUpDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-xs font-medium">Sort</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1" align="end">
                    <div className="flex flex-col">
                        {sortOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setArenaSortBy(opt.value as any)}
                                className={cn(
                                    'flex items-center justify-between px-3 py-2 text-sm rounded-sm hover:bg-accent transition-colors text-left',
                                    arenaSortBy === opt.value
                                        ? 'text-primary'
                                        : 'text-muted-foreground'
                                )}
                            >
                                {opt.label}
                                {arenaSortBy === opt.value && (
                                    <Check className="w-3.5 h-3.5" />
                                )}
                            </button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>

            <div className="h-10 w-px bg-border/50 mx-1" />

            <Button
                variant="outline"
                size="sm"
                onClick={onExportAll}
                className="h-9 px-4 group gap-2"
            >
                <FolderOutput className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xs font-medium">Export</span>
            </Button>

            <Button
                variant="outline"
                size="sm"
                onClick={onShowJudgePanel}
                className="h-9 px-4 group gap-2"
            >
                <Sparkles className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xs font-medium">Judge</span>
            </Button>

            <Button
                variant="outline"
                size="sm"
                onClick={() => onShowArenaSettings()}
                className="h-9 px-4 group gap-2"
            >
                <Settings2 className="w-4 h-4 text-muted-foreground group-hover:rotate-90 transition-all duration-300" />
                <span className="text-xs font-medium">Configure</span>
            </Button>
        </div>
    )
}
