import { useI18n } from '@/lib/i18n'
import { z } from 'zod'
import { useState, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/lib/store'
import type { TestCase, TestSet } from '@/lib/types'
import { testSetSchema } from '@/lib/validation'
import { readJsonFile, downloadJson } from '@/lib/utils'

const rawImportedCaseSchema = z.union([
    z.string(),
    z.object({
        prompt: z.string(),
        expected: z.string().optional(),
        evaluation: z
            .object({
                type: z.enum(['exact', 'contains', 'json', 'decision']),
                tolerance: z.number().finite().nonnegative().optional()
            })
            .optional()
    })
])

export interface TestSetForm {
    name: string
    cases: TestCase[]
}

export function useTestSets() {
    const t = useI18n()
    const {
        addTestSet,
        deleteTestSet,
        updateTestSet,
        setTestSetOrder,
        language,
        setLanguage,
        testSets: storedSets,
        testSetOrder
    } = useAppStore(
        useShallow((state) => ({
            addTestSet: state.addTestSet,
            deleteTestSet: state.deleteTestSet,
            updateTestSet: state.updateTestSet,
            setTestSetOrder: state.setTestSetOrder,
            language: state.benchmarkLanguage ?? state.language,
            setLanguage: state.setBenchmarkLanguage,
            testSets: state.testSets,
            testSetOrder: state.testSetOrder
        }))
    )
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isImporting, setIsImporting] = useState(false)
    const [importError, setImportError] = useState<string | null>(null)

    const [isEditing, setIsEditing] = useState(false)
    const [editingSetId, setEditingSetId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<TestSetForm>({
        name: '',
        cases: []
    })
    const [experimentTestSet, setExperimentTestSet] = useState<TestSet | null>(
        null
    )

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
            // Expected answers and scoring rules ride along the form so
            // editing never drops them.
            cases: set.cases.map((c) => ({
                id: c.id,
                prompt: c.prompt,
                ...(c.expected !== undefined && { expected: c.expected }),
                ...(c.evaluation && {
                    evaluation: { ...c.evaluation }
                })
            }))
        })
        setIsEditing(true)
    }

    const saveTestSet = () => {
        if (!editForm.name.trim()) return
        const validCases = editForm.cases.filter((c) => c.prompt.trim())
        if (validCases.length === 0) return

        const toStoredCase = (c: TestCase): TestCase => ({
            id: c.id,
            prompt: c.prompt,
            ...(c.expected !== undefined && { expected: c.expected }),
            ...(c.evaluation && { evaluation: { ...c.evaluation } })
        })
        const draft: TestSet = {
            id: editingSetId ?? crypto.randomUUID(),
            name: editForm.name,
            cases: validCases.map(toStoredCase),
            createdAt: Date.now()
        }
        const parsed = testSetSchema.safeParse(draft)
        if (!parsed.success) return

        if (editingSetId) {
            const existsInStore = storedSets.some((s) => s.id === editingSetId)
            if (existsInStore) {
                updateTestSet(editingSetId, {
                    name: draft.name,
                    cases: draft.cases
                })
            } else {
                addTestSet({ ...draft, id: editingSetId })
            }
        } else {
            addTestSet({
                ...draft,
                cases: draft.cases.map((c) => ({
                    ...c,
                    id: crypto.randomUUID()
                }))
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

    const updateCase = (id: string, updates: Partial<TestCase>) => {
        setEditForm((prev) => ({
            ...prev,
            cases: prev.cases.map((c) =>
                c.id === id ? { ...c, ...updates } : c
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

    const handleImportClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsImporting(true)
        setImportError(null)
        try {
            const raw = z
                .object({
                    name: z.string().min(1),
                    cases: z.array(rawImportedCaseSchema)
                })
                .parse(await readJsonFile(file))

            // Normalize legacy string/object cases, then validate the whole
            // set through the shared schema (rejects blank contains expected
            // and invalid JSON rules).
            const newSet: TestSet = {
                id: crypto.randomUUID(),
                name: raw.name,
                cases: raw.cases.map((c) => ({
                    id: crypto.randomUUID(),
                    prompt: typeof c === 'string' ? c : c.prompt,
                    ...(typeof c !== 'string' &&
                        c.expected !== undefined && { expected: c.expected }),
                    ...(typeof c !== 'string' &&
                        c.evaluation && {
                            evaluation: { ...c.evaluation }
                        })
                })),
                createdAt: Date.now()
            }

            const parsed = testSetSchema.safeParse(newSet)
            if (!parsed.success) {
                setImportError(t('The file is not a valid test set.'))
                return
            }

            addTestSet(parsed.data)
        } catch (err) {
            console.error(err)
            setImportError(t('The file is not a valid test set.'))
        } finally {
            setIsImporting(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleExport = (set: TestSet) =>
        downloadJson(set, `${set.name.toLowerCase().replace(/\s+/g, '_')}.json`)

    // Batch and single-case runs both open the experiment configuration
    // dialog; nothing is silently pushed into the ordinary arena queue.
    const handleRunTest = (testSet: TestSet) => {
        setExperimentTestSet(testSet)
    }

    const handleRunSingle = (testCase: TestCase, testSet: TestSet) => {
        setExperimentTestSet({
            ...testSet,
            cases: [testCase]
        })
    }

    return {
        fileInputRef,
        isImporting,
        importError,
        clearImportError: () => setImportError(null),
        isEditing,
        editingSetId,
        editForm,
        language,
        storedSets,
        setLanguage,
        openCreateModal,
        openEditModal,
        saveTestSet,
        addCase,
        removeCase,
        updateCase,
        moveCase,
        handleImportClick,
        handleFileChange,
        handleExport,
        handleRunTest,
        handleRunSingle,
        deleteTestSet,
        setIsEditing,
        setEditForm,
        testSetOrder,
        setTestSetOrder,
        experimentTestSet,
        closeExperimentDialog: () => setExperimentTestSet(null)
    }
}
