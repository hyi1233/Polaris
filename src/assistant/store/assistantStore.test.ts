import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAssistantStore, initializeAssistantStore } from './assistantStore'
import type { AssistantMessage } from '../types'

// Mock ClaudeCodeSessionManager
vi.mock('../core/ClaudeCodeSessionManager', () => ({
  getClaudeCodeSessionManager: () => ({
    createSession: (type: string, label?: string) => {
      const id = type === 'primary' ? 'primary' : `${type}-${Date.now()}`
      return id
    },
    getSession: (id: string) => ({
      id,
      type: id === 'primary' ? 'primary' : 'analysis',
      status: 'idle',
      label: id === 'primary' ? '主会话' : '分析任务',
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      events: [],
    }),
    executeInSession: vi.fn(),
    abortSession: vi.fn(),
  }),
}))

describe('assistantStore', () => {
  beforeEach(() => {
    // 重置 store
    useAssistantStore.setState({
      messages: [],
      isLoading: false,
      claudeCodeSessions: new Map(),
      activeClaudeCodeSessionId: null,
      executionPanelExpanded: false,
      executionPanelSessionId: null,
      error: null,
    })
  })

  it('should add message', () => {
    const message: AssistantMessage = {
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
      timestamp: Date.now(),
    }
    useAssistantStore.getState().addMessage(message)
    expect(useAssistantStore.getState().messages).toHaveLength(1)
    expect(useAssistantStore.getState().messages[0].content).toBe('Hello')
  })

  it('should clear messages', () => {
    useAssistantStore.getState().addMessage({
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
      timestamp: Date.now(),
    })
    useAssistantStore.getState().clearMessages()
    expect(useAssistantStore.getState().messages).toHaveLength(0)
  })

  it('should set loading state', () => {
    useAssistantStore.getState().setLoading(true)
    expect(useAssistantStore.getState().isLoading).toBe(true)
  })

  it('should set error', () => {
    useAssistantStore.getState().setError('Test error')
    expect(useAssistantStore.getState().error).toBe('Test error')
  })

  it('should create primary session on initialize', () => {
    initializeAssistantStore()
    const sessions = useAssistantStore.getState().getAllClaudeCodeSessions()
    expect(sessions.length).toBeGreaterThan(0)
  })

  it('should toggle execution panel', () => {
    expect(useAssistantStore.getState().executionPanelExpanded).toBe(false)
    useAssistantStore.getState().toggleExecutionPanel()
    expect(useAssistantStore.getState().executionPanelExpanded).toBe(true)
  })
})
