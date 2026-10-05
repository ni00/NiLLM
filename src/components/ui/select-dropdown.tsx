import { useI18n } from '@/lib/i18n'
import * as React from 'react'
import { Check, ChevronDown, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from '@/components/ui/popover'

export interface SelectOption {
    label: string
    value: string
    icon?: LucideIcon
    description?: string
}

interface SelectDropdownProps {
    ariaLabel?: string
    value: string
    onChange: (value: string) => void
    options: SelectOption[]
    placeholder?: string
    className?: string
    width?: string | number
    searchable?: boolean
    disabled?: boolean
}

export function SelectDropdown({
    value,
    ariaLabel,
    onChange,
    options,
    placeholder,
    className,
    width = 'w-full',
    searchable = false,
    disabled = false
}: SelectDropdownProps) {
    const t = useI18n()
    const placeholderText = placeholder ?? t('Select...')
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState('')
    const filteredOptions = options.filter(
        (option) =>
            !searchable ||
            `${option.label} ${option.value}`
                .toLowerCase()
                .includes(query.toLowerCase())
    )

    const selectedOption = options.find((opt) => opt.value === value)

    return (
        <Popover
            // A portaled list needs its own scroll lock inside a modal dialog.
            modal
            open={open}
            onOpenChange={(next) => {
                setOpen(next)
                if (!next) setQuery('')
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-label={
                        ariaLabel || selectedOption?.label || placeholderText
                    }
                    disabled={disabled}
                    className={cn(
                        'justify-between font-normal bg-background hover:bg-accent hover:text-accent-foreground',
                        !value && 'text-muted-foreground',
                        typeof width === 'string' ? width : undefined,
                        className
                    )}
                    style={{
                        width: typeof width === 'number' ? width : undefined
                    }}
                >
                    <span className="flex items-center gap-2 truncate">
                        {selectedOption?.icon && (
                            <selectedOption.icon className="h-4 w-4 shrink-0 opacity-50" />
                        )}
                        <span className="truncate">
                            {selectedOption
                                ? selectedOption.label
                                : placeholderText}
                        </span>
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="flex flex-col overflow-hidden p-1"
                align="start"
                collisionPadding={8}
                style={{
                    maxHeight:
                        'min(360px, var(--radix-popover-content-available-height))',
                    width:
                        typeof width === 'number'
                            ? width
                            : 'var(--radix-popover-trigger-width)'
                }}
            >
                {searchable && (
                    <Input
                        aria-label={t('Search options')}
                        placeholder={t('Search options')}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        className="mb-1 shrink-0"
                    />
                )}
                <div
                    data-slot="select-options"
                    className="min-h-0 max-h-[300px] overflow-y-auto overscroll-contain touch-pan-y"
                >
                    <div className="flex flex-col gap-0.5 p-1">
                        {filteredOptions.map((option) => (
                            <Button
                                key={option.value}
                                variant="ghost"
                                onClick={() => {
                                    onChange(option.value)
                                    setOpen(false)
                                    setQuery('')
                                }}
                                className={cn(
                                    'justify-between items-center h-9 px-2 font-normal',
                                    value === option.value &&
                                        'bg-accent text-accent-foreground'
                                )}
                            >
                                <span className="flex items-center gap-2 truncate">
                                    {option.icon && (
                                        <option.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    )}
                                    <div className="flex flex-col items-start truncate text-left">
                                        <span className="truncate">
                                            {option.label}
                                        </span>
                                        {option.description && (
                                            <span className="text-xs text-muted-foreground truncate">
                                                {option.description}
                                            </span>
                                        )}
                                    </div>
                                </span>
                                {value === option.value && (
                                    <Check className="h-4 w-4 shrink-0 text-primary" />
                                )}
                            </Button>
                        ))}
                        {filteredOptions.length === 0 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                {t('No options found.')}
                            </div>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
