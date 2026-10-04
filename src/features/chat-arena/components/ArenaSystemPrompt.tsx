import { useI18n } from '@/lib/i18n'
import React from 'react'
import { Textarea } from '@/components/ui/textarea'

export interface ArenaSystemPromptProps {
    value: string
    onChange: (val: string) => void
}

export const ArenaSystemPrompt = React.memo(
    ({ value, onChange }: ArenaSystemPromptProps) => {
        const t = useI18n()
        return (
            <div className="space-y-4">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold">
                        {t('Global System Prompt')}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                        {t(
                            'Define the base behavior for all models in this session.'
                        )}
                    </p>
                </div>
                <Textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={t(
                        'e.g. You are a helpful AI assistant specialized in coding...'
                    )}
                    className="min-h-[350px] text-sm resize-none focus-visible:ring-primary/20 p-4"
                />
            </div>
        )
    }
)

ArenaSystemPrompt.displayName = 'ArenaSystemPrompt'
