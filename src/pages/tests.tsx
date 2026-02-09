import { useState, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Upload,
    Play,
    Trash2,
    FileJson,
    Plus,
    Download,
    Sparkles,
    BrainCircuit,
    Code2,
    CheckCircle2,
    Loader2,
    Box,
    Pencil,
    X,
    Save,
    RotateCcw,
    Languages,
    ArrowUp,
    ArrowDown
} from 'lucide-react'
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from '@/components/ui/popover'
import { useNavigate } from 'react-router'
import { PageHeader } from '@/components/ui/page-header'
import { TestSet } from '@/lib/types'
import { downloadJson, readJsonFile } from '@/lib/utils'

import { getBuiltinTests } from '@/data/builtin-tests'

// BUILTIN_TESTS removed, will act dynamically

export function TestsPage() {
    const {
        addTestSet,
        deleteTestSet,
        updateTestSet,
        createSession,
        activeModelIds,
        addToQueue,
        language,
        setLanguage,
        testSets: storedSets
    } = useAppStore()
    const navigate = useNavigate()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isImporting, setIsImporting] = useState(false)
    const [runningSetId, setRunningSetId] = useState<string | null>(null)
    const isRunningRef = useRef(false)

    // Edit/Create State
    const [isEditing, setIsEditing] = useState(false)
    const [editingSetId, setEditingSetId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<{
        name: string
        cases: { id: string; prompt: string }[]
    }>({ name: '', cases: [] })

    // Combine stored and builtin, allowing stored to override builtin
    // Combine stored and builtin, allowing stored to override builtin
    const builtInTests = getBuiltinTests(language)
    const storedMap = new Map(storedSets.map((s) => [s.id, s]))
    const allSets = [
        ...builtInTests.map((b) => storedMap.get(b.id) || b),
        ...storedSets.filter((s) => !builtInTests.find((b) => b.id === s.id))
    ]

    const handleImportClick = () => {
        fileInputRef.current?.click()
    }

    const handleExport = async (set: TestSet) => {
        await downloadJson(
            set,
            `${set.name.toLowerCase().replace(/\s+/g, '_')}.json`
        )
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsImporting(true)
        try {
            const data = await readJsonFile(file)

            if (!data.name || !Array.isArray(data.cases)) {
                alert(
                    "Invalid format. Expected JSON with 'name' and 'cases' array."
                )
                return
            }

            const newSet: TestSet = {
                id: crypto.randomUUID(),
                name: data.name,
                cases: data.cases.map((c: any) => ({
                    id: crypto.randomUUID(),
                    prompt: c.prompt || c,
                    expected: c.expected
                })),
                createdAt: Date.now()
            }

            addTestSet(newSet)
        } catch (err) {
            console.error(err)
            alert('Failed to parse file.')
        } finally {
            setIsImporting(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleRunTest = async (testSet: TestSet) => {
        if (isRunningRef.current) return
        if (activeModelIds.length === 0) {
            alert('Please select at least one active model in the Arena first.')
            return
        }

        isRunningRef.current = true
        setRunningSetId(testSet.id)

        try {
            // Create a dedicated session for this run
            const sessionId = createSession(
                `Batch Run: ${testSet.name}`,
                activeModelIds
            )

            // Queue batch
            testSet.cases.forEach((testCase) => {
                addToQueue(testCase.prompt, sessionId)
            })

            // Navigate immediately to watch progress
            navigate('/')
        } finally {
            isRunningRef.current = false
            setRunningSetId(null)
        }
    }

    const handleRunSingle = async (prompt: string) => {
        if (isRunningRef.current) return
        if (activeModelIds.length === 0) {
            alert('Please select at least one active model in the Arena first.')
            return
        }
        isRunningRef.current = true
        try {
            navigate('/')
            addToQueue(prompt)
        } finally {
            isRunningRef.current = false
        }
    }

    // Edit Handlers
    const openCreateModal = () => {
        setEditingSetId(null)
        setEditForm({
            name: '',
            cases: [{ id: crypto.randomUUID(), prompt: '' }]
        })
        setIsEditing(true)
    }

    const openEditModal = (set: TestSet) => {
        setEditingSetId(set.id)
        setEditForm({
            name: set.name,
            cases: set.cases.map((c) => ({ id: c.id, prompt: c.prompt }))
        })
        setIsEditing(true)
    }

    const saveTestSet = () => {
        if (!editForm.name.trim()) return
        const validCases = editForm.cases.filter((c) => c.prompt.trim())
        if (validCases.length === 0) return

        if (editingSetId) {
            const existsInStore = storedSets.some((s) => s.id === editingSetId)
            const updates = {
                name: editForm.name,
                cases: validCases.map((c) => ({
                    id: c.id,
                    prompt: c.prompt
                }))
            }

            if (existsInStore) {
                updateTestSet(editingSetId, updates)
            } else {
                // First time editing a built-in set - create an override
                const original = builtInTests.find((b) => b.id === editingSetId)
                addTestSet({
                    id: editingSetId,
                    ...updates,
                    createdAt: original?.createdAt || Date.now()
                })
            }
        } else {
            addTestSet({
                id: crypto.randomUUID(),
                name: editForm.name,
                cases: validCases.map((c) => ({
                    id: crypto.randomUUID(),
                    prompt: c.prompt
                })),
                createdAt: Date.now()
            })
        }
        setIsEditing(false)
    }

    const addCase = () => {
        setEditForm((prev) => ({
            ...prev,
            cases: [...prev.cases, { id: crypto.randomUUID(), prompt: '' }]
        }))
    }

    const removeCase = (id: string) => {
        setEditForm((prev) => ({
            ...prev,
            cases: prev.cases.filter((c) => c.id !== id)
        }))
    }

    const updateCase = (id: string, text: string) => {
        setEditForm((prev) => ({
            ...prev,
            cases: prev.cases.map((c) =>
                c.id === id ? { ...c, prompt: text } : c
            )
        }))
    }

    const moveCase = (index: number, direction: 'up' | 'down') => {
        setEditForm((prev) => {
            const newCases = [...prev.cases]
            if (direction === 'up' && index > 0) {
                const temp = newCases[index]
                newCases[index] = newCases[index - 1]
                newCases[index - 1] = temp
            } else if (direction === 'down' && index < newCases.length - 1) {
                const temp = newCases[index]
                newCases[index] = newCases[index + 1]
                newCases[index + 1] = temp
            }
            return { ...prev, cases: newCases }
        })
    }

    return (
        <div className="flex flex-col h-full gap-6 p-6 overflow-hidden bg-background">
            <PageHeader
                title="Test Sets"
                description="Built-in and custom benchmarks for systematic model evaluation."
                icon={Box}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".json"
                />
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className="h-10 px-4 shadow-sm transition-all active:scale-95 gap-2"
                        >
                            <Languages className="h-4 w-4" />
                            {language === 'zh'
                                ? '中文'
                                : language === 'ja'
                                  ? '日本語'
                                  : 'English'}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-40 p-1" align="end">
                        <div className="grid gap-1">
                            <Button
                                variant="ghost"
                                className="justify-start font-normal h-8 px-2"
                                onClick={() => setLanguage('en')}
                            >
                                🇺🇸 English
                            </Button>
                            <Button
                                variant="ghost"
                                className="justify-start font-normal h-8 px-2"
                                onClick={() => setLanguage('zh')}
                            >
                                🇨🇳 中文
                            </Button>
                            <Button
                                variant="ghost"
                                className="justify-start font-normal h-8 px-2"
                                onClick={() => setLanguage('ja')}
                            >
                                🇯🇵 日本語
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
                <Button
                    variant="outline"
                    onClick={handleImportClick}
                    disabled={isImporting}
                    className="h-10 px-4 shadow-sm transition-all active:scale-95"
                >
                    <Upload className="mr-2 h-4 w-4 text-primary" />
                    {isImporting ? 'Importing...' : 'Import JSON'}
                </Button>
                <Button
                    variant="outline"
                    onClick={openCreateModal}
                    className="h-10 px-4 transition-all active:scale-95"
                >
                    <Plus className="mr-2 h-4 w-4" /> Create Set
                </Button>
            </PageHeader>

            <ScrollArea className="flex-1 min-h-0 -mr-4 pr-4">
                <div className="flex flex-col gap-8 pb-8">
                    {/* Built-in Sections */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">
                                Standard Benchmarks
                            </h2>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                            {allSets.map((set) => (
                                <Card
                                    key={set.id}
                                    className="group relative border-none bg-muted/30 shadow-none hover:bg-muted/50 transition-all hover:translate-y-[-2px] hover:shadow-lg"
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="p-2 rounded-lg bg-background shadow-sm shrink-0">
                                                    {set.id.includes(
                                                        'logic'
                                                    ) && (
                                                        <BrainCircuit className="h-4 w-4 text-blue-500" />
                                                    )}
                                                    {set.id.includes(
                                                        'creative'
                                                    ) && (
                                                        <Sparkles className="h-4 w-4 text-amber-500" />
                                                    )}
                                                    {set.id.includes(
                                                        'coding'
                                                    ) && (
                                                        <Code2 className="h-4 w-4 text-emerald-500" />
                                                    )}
                                                    {set.id.includes(
                                                        'roleplay'
                                                    ) && (
                                                        <CheckCircle2 className="h-4 w-4 text-purple-500" />
                                                    )}
                                                    {!set.id.startsWith(
                                                        'builtin'
                                                    ) && (
                                                        <FileJson className="h-4 w-4 text-primary" />
                                                    )}
                                                </div>
                                                <CardTitle className="text-base truncate">
                                                    {set.name}
                                                </CardTitle>
                                            </div>

                                            <div className="flex gap-1 shrink-0">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                                                    onClick={() =>
                                                        openEditModal(set)
                                                    }
                                                    title="Edit"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                                                    onClick={() =>
                                                        handleExport(set)
                                                    }
                                                    title="Export to JSON"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                                {!set.id.startsWith(
                                                    'builtin'
                                                ) ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                                                        onClick={() =>
                                                            deleteTestSet(
                                                                set.id
                                                            )
                                                        }
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    storedSets.some(
                                                        (s) => s.id === set.id
                                                    ) && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                                                            onClick={() =>
                                                                deleteTestSet(
                                                                    set.id
                                                                )
                                                            }
                                                            title="Reset to default"
                                                        >
                                                            <RotateCcw className="h-4 w-4" />
                                                        </Button>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                        <CardDescription className="pl-12">
                                            {set.cases.length} evaluation cases
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pl-12">
                                        <div className="space-y-2 mb-4">
                                            {set.cases.slice(0, 3).map((c) => (
                                                <div
                                                    key={c.id}
                                                    className="group/item flex items-center justify-between gap-4 text-xs bg-background/50 p-2 rounded-md hover:bg-background border border-transparent hover:border-border transition-all cursor-pointer"
                                                    onClick={() =>
                                                        handleRunSingle(
                                                            c.prompt
                                                        )
                                                    }
                                                >
                                                    <span className="truncate flex-1 italic text-muted-foreground">
                                                        "{c.prompt}"
                                                    </span>
                                                    <Play className="h-3 w-3 text-primary opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                                </div>
                                            ))}
                                            {set.cases.length > 3 && (
                                                <div
                                                    className="text-[10px] text-muted-foreground/50 text-center italic cursor-pointer hover:text-primary transition-colors"
                                                    onClick={() =>
                                                        openEditModal(set)
                                                    }
                                                >
                                                    + {set.cases.length - 3}{' '}
                                                    more cases
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            className="w-full bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border-none transition-all font-semibold"
                                            onClick={() => handleRunTest(set)}
                                            disabled={runningSetId === set.id}
                                        >
                                            {runningSetId === set.id ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Play className="mr-2 h-4 w-4" />
                                            )}
                                            Run Batch Evaluation
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {!storedSets.length && (
                        <div className="flex flex-col items-center justify-center p-12 bg-muted/10 border-2 border-dashed rounded-xl">
                            <Upload className="h-10 w-10 text-muted-foreground/30 mb-4" />
                            <h3 className="text-lg font-semibold text-muted-foreground">
                                Import Custom Tests
                            </h3>
                            <p className="text-sm text-muted-foreground/60 max-w-xs text-center mt-2">
                                Drag and drop your JSON benchmark files here to
                                run custom evaluations.
                            </p>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-3xl bg-card border border-border/50 shadow-2xl rounded-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-border/50 flex justify-between items-center bg-muted/10">
                            <div>
                                <h2 className="text-xl font-bold tracking-tight">
                                    {editingSetId
                                        ? 'Edit Test Set'
                                        : 'Create Test Set'}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Configure your test cases and prompts.
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsEditing(false)}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        <div className="p-6 flex-1 overflow-auto space-y-6">
                            <div className="space-y-2">
                                <Label>Set Name</Label>
                                <Input
                                    value={editForm.name}
                                    onChange={(e) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            name: e.target.value
                                        }))
                                    }
                                    placeholder="e.g. Challenging Logic Puzzles"
                                    className="font-bold"
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <Label>
                                        Test Cases ({editForm.cases.length})
                                    </Label>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={addCase}
                                    >
                                        <Plus className="h-3 w-3 mr-2" /> Add
                                        Case
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    {editForm.cases.map((c, idx) => (
                                        <div
                                            key={c.id}
                                            className="flex gap-3 items-start group"
                                        >
                                            <span className="text-xs text-muted-foreground pt-3 w-6 text-center">
                                                {idx + 1}
                                            </span>
                                            <div className="flex-1">
                                                <Input
                                                    value={c.prompt}
                                                    onChange={(e) =>
                                                        updateCase(
                                                            c.id,
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Enter test prompt..."
                                                />
                                            </div>
                                            <div className="flex gap-1 shrink-0 mt-[2px]">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-primary hover:bg-primary/10 transition-colors"
                                                    onClick={() =>
                                                        handleRunSingle(
                                                            c.prompt
                                                        )
                                                    }
                                                    title="Run this case"
                                                >
                                                    <Play className="h-4 w-4" />
                                                </Button>
                                                <div className="flex flex-col gap-0.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-4 w-6 p-0 text-muted-foreground hover:text-foreground"
                                                        onClick={() =>
                                                            moveCase(idx, 'up')
                                                        }
                                                        disabled={idx === 0}
                                                    >
                                                        <ArrowUp className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-4 w-6 p-0 text-muted-foreground hover:text-foreground"
                                                        onClick={() =>
                                                            moveCase(
                                                                idx,
                                                                'down'
                                                            )
                                                        }
                                                        disabled={
                                                            idx ===
                                                            editForm.cases
                                                                .length -
                                                                1
                                                        }
                                                    >
                                                        <ArrowDown className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                                                    onClick={() =>
                                                        removeCase(c.id)
                                                    }
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {editForm.cases.length === 0 && (
                                        <div className="text-center py-8 text-muted-foreground italic bg-muted/20 rounded-lg">
                                            No test cases yet. Click "Add Case"
                                            to start.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-border/50 bg-muted/10 flex justify-end gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => setIsEditing(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={saveTestSet}
                                disabled={
                                    !editForm.name ||
                                    editForm.cases.filter((c) =>
                                        c.prompt.trim()
                                    ).length === 0
                                }
                            >
                                <Save className="h-4 w-4 mr-2" /> Save Set
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export const Component = TestsPage
