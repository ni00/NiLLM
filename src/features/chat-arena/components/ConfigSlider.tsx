import React from 'react'
import { Label } from '@/components/ui/label'

interface ConfigSliderProps {
    label?: string
    value: number
    id: string
    min: number
    max: number
    step: number
    onChange: (val: number) => void
    labels?: [string, string]

    override?: React.ReactNode
}

export const ConfigSlider = React.memo(
    ({
        label,
        value,
        id,
        min,
        max,
        step,
        onChange,
        labels,
        override
    }: ConfigSliderProps) => (
        <div className="space-y-3">
            {label && (
                <div className="flex justify-between items-end">
                    <div className="flex items-center gap-1.5">
                        <Label
                            htmlFor={id}
                            className="text-xs font-semibold opacity-70 uppercase tracking-wider"
                        >
                            {label}
                        </Label>
                        {override}
                    </div>
                    <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded leading-none">
                        {typeof value === 'number'
                            ? value.toFixed(step >= 0.1 ? 1 : 2)
                            : '0.0'}
                    </span>
                </div>
            )}
            <input
                id={id}
                type="range"
                step={step}
                min={min}
                max={max}
                value={value ?? 0}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-11 rounded-lg cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {labels && (
                <div className="flex justify-between text-xs text-muted-foreground font-medium px-0.5">
                    <span>{labels[0]}</span>
                    <span>{labels[1]}</span>
                </div>
            )}
        </div>
    )
)

ConfigSlider.displayName = 'ConfigSlider'
