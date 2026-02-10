import React from 'react'
import { Textarea } from '@/components/ui/textarea'

export interface ArenaSystemPromptProps {
    value: string
    onChange: (val: string) => void
}

export const ArenaSystemPrompt = React.memo(
    ({ value, onChange }: ArenaSystemPromptProps) => {
        return (
            <div className="space-y-4">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold">
                        Global System Prompt
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                        Define the base behavior for all models in this session.
                    </p>
                </div>
                <Textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="e.g. You are a helpful AI assistant specialized in coding..."
                    className="min-h-[350px] text-sm resize-none focus-visible:ring-primary/20 p-4"
                />
            </div>
        )
    }
)

ArenaSystemPrompt.displayName = 'ArenaSystemPrompt'
