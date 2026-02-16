import { StateCreator } from 'zustand'
import { PromptTemplate } from '@/lib/types'

const DEFAULT_TEMPLATES: PromptTemplate[] = [
    {
        id: 'builtin-1',
        title: 'Summarize Text',
        content:
            'Please summarize the following text into 3 key points:\n\n{{text}}',
        variables: [{ name: 'text', description: 'The text to summarize' }],
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        id: 'builtin-2',
        title: 'Explain Code',
        content:
            'Explain the following code snippet step-by-step:\n\n```{{language}}\n{{code}}\n```',
        variables: [
            {
                name: 'language',
                description: 'Programming language'
            },
            { name: 'code', description: 'The code snippet' }
        ],
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        id: 'builtin-3',
        title: 'Creative Writing',
        content:
            'Write a short story about {{topic}} in the style of {{author}}.',
        variables: [
            { name: 'topic', description: 'The main subject' },
            { name: 'author', description: 'The style author' }
        ],
        createdAt: Date.now(),
        updatedAt: Date.now()
    }
]

export interface PromptsSlice {
    promptTemplates: PromptTemplate[]
    setPromptTemplates: (templates: PromptTemplate[]) => void
    addPromptTemplate: (template: PromptTemplate) => void
    updatePromptTemplate: (id: string, updates: Partial<PromptTemplate>) => void
    deletePromptTemplate: (id: string) => void
    reorderPromptTemplates: (fromIndex: number, toIndex: number) => void
}

export const createPromptsSlice: StateCreator<
    PromptsSlice,
    [],
    [],
    PromptsSlice
> = (set) => ({
    promptTemplates: DEFAULT_TEMPLATES,

    setPromptTemplates: (templates) => set({ promptTemplates: templates }),

    addPromptTemplate: (tmpl) =>
        set((state) => ({
            promptTemplates: [...state.promptTemplates, tmpl]
        })),

    updatePromptTemplate: (id, updates) =>
        set((state) => ({
            promptTemplates: state.promptTemplates.map((t) =>
                t.id === id ? { ...t, ...updates } : t
            )
        })),

    deletePromptTemplate: (id) =>
        set((state) => ({
            promptTemplates: state.promptTemplates.filter((t) => t.id !== id)
        })),

    reorderPromptTemplates: (fromIndex, toIndex) =>
        set((state) => {
            const newTemplates = [...state.promptTemplates]
            const [moved] = newTemplates.splice(fromIndex, 1)
            newTemplates.splice(toIndex, 0, moved)
            return { promptTemplates: newTemplates }
        })
})
