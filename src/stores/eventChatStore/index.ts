/**
 * EventChatStore - 事件驱动的聊天状态管理
 *
 * 基于 Zustand slice 模式组织代码，将大型 store 拆分为多个职责单一的 slice。
 *
 * 架构说明：
 * 1. Tauri 'chat-event' → EventRouter → AIEvent（后端已转换）
 * 2. EventBus.emit() → DeveloperPanel（调试面板）
 * 3. handleAIEvent() → 本地状态更新
 *
 * Slice 结构：
 * - messageSlice: 消息 CRUD 和流式消息构建
 * - sessionSlice: 会话状态（ID、流式状态、错误）
 * - historySlice: 存储持久化和历史管理
 * - eventHandlerSlice: 事件监听和消息发送
 * - dependencySlice: 依赖注入（解耦 Store 间依赖）
 *
 * 持久化策略：
 * - 使用 zustand persist 中间件自动持久化会话元数据
 * - 只持久化 conversationId 和 currentConversationSeed
 * - 消息数据通过 historySlice 的 saveToHistory() 手动保存到历史
 * - 运行时状态（isStreaming, currentMessage 等）不持久化
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EventChatState } from './types'
import { createMessageSlice } from './messageSlice'
import { createSessionSlice } from './sessionSlice'
import { createHistorySlice } from './historySlice'
import { createEventHandlerSlice } from './eventHandlerSlice'
import { createDependencySlice } from './dependencySlice'

/** 持久化存储名称 */
export const PERSIST_STORAGE_NAME = 'event-chat-store'

/** 持久化版本号 */
export const PERSIST_VERSION = 1

/**
 * 事件驱动的 Chat Store
 *
 * 组合所有 slice 创建统一的 store，使用 persist 中间件自动持久化
 */
export const useEventChatStore = create<EventChatState>()(
  persist(
    (...a) => ({
      ...createMessageSlice(...a),
      ...createSessionSlice(...a),
      ...createHistorySlice(...a),
      ...createEventHandlerSlice(...a),
      ...createDependencySlice(...a),
    }),
    {
      name: PERSIST_STORAGE_NAME,
      version: PERSIST_VERSION,
      // 只持久化会话元数据，不持久化消息和运行时状态
      partialize: (state) => ({
        conversationId: state.conversationId,
        currentConversationSeed: state.currentConversationSeed,
      }),
    }
  )
)

// 导出类型
export type {
  EventChatState,
  MessageState,
  SessionState,
  EventHandlerState,
  HistoryState,
  DependencyState,
  DependencyActions,
  CurrentAssistantMessage,
  UnifiedHistoryItem,
  ProviderSessionCache,
  ExternalDependencies,
  ToolPanelActions,
  GitActions,
  ConfigActions,
  WorkspaceActions,
} from './types'

// 导出常量
export {
  MAX_MESSAGES,
  MESSAGE_ARCHIVE_THRESHOLD,
  BATCH_LOAD_COUNT,
  SESSION_HISTORY_KEY,
  MAX_SESSION_HISTORY,
} from './types'
