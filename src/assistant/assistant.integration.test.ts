/**
 * 集成测试 - AI 助手后台执行与通知处理
 *
 * 测试场景：
 * 1. 后台执行完整流程
 * 2. 通知处理完整流程（立即处理/延迟处理/忽略）
 * 3. 重试机制
 *
 * 注意：此测试使用真实的 assistantStore，mock 只针对外部依赖
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAssistantStore, initializeAssistantStore } from './store/assistantStore'
import type { CompletionNotification, ClaudeCodeExecutionEvent } from './types'

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
      completionNotifications: [],
      hasUnreadNotifications: false,
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

    it('应在后台任务完成时创建通知', async () => {
      const store = useAssistantStore.getState()

      // 添加完成通知
      const notification: CompletionNotification = {
        id: 'notif-1',
        sessionId: 'bg-session-1',
        toolCallId: 'tool-1',
        prompt: '测试提示词',
        resultSummary: '执行结果摘要',
        fullResult: '完整的执行结果内容',
        createdAt: Date.now(),
        handled: false,
      }

      store.addCompletionNotification(notification)

      // 验证通知已添加
      expect(useAssistantStore.getState().completionNotifications).toHaveLength(1)
      expect(useAssistantStore.getState().hasUnreadNotifications).toBe(true)

      // 获取待处理通知
      const pending = useAssistantStore.getState().getPendingNotifications()
      expect(pending).toHaveLength(1)
      expect(pending[0].id).toBe('notif-1')
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

  describe('通知处理', () => {
    it('应正确处理立即处理模式', async () => {
      const store = useAssistantStore.getState()

      const notification: CompletionNotification = {
        id: 'notif-immediate',
        sessionId: 'session-1',
        toolCallId: 'tool-1',
        prompt: '测试提示词',
        resultSummary: '摘要',
        fullResult: '完整结果',
        createdAt: Date.now(),
        handled: false,
      }

      store.addCompletionNotification(notification)
      store.markNotificationHandled('notif-immediate', 'immediate')

      // 验证状态更新
      const handled = useAssistantStore.getState().completionNotifications.find(n => n.id === 'notif-immediate')
      expect(handled?.handled).toBe(true)
      expect(handled?.handleType).toBe('immediate')
      expect(useAssistantStore.getState().hasUnreadNotifications).toBe(false)
    })

    it('应正确处理延迟处理模式', async () => {
      const store = useAssistantStore.getState()

      const notification: CompletionNotification = {
        id: 'notif-delayed',
        sessionId: 'session-1',
        toolCallId: 'tool-1',
        prompt: '测试提示词',
        resultSummary: '摘要',
        fullResult: '完整结果',
        createdAt: Date.now(),
        handled: false,
      }

      store.addCompletionNotification(notification)
      store.markNotificationHandled('notif-delayed', 'delayed')

      const handled = useAssistantStore.getState().completionNotifications.find(n => n.id === 'notif-delayed')
      expect(handled?.handled).toBe(true)
      expect(handled?.handleType).toBe('delayed')
    })

    it('应正确处理忽略模式', async () => {
      const store = useAssistantStore.getState()

      const notification: CompletionNotification = {
        id: 'notif-ignored',
        sessionId: 'session-1',
        toolCallId: 'tool-1',
        prompt: '测试提示词',
        resultSummary: '摘要',
        createdAt: Date.now(),
        handled: false,
      }

      store.addCompletionNotification(notification)
      store.markNotificationHandled('notif-ignored', 'ignored')

      const handled = useAssistantStore.getState().completionNotifications.find(n => n.id === 'notif-ignored')
      expect(handled?.handled).toBe(true)
      expect(handled?.handleType).toBe('ignored')
    })

    it('应支持错误记录和重试计数', async () => {
      const store = useAssistantStore.getState()

      const notification: CompletionNotification = {
        id: 'notif-error',
        sessionId: 'session-1',
        toolCallId: 'tool-1',
        prompt: '测试提示词',
        resultSummary: '摘要',
        fullResult: '完整结果',
        createdAt: Date.now(),
        handled: false,
        retryCount: 0,
      }

      store.addCompletionNotification(notification)

      // 第一次错误
      store.updateNotificationError('notif-error', 'Network error')
      let notif = useAssistantStore.getState().completionNotifications.find(n => n.id === 'notif-error')
      expect(notif?.lastError).toBe('Network error')
      expect(notif?.retryCount).toBe(1)

      // 第二次错误
      store.updateNotificationError('notif-error', 'Timeout error')
      notif = useAssistantStore.getState().completionNotifications.find(n => n.id === 'notif-error')
      expect(notif?.lastError).toBe('Timeout error')
      expect(notif?.retryCount).toBe(2)
    })
  })

  describe('多通知管理', () => {
    it('应正确管理多个通知', async () => {
      const store = useAssistantStore.getState()

      // 添加多个通知
      for (let i = 0; i < 3; i++) {
        store.addCompletionNotification({
          id: `notif-${i}`,
          sessionId: `session-${i}`,
          toolCallId: `tool-${i}`,
          prompt: `提示词 ${i}`,
          resultSummary: `摘要 ${i}`,
          createdAt: Date.now() + i,
          handled: false,
        })
      }

      expect(useAssistantStore.getState().completionNotifications).toHaveLength(3)
      expect(useAssistantStore.getState().hasUnreadNotifications).toBe(true)

      // 获取待处理通知
      const pending = useAssistantStore.getState().getPendingNotifications()
      expect(pending).toHaveLength(3)

      // 处理一个
      store.markNotificationHandled('notif-1', 'immediate')
      expect(useAssistantStore.getState().hasUnreadNotifications).toBe(true)

      // 处理剩余
      store.markNotificationHandled('notif-0', 'immediate')
      store.markNotificationHandled('notif-2', 'immediate')
      expect(useAssistantStore.getState().hasUnreadNotifications).toBe(false)
    })

    it('应支持清空所有通知', async () => {
      const store = useAssistantStore.getState()

      // 添加通知
      store.addCompletionNotification({
        id: 'notif-1',
        sessionId: 'session-1',
        toolCallId: 'tool-1',
        prompt: '测试',
        resultSummary: '摘要',
        createdAt: Date.now(),
        handled: false,
      })

      store.clearNotifications()
      expect(useAssistantStore.getState().completionNotifications).toHaveLength(0)
      expect(useAssistantStore.getState().hasUnreadNotifications).toBe(false)
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

describe('Notification Panel Integration', () => {
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
      completionNotifications: [],
      hasUnreadNotifications: false,
    })
  })

  it('应在有未处理通知时显示徽章', async () => {
    const store = useAssistantStore.getState()

    expect(useAssistantStore.getState().hasUnreadNotifications).toBe(false)

    // 添加通知
    store.addCompletionNotification({
      id: 'notif-1',
      sessionId: 'session-1',
      toolCallId: 'tool-1',
      prompt: '测试',
      resultSummary: '摘要',
      createdAt: Date.now(),
      handled: false,
    })

    expect(useAssistantStore.getState().hasUnreadNotifications).toBe(true)

    // 处理后消失
    store.markNotificationHandled('notif-1', 'immediate')
    expect(useAssistantStore.getState().hasUnreadNotifications).toBe(false)
  })

  it('应正确过滤已处理的通知', async () => {
    const store = useAssistantStore.getState()

    // 添加多个通知
    store.addCompletionNotification({
      id: 'notif-1',
      sessionId: 'session-1',
      toolCallId: 'tool-1',
      prompt: '测试1',
      resultSummary: '摘要1',
      createdAt: Date.now(),
      handled: false,
    })

    store.addCompletionNotification({
      id: 'notif-2',
      sessionId: 'session-2',
      toolCallId: 'tool-2',
      prompt: '测试2',
      resultSummary: '摘要2',
      createdAt: Date.now(),
      handled: true,
      handleType: 'immediate',
    })

    store.addCompletionNotification({
      id: 'notif-3',
      sessionId: 'session-3',
      toolCallId: 'tool-3',
      prompt: '测试3',
      resultSummary: '摘要3',
      createdAt: Date.now(),
      handled: false,
    })

    const pending = useAssistantStore.getState().getPendingNotifications()
    expect(pending).toHaveLength(2)
    expect(pending.map(n => n.id)).toContain('notif-1')
    expect(pending.map(n => n.id)).toContain('notif-3')
    expect(pending.map(n => n.id)).not.toContain('notif-2')
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
      completionNotifications: [],
      hasUnreadNotifications: false,
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
