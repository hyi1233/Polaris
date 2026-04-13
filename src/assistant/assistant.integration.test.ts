/**
 * 集成测试 - AI 助手后台执行与会话管理
 *
 * 测试场景：
 * 1. 后台执行完整流程
 * 2. 会话状态管理
 * 3. 执行面板交互
 *
 * 注意：此测试使用真实的 assistantStore，mock 只针对外部依赖
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAssistantStore, initializeAssistantStore } from './store/assistantStore'
import type { ClaudeCodeExecutionEvent } from './types'

// ============================================
// Mock 外部依赖
// ============================================

// Mock sessionStoreManager
vi.mock('../stores/conversationStore', () => ({
  sessionStoreManager: {
    getState: () => ({
      createSession: vi.fn(() => 'mock-session'),
      getStore: vi.fn(() => ({
        sendMessage: vi.fn(),
      })),
      deleteSession: vi.fn(),
      interruptSession: vi.fn(),
    }),
  },
}))

// Mock EventBus
vi.mock('../ai-runtime', () => ({
  getEventBus: () => ({
    onAny: vi.fn(() => vi.fn()),
    emit: vi.fn(),
  }),
}))

// Mock OpenAIProtocolEngine
vi.mock('../engines/openai-protocol', () => ({
  OpenAIProtocolEngine: vi.fn().mockImplementation(() => ({
    setTools: vi.fn(),
    createSession: vi.fn(() => ({
      run: vi.fn(async function* () {
        yield { type: 'assistant_message', content: 'Hello', isDelta: true }
        yield { type: 'session_end', sessionId: 'test' }
      }),
    })),
    cleanup: vi.fn(),
  })),
}))

// ============================================
// 测试用例
// ============================================

describe('Background Execution Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // 重置 store 到初始状态
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

  describe('后台执行模式', () => {
    it('应在后台执行时不阻塞主流程', async () => {
      const store = useAssistantStore.getState()

      // 创建后台会话
      const sessionId = store.createClaudeCodeSession('background', '测试后台任务')

      // 验证会话创建
      const session = store.getClaudeCodeSession(sessionId)
      expect(session).toBeDefined()
      expect(session?.type).toBe('background')
      expect(session?.status).toBe('idle')
    })

    it('应正确跟踪后台会话事件', async () => {
      const store = useAssistantStore.getState()
      const sessionId = store.createClaudeCodeSession('background', '测试')

      // 模拟执行事件
      const event1: ClaudeCodeExecutionEvent = {
        type: 'assistant_message',
        timestamp: Date.now(),
        sessionId,
        data: { content: 'Processing...', isDelta: true },
      }

      const event2: ClaudeCodeExecutionEvent = {
        type: 'session_end',
        timestamp: Date.now(),
        sessionId,
        data: {},
      }

      store.addSessionEvent(sessionId, event1)
      store.addSessionEvent(sessionId, event2)

      // 验证事件已记录
      const session = useAssistantStore.getState().getClaudeCodeSession(sessionId)
      expect(session?.events).toHaveLength(2)
    })
  })

  describe('会话状态管理', () => {
    it('应正确跟踪运行中的会话', async () => {
      const store = useAssistantStore.getState()

      // 创建多个会话
      const primaryId = store.createClaudeCodeSession('primary', '主会话')
      const bgId = store.createClaudeCodeSession('background', '后台任务')

      // 初始状态都是 idle
      let running = useAssistantStore.getState().getRunningSessions()
      expect(running).toHaveLength(0)

      // 更新一个会话为 running
      store.updateSessionStatus(bgId, 'running')
      running = useAssistantStore.getState().getRunningSessions()
      expect(running).toHaveLength(1)
      expect(running[0].id).toBe(bgId)

      // 更新另一个也为 running
      store.updateSessionStatus(primaryId, 'running')
      running = useAssistantStore.getState().getRunningSessions()
      expect(running).toHaveLength(2)
    })

    it('应支持中止所有会话', async () => {
      const store = useAssistantStore.getState()

      store.createClaudeCodeSession('primary', '主会话')
      store.createClaudeCodeSession('analysis', '分析任务')

      // 中止所有
      await store.abortAllSessions()

      // 验证所有会话都变为 idle 或 completed
      const sessions = useAssistantStore.getState().getAllClaudeCodeSessions()
      sessions.forEach((s) => {
        expect(['idle', 'completed', 'error']).toContain(s.status)
      })
    })
  })
})

describe('Execution Panel Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  it('应支持展开/收起执行面板', async () => {
    const store = useAssistantStore.getState()

    expect(useAssistantStore.getState().executionPanelExpanded).toBe(false)

    store.toggleExecutionPanel()
    expect(useAssistantStore.getState().executionPanelExpanded).toBe(true)

    store.toggleExecutionPanel()
    expect(useAssistantStore.getState().executionPanelExpanded).toBe(false)
  })

  it('应在初始化时创建主会话', async () => {
    initializeAssistantStore()

    const sessions = useAssistantStore.getState().getAllClaudeCodeSessions()
    expect(sessions.length).toBeGreaterThan(0)

    // 主会话应该是 primary 类型
    const primarySession = sessions.find(s => s.type === 'primary')
    expect(primarySession).toBeDefined()
    expect(primarySession?.label).toBe('主会话')
  })
})
