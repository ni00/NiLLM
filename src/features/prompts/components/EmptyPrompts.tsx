import { BookTemplate } from 'lucide-react'

interface EmptyPromptsProps {
    onImport: () => void
    onCreate: () => void
}

export function EmptyPrompts({ onImport, onCreate }: EmptyPromptsProps) {
    return (
        <div className="col-span-full flex flex-col items-center justify-center p-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
            <BookTemplate className="h-10 w-10 mb-4 opacity-30" />
            <p>No templates yet. Create one to get started!</p>
            <div className="flex gap-2 mt-4">
                <button
                    onClick={onImport}
                    className="text-xs text-primary hover:underline"
                >
                    Import template
                </button>
                <span className="text-xs">or</span>
                <button
                    onClick={onCreate}
                    className="text-xs text-primary hover:underline"
                >
                    Create new
                </button>
            </div>
        </div>
    )
}
