import * as React from 'react'
import { Check, ChevronDown, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'

export interface SelectOption {
    label: string
    value: string
    icon?: LucideIcon
    description?: string
}

interface SelectDropdownProps {
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
    onChange,
    options,
    placeholder = 'Select...',
    className,
    width = 'w-full',
    searchable: _searchable = false,
    disabled = false
}: SelectDropdownProps) {
    const [open, setOpen] = React.useState(false)

    const selectedOption = options.find((opt) => opt.value === value)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
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
                                : placeholder}
                        </span>
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="p-1"
                align="start"
                style={{
                    width:
                        typeof width === 'number'
                            ? width
                            : 'var(--radix-popover-trigger-width)'
                }}
            >
                <ScrollArea className="max-h-[300px]">
                    <div className="flex flex-col gap-0.5 p-1">
                        {options.map((option) => (
                            <Button
                                key={option.value}
                                variant="ghost"
                                onClick={() => {
                                    onChange(option.value)
                                    setOpen(false)
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
                        {options.length === 0 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                No options found.
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
}
