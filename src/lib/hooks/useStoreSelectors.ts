import { useAppStore } from '@/lib/store'
import { retryResult } from '@/features/benchmark/engine'

// State selectors
export const useModels = () => useAppStore((state) => state.models)
export const useActiveModelIds = () =>
    useAppStore((state) => state.activeModelIds)
export const useSessions = () => useAppStore((state) => state.sessions)
export const useActiveSessionId = () =>
    useAppStore((state) => state.activeSessionId)
export const useGlobalConfig = () => useAppStore((state) => state.globalConfig)
export const useStreamingData = () =>
    useAppStore((state) => state.streamingData)
export const useIsProcessing = () => useAppStore((state) => state.isProcessing)
export const useMessageQueue = () => useAppStore((state) => state.messageQueue)
export const useTestSets = () => useAppStore((state) => state.testSets)
export const useTestSetOrder = () => useAppStore((state) => state.testSetOrder)
export const usePromptTemplates = () =>
    useAppStore((state) => state.promptTemplates)
export const usePendingPrompt = () =>
    useAppStore((state) => state.pendingPrompt)
export const useLanguage = () => useAppStore((state) => state.language)
export const useArenaColumns = () => useAppStore((state) => state.arenaColumns)
export const useArenaSortBy = () => useAppStore((state) => state.arenaSortBy)

// Action selectors
export const useSetPendingPrompt = () =>
    useAppStore((state) => state.setPendingPrompt)
export const useAddToQueue = () => useAppStore((state) => state.addToQueue)
export const useRemoveFromQueue = () =>
    useAppStore((state) => state.removeFromQueue)
export const useSetProcessing = () =>
    useAppStore((state) => state.setProcessing)
export const useToggleQueuePause = () =>
    useAppStore((state) => state.toggleQueuePause)
export const useReorderQueue = () => useAppStore((state) => state.reorderQueue)
export const useUpdateModel = () => useAppStore((state) => state.updateModel)
export const useUpdateResult = () => useAppStore((state) => state.updateResult)
export const useAddResult = () => useAppStore((state) => state.addResult)
export const useCreateSession = () =>
    useAppStore((state) => state.createSession)
export const useUpdateGlobalConfig = () =>
    useAppStore((state) => state.updateGlobalConfig)
export const useSetArenaColumns = () =>
    useAppStore((state) => state.setArenaColumns)
export const useSetArenaSortBy = () =>
    useAppStore((state) => state.setArenaSortBy)
export const useClearActiveSession = () =>
    useAppStore((state) => state.clearActiveSession)
export const useStopAll = () => useAppStore((state) => state.stopAll)
export const useToggleModelActivation = () =>
    useAppStore((state) => state.toggleModelActivation)
export const useToggleAllModels = () =>
    useAppStore((state) => state.toggleAllModels)
export const useReorderModels = () =>
    useAppStore((state) => state.reorderModels)
export const useSetModels = () => useAppStore((state) => state.setModels)
export const useImportModels = () => useAppStore((state) => state.importModels)
export const useDeleteModel = () => useAppStore((state) => state.deleteModel)
export const useAddModel = () => useAppStore((state) => state.addModel)
export const useSetSessions = () => useAppStore((state) => state.setSessions)
export const useClearSessions = () =>
    useAppStore((state) => state.clearSessions)
export const useSetLanguage = () => useAppStore((state) => state.setLanguage)
export const useSetTestSets = () => useAppStore((state) => state.setTestSets)
export const useUpdateTestSet = () =>
    useAppStore((state) => state.updateTestSet)
export const useAddTestSet = () => useAppStore((state) => state.addTestSet)
export const useDeleteTestSet = () =>
    useAppStore((state) => state.deleteTestSet)
export const useSetTestSetOrder = () =>
    useAppStore((state) => state.setTestSetOrder)
export const useSetPromptTemplates = () =>
    useAppStore((state) => state.setPromptTemplates)
export const useAddPromptTemplate = () =>
    useAppStore((state) => state.addPromptTemplate)
export const useUpdatePromptTemplate = () =>
    useAppStore((state) => state.updatePromptTemplate)
export const useDeletePromptTemplate = () =>
    useAppStore((state) => state.deletePromptTemplate)
export const useReorderPromptTemplates = () =>
    useAppStore((state) => state.reorderPromptTemplates)
export const useClearStreamingData = () =>
    useAppStore((state) => state.clearStreamingData)
export const useSetStreamingData = () =>
    useAppStore((state) => state.setStreamingData)
export const useSetBatchedStreamingData = () =>
    useAppStore((state) => state.setBatchedStreamingData)
export const useClearAllResults = () =>
    useAppStore((state) => state.clearAllResults)
export const useClearModelResults = () =>
    useAppStore((state) => state.clearModelResults)
export const useExportData = () => useAppStore((state) => state.exportData)
export const useImportData = () => useAppStore((state) => state.importData)

// Engine function (not a store action, re-exported for convenience)
export { retryResult as useRetryResult }
