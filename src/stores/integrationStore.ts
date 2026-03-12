/**
 * 集成状态管理 Store
 *
 * 管理平台集成的连接状态、消息收发等。
 */

import { create } from 'zustand';
import type {
  Platform,
  IntegrationStatus,
  IntegrationMessage,
  IntegrationSession,
  SendTarget,
  MessageContent,
  QQBotConfig,
} from '../types';
import {
  startIntegration,
  stopIntegration,
  getIntegrationStatus,
  getAllIntegrationStatus,
  sendIntegrationMessage,
  getIntegrationSessions,
  initIntegration,
  onIntegrationMessage,
} from '../services/tauri';

interface IntegrationState {
  // 状态
  platforms: Record<Platform, IntegrationStatus>;
  messages: IntegrationMessage[];
  sessions: IntegrationSession[];
  initialized: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  initialize: (qqbotConfig: QQBotConfig | null) => Promise<void>;
  startPlatform: (platform: Platform) => Promise<void>;
  stopPlatform: (platform: Platform) => Promise<void>;
  sendMessage: (platform: Platform, target: SendTarget, content: MessageContent) => Promise<void>;
  refreshStatus: (platform: Platform) => Promise<void>;
  refreshAllStatus: () => Promise<void>;
  refreshSessions: () => Promise<void>;
  clearMessages: () => void;
  _addMessage: (message: IntegrationMessage) => void;
  _updateStatus: (platform: Platform, status: IntegrationStatus) => void;
}

export const useIntegrationStore = create<IntegrationState>((set, get) => ({
  // 初始状态
  platforms: {} as Record<Platform, IntegrationStatus>,
  messages: [],
  sessions: [],
  initialized: false,
  loading: false,
  error: null,

  // 初始化
  initialize: async (qqbotConfig) => {
    if (get().initialized) return;

    set({ loading: true, error: null });

    try {
      // 初始化集成管理器
      await initIntegration(qqbotConfig);

      // 监听消息事件
      const unlisten = await onIntegrationMessage((message) => {
        get()._addMessage(message);
      });

      // 获取初始状态
      const statuses = await getAllIntegrationStatus();
      const platforms = Object.entries(statuses).reduce((acc, [key, value]) => {
        acc[key as Platform] = value;
        return acc;
      }, {} as Record<Platform, IntegrationStatus>);

      set({
        platforms,
        initialized: true,
        loading: false,
      });

      // 存储 unlisten 函数以便清理
      (window as unknown as { __integrationUnlisten?: () => void }).__integrationUnlisten = unlisten;

      console.log('[IntegrationStore] Initialized');
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '初始化失败',
        loading: false,
      });
      console.error('[IntegrationStore] Initialize error:', error);
    }
  },

  // 启动平台
  startPlatform: async (platform) => {
    set({ loading: true, error: null });

    try {
      await startIntegration(platform);
      await get().refreshStatus(platform);
      set({ loading: false });
      console.log(`[IntegrationStore] Platform ${platform} started`);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '启动失败',
        loading: false,
      });
      console.error(`[IntegrationStore] Start ${platform} error:`, error);
    }
  },

  // 停止平台
  stopPlatform: async (platform) => {
    set({ loading: true, error: null });

    try {
      await stopIntegration(platform);
      await get().refreshStatus(platform);
      set({ loading: false });
      console.log(`[IntegrationStore] Platform ${platform} stopped`);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '停止失败',
        loading: false,
      });
      console.error(`[IntegrationStore] Stop ${platform} error:`, error);
    }
  },

  // 发送消息
  sendMessage: async (platform, target, content) => {
    try {
      await sendIntegrationMessage(platform, target, content);
      console.log(`[IntegrationStore] Message sent to ${platform}`);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '发送失败',
      });
      console.error(`[IntegrationStore] Send message error:`, error);
      throw error;
    }
  },

  // 刷新状态
  refreshStatus: async (platform) => {
    try {
      const status = await getIntegrationStatus(platform);
      if (status) {
        get()._updateStatus(platform, status);
      }
    } catch (error) {
      console.error(`[IntegrationStore] Refresh ${platform} status error:`, error);
    }
  },

  // 刷新所有状态
  refreshAllStatus: async () => {
    try {
      const statuses = await getAllIntegrationStatus();
      const platforms = Object.entries(statuses).reduce((acc, [key, value]) => {
        acc[key as Platform] = value;
        return acc;
      }, {} as Record<Platform, IntegrationStatus>);
      set({ platforms });
    } catch (error) {
      console.error('[IntegrationStore] Refresh all status error:', error);
    }
  },

  // 刷新会话列表
  refreshSessions: async () => {
    try {
      const sessions = await getIntegrationSessions();
      set({ sessions });
    } catch (error) {
      console.error('[IntegrationStore] Refresh sessions error:', error);
    }
  },

  // 清空消息
  clearMessages: () => {
    set({ messages: [] });
  },

  // 内部方法：添加消息
  _addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message].slice(-500), // 保留最近 500 条
    }));
  },

  // 内部方法：更新状态
  _updateStatus: (platform, status) => {
    set((state) => ({
      platforms: {
        ...state.platforms,
        [platform]: status,
      },
    }));
  },
}));

// 选择器
export const useIntegrationStatus = (platform: Platform) =>
  useIntegrationStore((state) => state.platforms[platform]);

export const useIntegrationMessages = () =>
  useIntegrationStore((state) => state.messages);

export const useIntegrationSessions = () =>
  useIntegrationStore((state) => state.sessions);

export const useIntegrationLoading = () =>
  useIntegrationStore((state) => state.loading);

export const useIntegrationError = () =>
  useIntegrationStore((state) => state.error);
