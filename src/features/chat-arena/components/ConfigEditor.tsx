import { GenerationConfig, GenerationConfigPatch } from '@/lib/types'
import { SamplingConfig } from './config/SamplingConfig'
import { PenaltiesConfig } from './config/PenaltiesConfig'
import { ConstraintsConfig } from './config/ConstraintsConfig'
import { TimeoutsConfig } from './config/TimeoutsConfig'
import { TelemetryConfig } from './config/TelemetryConfig'
import type { ConfigSource } from '@/lib/types'
import { useId } from 'react'

interface ConfigEditorProps {
    /** Effective values for display (base merged with the edited layer). */
    config: GenerationConfig
    /** Emits only the changed fields as a patch. */
    onChange: (patch: GenerationConfigPatch) => void
    sources?: Record<string, ConfigSource>
    onResetField?: (path: string) => void
}

export const ConfigEditor = ({
    config,
    onChange,
    sources,
    onResetField
}: ConfigEditorProps) => {
    const idPrefix = useId()
    const sectionProps = { config, onChange, sources, onResetField, idPrefix }
    return (
        <div className="grid gap-10 py-2">
            <SamplingConfig {...sectionProps} />
            <PenaltiesConfig {...sectionProps} />
            <ConstraintsConfig {...sectionProps} />
            <TimeoutsConfig {...sectionProps} />
            <TelemetryConfig {...sectionProps} />
        </div>
    )
}
