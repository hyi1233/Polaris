/**
 * messageSlice 单元测试
 *
 * 测试消息状态管理的核心功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { create } from 'zustand'

// Mock toolPanelStore
vi.mock('../toolPanelStore', () => ({
  useToolPanelStore: {
    getState: () => ({
      addTool: vi.fn(),
      updateTool: vi.fn(),
      clearTools: vi.fn(),
    }),
  },
}))

// Mock utils module
vi.mock('./utils', () => ({
  clearFileReadCache: vi.fn(),
}))

// Mock toolSummary
vi.mock('../../utils/toolSummary', () => ({
  generateToolSummary: vi.fn(() => 'Tool summary'),
  calculateDuration: vi.fn(() => '1s'),
}))

// Import after mocking
import { createMessageSlice } from './messageSlice'
import type { EventChatState } from './types'

// 创建测试用的 store
function createTestStore() {
  return create<EventChatState>((...args) => ({
    // 最小状态集合用于测试
    messages: [],
    archivedMessages: [],
    currentMessage: null,
    toolBlockMap: new Map(),
    streamingUpdateCounter: 0,
    conversationId: null,
    currentConversationSeed: null,
    isStreaming: false,
    error: null,
    progressMessage: null,
    providerSessionCache: null,
    _eventListenersInitialized: false,
    _eventListenersCleanup: null,
    isInitialized: true,
    isLoadingHistory: false,
    isArchiveExpanded: false,
    maxMessages: 500,

    // 需要的方法
    saveToStorage: vi.fn(),

    // 应用 messageSlice
    ...createMessageSlice(...args),
  }) as any)
}

describe('messageSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock sessionStorage
    vi.stubGlobal('sessionStorage', {
      setItem: vi.fn(),
      getItem: vi.fn(() => null),
      removeItem: vi.fn(),
      clear: vi.fn(),
    })
    // Mock crypto.randomUUID
    vi.stubGlobal('crypto', {
      randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('addMessage', () => {
    it('应正确添加消息到消息列表', () => {
      const store = createTestStore()
      const message = {
        id: 'msg-1',
        type: 'user' as const,
        content: 'Hello',
        timestamp: new Date().toISOString(),
      }

      store.getState().addMessage(message)

      expect(store.getState().messages).toHaveLength(1)
      expect(store.getState().messages[0]).toEqual(message)
    })

    it('应按顺序添加多条消息', () => {
      const store = createTestStore()

      store.getState().addMessage({
        id: 'msg-1',
        type: 'user' as const,
        content: 'Hello',
        timestamp: new Date().toISOString(),
      })

      store.getState().addMessage({
        id: 'msg-2',
        type: 'assistant' as const,
        blocks: [{ type: 'text' as const, content: 'Hi there' }],
        timestamp: new Date().toISOString(),
        isStreaming: false,
      })

      expect(store.getState().messages).toHaveLength(2)
      expect(store.getState().messages[0].id).toBe('msg-1')
      expect(store.getState().messages[1].id).toBe('msg-2')
    })
  })

  describe('appendTextBlock', () => {
    it('无 currentMessage 时应创建新消息', () => {
      const store = createTestStore()

      store.getState().appendTextBlock('Hello')

      const { currentMessage } = store.getState()
      expect(currentMessage).not.toBeNull()
      expect(currentMessage?.blocks).toHaveLength(1)
      expect(currentMessage?.blocks[0]).toEqual({
        type: 'text',
        content: 'Hello',
      })
      expect(store.getState().isStreaming).toBe(true)
    })

    it('应追加到最后一个文本块', () => {
      const store = createTestStore()

      // 先添加一个文本块
      store.getState().appendTextBlock('Hello')
      // 再追加
      store.getState().appendTextBlock(' World')

      const { currentMessage } = store.getState()
      expect(currentMessage?.blocks).toHaveLength(1)
      expect((currentMessage?.blocks[0] as any).content).toBe('Hello World')
    })

    it('最后块非文本时应创建新块', () => {
      const store = createTestStore()

      // 模拟设置一个带有思考块的 currentMessage
      store.setState({
        currentMessage: {
          id: 'test-id',
          blocks: [{ type: 'thinking', content: 'Thinking...', collapsed: false }],
          isStreaming: true,
        },
      })

      store.getState().appendTextBlock('Response')

      const { currentMessage } = store.getState()
      expect(currentMessage?.blocks).toHaveLength(2)
      expect(currentMessage?.blocks[1]).toEqual({
        type: 'text',
        content: 'Response',
      })
    })
  })

  describe('appendThinkingBlock', () => {
    it('无 currentMessage 时应创建新消息', () => {
      const store = createTestStore()

      store.getState().appendThinkingBlock('Thinking...')

      const { currentMessage } = store.getState()
      expect(currentMessage).not.toBeNull()
      expect(currentMessage?.blocks).toHaveLength(1)
      expect(currentMessage?.blocks[0]).toEqual({
        type: 'thinking',
        content: 'Thinking...',
        collapsed: false,
      })
    })

    it('应追加到现有消息', () => {
      const store = createTestStore()

      store.getState().appendTextBlock('Hello')
      store.getState().appendThinkingBlock('Let me think...')

      const { currentMessage } = store.getState()
      expect(currentMessage?.blocks).toHaveLength(2)
      expect(currentMessage?.blocks[1]).toEqual({
        type: 'thinking',
        content: 'Let me think...',
        collapsed: false,
      })
    })
  })

  describe('finishMessage', () => {
    it('应将 currentMessage 标记为完成', () => {
      const store = createTestStore()

      // 设置 currentMessage
      store.setState({
        currentMessage: {
          id: 'msg-1',
          blocks: [{ type: 'text', content: 'Hello' }],
          isStreaming: true,
        },
        isStreaming: true,
      })

      store.getState().finishMessage()

      expect(store.getState().currentMessage).toBeNull()
      expect(store.getState().isStreaming).toBe(false)
    })

    it('无 currentMessage 时应重置 isStreaming 状态', () => {
      const store = createTestStore()
      store.setState({ isStreaming: true })

      store.getState().finishMessage()

      expect(store.getState().isStreaming).toBe(false)
    })
  })

  describe('appendToolCallBlock', () => {
    it('无 currentMessage 时应创建新消息', () => {
      const store = createTestStore()

      store.getState().appendToolCallBlock('tool-1', 'read_file', { path: '/test/file.ts' })

      const { currentMessage, toolBlockMap } = store.getState()
      expect(currentMessage).not.toBeNull()
      expect(currentMessage?.blocks).toHaveLength(1)
      expect(currentMessage?.blocks[0]).toMatchObject({
        type: 'tool_call',
        id: 'tool-1',
        name: 'read_file',
        status: 'pending',
      })
      expect(toolBlockMap.get('tool-1')).toBe(0)
    })

    it('应正确更新 toolBlockMap', () => {
      const store = createTestStore()

      store.getState().appendToolCallBlock('tool-1', 'read_file', { path: '/test' })
      store.getState().appendToolCallBlock('tool-2', 'write_file', { path: '/test2' })

      const { toolBlockMap } = store.getState()
      expect(toolBlockMap.get('tool-1')).toBe(0)
      expect(toolBlockMap.get('tool-2')).toBe(1)
    })
  })

  describe('updateToolCallBlock', () => {
    it('应更新工具调用块状态', () => {
      const store = createTestStore()

      // 先添加一个工具调用块
      store.getState().appendToolCallBlock('tool-1', 'read_file', { path: '/test' })

      // 更新状态
      store.getState().updateToolCallBlock('tool-1', 'success', 'file content')

      const block = store.getState().currentMessage?.blocks[0] as any
      expect(block.status).toBe('success')
      expect(block.output).toBe('file content')
    })

    it('不存在的工具 ID 应不影响状态', () => {
      const store = createTestStore()

      store.getState().appendToolCallBlock('tool-1', 'read_file', { path: '/test' })

      // 尝试更新不存在的工具
      store.getState().updateToolCallBlock('nonexistent', 'success')

      const block = store.getState().currentMessage?.blocks[0] as any
      expect(block.status).toBe('pending') // 状态不变
    })
  })
})
