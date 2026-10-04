import { useI18n } from '@/lib/i18n'
import { z } from 'zod'
import { useState, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/lib/store'
import { TestCase, TestSet } from '@/lib/types'

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
            cases: [{ id: crypto.randomUUID(), prompt: '', expected: '' }]
        })
        setIsEditing(true)
    }

    const openEditModal = (set: TestSet) => {
        setEditingSetId(set.id)
        setEditForm({
            name: set.name,
            // Expected answers ride along the form so editing never drops them.
            cases: set.cases.map((c) => ({
                id: c.id,
                prompt: c.prompt,
                expected: c.expected
            }))
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
                    prompt: c.prompt,
                    ...(c.expected !== undefined && { expected: c.expected })
                }))
            }

            if (existsInStore) {
                updateTestSet(editingSetId, updates)
            } else {
                addTestSet({
                    id: editingSetId,
                    ...updates,
                    createdAt: Date.now()
                })
            }
        } else {
            addTestSet({
                id: crypto.randomUUID(),
                name: editForm.name,
                cases: validCases.map((c) => ({
                    id: crypto.randomUUID(),
                    prompt: c.prompt,
                    ...(c.expected !== undefined && { expected: c.expected })
                })),
                createdAt: Date.now()
            })
        }
        setIsEditing(false)
    }

    const addCase = () => {
        setEditForm((prev) => ({
            ...prev,
            cases: [
                ...prev.cases,
                { id: crypto.randomUUID(), prompt: '', expected: '' }
            ]
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
        try {
            const { readJsonFile } = await import('@/lib/utils')
            const data = z
                .object({
                    name: z.string().min(1),
                    cases: z.array(
                        z.union([
                            z.string(),
                            z.object({
                                prompt: z.string(),
                                expected: z.string().optional()
                            })
                        ])
                    )
                })
                .parse(await readJsonFile(file))

            const newSet: TestSet = {
                id: crypto.randomUUID(),
                name: data.name,
                cases: data.cases.map((c) => ({
                    id: crypto.randomUUID(),
                    prompt: typeof c === 'string' ? c : c.prompt,
                    expected: typeof c === 'string' ? undefined : c.expected
                })),
                createdAt: Date.now()
            }

            addTestSet(newSet)
        } catch (err) {
            console.error(err)
            alert(t('Failed to parse file.'))
        } finally {
            setIsImporting(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleExport = async (set: TestSet) => {
        const { downloadJson } = await import('@/lib/utils')
        await downloadJson(
            set,
            `${set.name.toLowerCase().replace(/\s+/g, '_')}.json`
        )
    }

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
