import { useCallback } from 'react'
import { useAssistantStore } from '../store/assistantStore'
import { getAssistantEngine } from '../core/AssistantEngine'

/**
 * 助手交互 Hook
 */
export function useAssistant() {
  const store = useAssistantStore()

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || store.isLoading) return

    store.setLoading(true)
    store.setError(null)

    try {
      const engine = getAssistantEngine()
      for await (const _ of engine.processMessage(content)) {
        // 处理事件
      }
    } catch (error) {
      store.setError((error as Error).message)
    } finally {
      store.setLoading(false)
    }
  }, [store])

  const abort = useCallback(async () => {
    await store.abortAllSessions()
    store.setLoading(false)
  }, [store])

  return {
    // 状态
    messages: store.messages,
    isLoading: store.isLoading,
    error: store.error,
    sessions: store.getAllClaudeCodeSessions(),
    runningSessions: store.getRunningSessions(),

    // 操作
    sendMessage,
    abort,
    clearMessages: store.clearMessages,

    // UI
    executionPanelExpanded: store.executionPanelExpanded,
    toggleExecutionPanel: store.toggleExecutionPanel,
  }
}
