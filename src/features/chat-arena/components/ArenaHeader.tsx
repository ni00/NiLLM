import { Layers, Download, Sparkles, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { QueuePopover } from './QueuePopover'

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
    return (
        <PageHeader
            title="Arena"
            description="Compare multiple models in real-time with unified prompts."
            icon={Layers}
            className="p-6 pb-0"
        >
            <div className="flex gap-2">
                <QueuePopover />

                <div className="h-10 w-px bg-border/50 mx-1" />

                <Button
                    variant="outline"
                    size="sm"
                    onClick={onExportAll}
                    className="h-10 px-4 group"
                >
                    <Download className="w-4 h-4 mr-2 text-muted-foreground group-hover:text-primary transition-colors" />
                    Export
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={onShowJudgePanel}
                    className="h-10 px-4 group bg-primary/5 border-primary/20 hover:bg-primary/10"
                >
                    <Sparkles className="w-4 h-4 mr-2 text-primary" />
                    Auto Judge
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onShowArenaSettings()}
                    className="h-10 px-4 group"
                >
                    <Settings2 className="w-4 h-4 mr-2 text-muted-foreground group-hover:rotate-90 transition-all duration-300" />
                    Configure
                </Button>
            </div>
        </PageHeader>
    )
}
