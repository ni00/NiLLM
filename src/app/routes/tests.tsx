import { useState, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { broadcastMessage } from '@/features/benchmark/engine'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Box, Upload, Play, Trash2, FileJson, Plus } from 'lucide-react'
import { useNavigate } from 'react-router'
import { TestSet, TestCase } from '@/lib/types'

export function TestsPage() {
    const {
        testSets,
        addTestSet,
        deleteTestSet,
        createSession,
        activeModelIds
    } = useAppStore()
    const navigate = useNavigate()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isImporting, setIsImporting] = useState(false)

    const handleImportClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsImporting(true)
        try {
            const text = await file.text()
            const data = JSON.parse(text)

            // Simple validation
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
                    prompt: c.prompt || c, // Handle both object and string array
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
        if (
            confirm(
                `Run ${testSet.cases.length} prompts against all active models? This might take a while.`
            )
        ) {
            // Create a dedicated session for this run
            const sessionId = createSession(
                `Batch: ${testSet.name}`,
                activeModelIds
            )

            // Navigate immediately to watch progress
            navigate('/')

            // Execute in background (sequential to avoid rate limits?)
            // Let's do sequential for safety
            for (const testCase of testSet.cases) {
                try {
                    await broadcastMessage(testCase.prompt, sessionId)
                } catch (e) {
                    console.error(e)
                }
            }
        }
    }

    return (
        <div className="flex flex-col h-full gap-4 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Test Sets
                    </h1>
                    <p className="text-muted-foreground">
                        Manage and run batch benchmarks.
                    </p>
                </div>
                <div className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".json,.txt"
                    />
                    <Button
                        variant="outline"
                        onClick={handleImportClick}
                        disabled={isImporting}
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        {isImporting ? 'Importing...' : 'Import JSON'}
                    </Button>
                    {/* Placeholder for Manual Create */}
                    <Button disabled variant="secondary">
                        <Plus className="mr-2 h-4 w-4" /> Create
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1">
                {testSets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center opacity-60">
                        <Box className="h-16 w-16 mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-medium">No Test Sets</h3>
                        <p className="max-w-sm text-sm text-muted-foreground mt-2">
                            Import a JSON file to get started. Structure: <br />
                            <code>{`{ "name": "My Test", "cases": [{ "prompt": "..." }] }`}</code>
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {testSets.map((set) => (
                            <Card key={set.id} className="group relative">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-base truncate pr-8">
                                            {set.name}
                                        </CardTitle>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 absolute top-4 right-4 text-muted-foreground hover:text-destructive"
                                            onClick={() =>
                                                deleteTestSet(set.id)
                                            }
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <CardDescription>
                                        {set.cases.length} test cases
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded mb-4 max-h-[100px] overflow-hidden">
                                        {set.cases.slice(0, 3).map((c) => (
                                            <div
                                                key={c.id}
                                                className="truncate"
                                            >
                                                • {c.prompt}
                                            </div>
                                        ))}
                                        {set.cases.length > 3 && <div>...</div>}
                                    </div>
                                    <Button
                                        className="w-full"
                                        onClick={() => handleRunTest(set)}
                                    >
                                        <Play className="mr-2 h-4 w-4" /> Run
                                        Batch
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}

export const Component = TestsPage
