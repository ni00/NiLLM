import { useI18n } from '@/lib/i18n'
import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

function LocalizedCloseLabel() {
    const t = useI18n()
    return <span className="sr-only">{t('Close')}</span>
}

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
        ref={ref}
        className={cn(
            'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            className
        )}
        {...props}
    />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(
    (
        { className, children, onOpenAutoFocus, onCloseAutoFocus, ...props },
        ref
    ) => {
        const returnFocus = React.useRef<HTMLElement | null>(null)
        return (
            <DialogPortal>
                <DialogOverlay />
                <DialogPrimitive.Content
                    data-slot="dialog-content"
                    ref={ref}
                    className={cn(
                        'fixed left-[50%] top-[50%] z-50 flex flex-col min-w-0 w-[calc(100%-2rem)] max-w-lg max-h-[min(90dvh,calc(100dvh-2rem))] translate-x-[-50%] translate-y-[-50%] border bg-background shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-2xl overflow-hidden border-border',
                        className
                    )}
                    {...props}
                    onOpenAutoFocus={(event) => {
                        returnFocus.current =
                            document.activeElement instanceof HTMLElement
                                ? document.activeElement
                                : null
                        onOpenAutoFocus?.(event)
                    }}
                    onCloseAutoFocus={(event) => {
                        onCloseAutoFocus?.(event)
                        if (
                            !event.defaultPrevented &&
                            returnFocus.current?.isConnected
                        ) {
                            event.preventDefault()
                            returnFocus.current.focus({ preventScroll: true })
                        }
                    }}
                >
                    {children}
                    <DialogPrimitive.Close className="absolute right-2 top-2 min-h-11 min-w-11 flex items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10">
                        <X className="h-4 w-4" />
                        <LocalizedCloseLabel />
                    </DialogPrimitive.Close>
                </DialogPrimitive.Content>
            </DialogPortal>
        )
    }
)
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        data-slot="dialog-header"
        className={cn(
            'shrink-0 flex flex-col gap-1.5 text-left p-4 pr-14 sm:p-6 sm:pr-16 border-b bg-muted/30',
            className
        )}
        {...props}
    />
)
DialogHeader.displayName = 'DialogHeader'

const DialogBody = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        data-slot="dialog-body"
        className={cn(
            'min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6',
            className
        )}
        {...props}
    />
))
DialogBody.displayName = 'DialogBody'

const DialogFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        data-slot="dialog-footer"
        className={cn(
            'shrink-0 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end p-4 sm:p-6 border-t bg-muted/20',
            className
        )}
        {...props}
    />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Title
        ref={ref}
        className={cn(
            'text-base font-semibold leading-snug tracking-tight',
            className
        )}
        {...props}
    />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Description
        ref={ref}
        className={cn(
            'text-sm text-muted-foreground leading-relaxed',
            className
        )}
        {...props}
    />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
    Dialog,
    DialogPortal,
    DialogOverlay,
    DialogClose,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogBody,
    DialogFooter,
    DialogTitle,
    DialogDescription
}
