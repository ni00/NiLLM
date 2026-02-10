import React from 'react'
import { GenerationConfig } from '@/lib/types'
import { ConfigEditor } from './ConfigEditor'

export interface ArenaGlobalParamsProps {
    config: GenerationConfig
    onChange: (config: GenerationConfig) => void
}

export const ArenaGlobalParams = React.memo(
    ({ config, onChange }: ArenaGlobalParamsProps) => {
        return (
            <div className="space-y-4">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold">
                        Generation Parameters
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                        Adjust sampling and length constraints globally.
                    </p>
                </div>
                <div className="p-4 border rounded-xl bg-muted/5">
                    <ConfigEditor config={config} onChange={onChange} />
                </div>
            </div>
        )
    }
)

ArenaGlobalParams.displayName = 'ArenaGlobalParams'
