/**
 * Plugin 状态管理
 *
 * 管理插件列表、市场列表和操作状态
 */

import { create } from 'zustand';
import type {
  InstalledPlugin,
  AvailablePlugin,
  Marketplace,
  PluginDetail,
  PluginScope,
} from '../types/plugin';
import * as pluginService from '../services/pluginService';
import { createLogger } from '../utils/logger';

const log = createLogger('PluginStore');

interface PluginState {
  /** 已安装插件 */
  installed: InstalledPlugin[];
  /** 可用插件 */
  available: AvailablePlugin[];
  /** 市场列表 */
  marketplaces: Marketplace[];
  /** 选中的插件 */
  selectedPlugin: PluginDetail | null;
  /** 加载状态 */
  loading: boolean;
  /** 可用插件加载状态 */
  availableLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 操作中的插件 ID */
  operatingPluginId: string | null;

  // Actions

  /** 获取已安装插件 */
  fetchInstalled: () => Promise<void>;
  /** 获取可用插件 */
  fetchAvailable: () => Promise<void>;
  /** 获取市场列表 */
  fetchMarketplaces: () => Promise<void>;
  /** 刷新所有数据 */
  refreshAll: () => Promise<void>;

  /** 选择插件 */
  selectPlugin: (plugin: PluginDetail | null) => void;
  /** 从已安装列表选择插件 */
  selectInstalledPlugin: (id: string) => void;
  /** 从可用列表选择插件 */
  selectAvailablePlugin: (id: string) => void;

  /** 安装插件 */
  installPlugin: (pluginId: string, scope?: PluginScope) => Promise<boolean>;
  /** 启用插件 */
  enablePlugin: (pluginId: string, scope?: PluginScope) => Promise<boolean>;
  /** 禁用插件 */
  disablePlugin: (pluginId: string, scope?: PluginScope) => Promise<boolean>;
  /** 更新插件 */
  updatePlugin: (pluginId: string, scope?: PluginScope) => Promise<boolean>;
  /** 卸载插件 */
  uninstallPlugin: (pluginId: string, scope?: PluginScope, keepData?: boolean) => Promise<boolean>;

  /** 添加市场 */
  addMarketplace: (source: string) => Promise<boolean>;
  /** 移除市场 */
  removeMarketplace: (name: string) => Promise<boolean>;
  /** 更新市场 */
  updateMarketplace: (name?: string) => Promise<boolean>;

  /** 清除错误 */
  clearError: () => void;
}

export const usePluginStore = create<PluginState>((set, get) => ({
  installed: [],
  available: [],
  marketplaces: [],
  selectedPlugin: null,
  loading: false,
  availableLoading: false,
  error: null,
  operatingPluginId: null,

  fetchInstalled: async () => {
    try {
      set({ loading: true, error: null });
      const result = await pluginService.pluginList(false);
      set({ installed: result.installed, loading: false });
    } catch (err) {
      log.error('获取已安装插件失败', err instanceof Error ? err : new Error(String(err)));
      set({ error: err instanceof Error ? err.message : String(err), loading: false });
    }
  },

  fetchAvailable: async () => {
    try {
      set({ availableLoading: true, error: null });
      const result = await pluginService.pluginList(true);
      set({ available: result.available || [], availableLoading: false });
    } catch (err) {
      log.error('获取可用插件失败', err instanceof Error ? err : new Error(String(err)));
      set({ error: err instanceof Error ? err.message : String(err), availableLoading: false });
    }
  },

  fetchMarketplaces: async () => {
    try {
      const marketplaces = await pluginService.marketplaceList();
      set({ marketplaces });
    } catch (err) {
      log.error('获取市场列表失败', err instanceof Error ? err : new Error(String(err)));
    }
  },

  refreshAll: async () => {
    const { fetchInstalled, fetchAvailable, fetchMarketplaces } = get();
    await Promise.all([
      fetchInstalled(),
      fetchAvailable(),
      fetchMarketplaces(),
    ]);
  },

  selectPlugin: (plugin) => {
    set({ selectedPlugin: plugin });
  },

  selectInstalledPlugin: (id) => {
    const { installed } = get();
    const plugin = installed.find((p) => p.id === id);
    if (plugin) {
      set({
        selectedPlugin: {
          id: plugin.id,
          name: plugin.id.split('@')[0],
          version: plugin.version,
          installed: true,
          enabled: plugin.enabled,
          scope: plugin.scope,
          installPath: plugin.installPath,
          installedAt: plugin.installedAt,
          lastUpdated: plugin.lastUpdated,
          mcpServers: plugin.mcpServers,
        },
      });
    }
  },

  selectAvailablePlugin: (id) => {
    const { available } = get();
    const plugin = available.find((p) => p.pluginId === id);
    if (plugin) {
      set({
        selectedPlugin: {
          id: plugin.pluginId,
          name: plugin.name,
          description: plugin.description,
          installed: false,
          marketplaceName: plugin.marketplaceName,
          installCount: plugin.installCount,
        },
      });
    }
  },

  installPlugin: async (pluginId, scope = 'user') => {
    try {
      set({ operatingPluginId: pluginId, error: null });
      const result = await pluginService.pluginInstall(pluginId, scope);
      if (result.success) {
        await get().fetchInstalled();
        set({ operatingPluginId: null });
        return true;
      } else {
        set({ error: result.error || '安装失败', operatingPluginId: null });
        return false;
      }
    } catch (err) {
      log.error('安装插件失败', err instanceof Error ? err : new Error(String(err)));
      set({ error: err instanceof Error ? err.message : String(err), operatingPluginId: null });
      return false;
    }
  },

  enablePlugin: async (pluginId, scope = 'user') => {
    try {
      set({ operatingPluginId: pluginId, error: null });
      const result = await pluginService.pluginEnable(pluginId, scope);
      if (result.success) {
        await get().fetchInstalled();
        set({ operatingPluginId: null });
        return true;
      } else {
        set({ error: result.error || '启用失败', operatingPluginId: null });
        return false;
      }
    } catch (err) {
      log.error('启用插件失败', err instanceof Error ? err : new Error(String(err)));
      set({ error: err instanceof Error ? err.message : String(err), operatingPluginId: null });
      return false;
    }
  },

  disablePlugin: async (pluginId, scope = 'user') => {
    try {
      set({ operatingPluginId: pluginId, error: null });
      const result = await pluginService.pluginDisable(pluginId, scope);
      if (result.success) {
        await get().fetchInstalled();
        set({ operatingPluginId: null });
        return true;
      } else {
        set({ error: result.error || '禁用失败', operatingPluginId: null });
        return false;
      }
    } catch (err) {
      log.error('禁用插件失败', err instanceof Error ? err : new Error(String(err)));
      set({ error: err instanceof Error ? err.message : String(err), operatingPluginId: null });
      return false;
    }
  },

  updatePlugin: async (pluginId, scope = 'user') => {
    try {
      set({ operatingPluginId: pluginId, error: null });
      const result = await pluginService.pluginUpdate(pluginId, scope);
      if (result.success) {
        await get().fetchInstalled();
        set({ operatingPluginId: null });
        return true;
      } else {
        set({ error: result.error || '更新失败', operatingPluginId: null });
        return false;
      }
    } catch (err) {
      log.error('更新插件失败', err instanceof Error ? err : new Error(String(err)));
      set({ error: err instanceof Error ? err.message : String(err), operatingPluginId: null });
      return false;
    }
  },

  uninstallPlugin: async (pluginId, scope = 'user', keepData = false) => {
    try {
      set({ operatingPluginId: pluginId, error: null });
      const result = await pluginService.pluginUninstall(pluginId, scope, keepData);
      if (result.success) {
        await get().fetchInstalled();
        set({ selectedPlugin: null, operatingPluginId: null });
        return true;
      } else {
        set({ error: result.error || '卸载失败', operatingPluginId: null });
        return false;
      }
    } catch (err) {
      log.error('卸载插件失败', err instanceof Error ? err : new Error(String(err)));
      set({ error: err instanceof Error ? err.message : String(err), operatingPluginId: null });
      return false;
    }
  },

  addMarketplace: async (source) => {
    try {
      set({ error: null });
      await pluginService.marketplaceAdd(source);
      await get().fetchMarketplaces();
      return true;
    } catch (err) {
      log.error('添加市场失败', err instanceof Error ? err : new Error(String(err)));
      set({ error: err instanceof Error ? err.message : String(err) });
      return false;
    }
  },

  removeMarketplace: async (name) => {
    try {
      set({ error: null });
      await pluginService.marketplaceRemove(name);
      await get().fetchMarketplaces();
      return true;
    } catch (err) {
      log.error('移除市场失败', err instanceof Error ? err : new Error(String(err)));
      set({ error: err instanceof Error ? err.message : String(err) });
      return false;
    }
  },

  updateMarketplace: async (name) => {
    try {
      set({ error: null });
      await pluginService.marketplaceUpdate(name);
      return true;
    } catch (err) {
      log.error('更新市场失败', err instanceof Error ? err : new Error(String(err)));
      set({ error: err instanceof Error ? err.message : String(err) });
      return false;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
