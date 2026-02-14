import { useState, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { useNavigate } from 'react-router'
import { TestSet } from '@/lib/types'

export interface TestSetForm {
    name: string
    cases: { id: string; prompt: string }[]
}

export function useTestSets() {
    const {
        addTestSet,
        deleteTestSet,
        updateTestSet,

        setTestSetOrder,
        createSession,
        activeModelIds,
        addToQueue,
        language,
        setLanguage,
        testSets: storedSets,
        testSetOrder
    } = useAppStore()
    const navigate = useNavigate()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isImporting, setIsImporting] = useState(false)
    const [runningSetId, setRunningSetId] = useState<string | null>(null)
    const isRunningRef = useRef(false)

    const [isEditing, setIsEditing] = useState(false)
    const [editingSetId, setEditingSetId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<TestSetForm>({
        name: '',
        cases: []
    })

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

    const handleImportClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsImporting(true)
        try {
            const { readJsonFile } = await import('@/lib/utils')
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

    const handleExport = async (set: TestSet) => {
        const { downloadJson } = await import('@/lib/utils')
        await downloadJson(
            set,
            `${set.name.toLowerCase().replace(/\s+/g, '_')}.json`
        )
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
            const sessionId = createSession(
                `Batch Run: ${testSet.name}`,
                activeModelIds
            )

            testSet.cases.forEach((testCase) => {
                addToQueue(testCase.prompt, sessionId)
            })

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

    return {
        fileInputRef,
        isImporting,
        runningSetId,
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
        setTestSetOrder
    }
}
