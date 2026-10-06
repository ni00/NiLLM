import { useAppStore } from '@/lib/store'

export const useModels = () => useAppStore((state) => state.models)
export const useActiveModelIds = () =>
    useAppStore((state) => state.activeModelIds)
export const useSessions = () => useAppStore((state) => state.sessions)
export const useActiveSessionId = () =>
    useAppStore((state) => state.activeSessionId)
export const useGlobalConfig = () => useAppStore((state) => state.globalConfig)
export const useIsProcessing = () => useAppStore((state) => state.isProcessing)
export const useMessageQueue = () => useAppStore((state) => state.messageQueue)
export const useTestSets = () => useAppStore((state) => state.testSets)
export const usePendingPrompt = () =>
    useAppStore((state) => state.pendingPrompt)
export const useArenaColumns = () => useAppStore((state) => state.arenaColumns)
export const useArenaSortBy = () => useAppStore((state) => state.arenaSortBy)

export const useSetPendingPrompt = () =>
    useAppStore((state) => state.setPendingPrompt)
export const useAddToQueue = () => useAppStore((state) => state.addToQueue)
export const useAddRetryToQueue = () =>
    useAppStore((state) => state.addRetryToQueue)
export const useFailQueueItem = () =>
    useAppStore((state) => state.failQueueItem)
export const useRemoveFromQueue = () =>
    useAppStore((state) => state.removeFromQueue)
export const useSetProcessing = () =>
    useAppStore((state) => state.setProcessing)
export const useUpdateModel = () => useAppStore((state) => state.updateModel)
export const useUpdateResult = () => useAppStore((state) => state.updateResult)
export const useClearActiveSession = () =>
    useAppStore((state) => state.clearActiveSession)
export const useStopAll = () => useAppStore((state) => state.stopAll)
export const useClearSessions = () =>
    useAppStore((state) => state.clearSessions)
export const useClearModelResults = () =>
    useAppStore((state) => state.clearModelResults)
export const useExperimentRuns = () =>
    useAppStore((state) => state.experimentRuns)
