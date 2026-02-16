import { GenerationConfig } from '@/lib/types'
import { SamplingConfig } from './config/SamplingConfig'
import { PenaltiesConfig } from './config/PenaltiesConfig'
import { ConstraintsConfig } from './config/ConstraintsConfig'
import { TimeoutsConfig } from './config/TimeoutsConfig'
import { TelemetryConfig } from './config/TelemetryConfig'

interface ConfigEditorProps {
    config: GenerationConfig
    onChange: (c: GenerationConfig) => void
}

export const ConfigEditor = ({ config, onChange }: ConfigEditorProps) => {
    const handleUpdate = (updates: Partial<GenerationConfig>) => {
        onChange({ ...config, ...updates })
    }

    return (
        <div className="grid gap-10 py-2">
            <SamplingConfig config={config} onChange={handleUpdate} />
            <PenaltiesConfig config={config} onChange={handleUpdate} />
            <ConstraintsConfig config={config} onChange={handleUpdate} />
            <TimeoutsConfig config={config} onChange={handleUpdate} />
            <TelemetryConfig config={config} onChange={handleUpdate} />
        </div>
    )
}
