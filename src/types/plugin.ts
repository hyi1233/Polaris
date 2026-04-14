/**
 * Plugin 类型定义
 *
 * 用于插件管理的 TypeScript 类型
 */

/** 安装范围 */
export type PluginScope = 'user' | 'project' | 'local';

/** 插件列表结果 */
export interface PluginListResult {
  installed: InstalledPlugin[];
  available?: AvailablePlugin[];
}

/** 已安装插件 */
export interface InstalledPlugin {
  /** 插件 ID (如 figma@claude-plugins-official) */
  id: string;
  /** 版本号 */
  version: string;
  /** 安装范围 */
  scope: PluginScope;
  /** 是否启用 */
  enabled: boolean;
  /** 安装路径 */
  installPath: string;
  /** 安装时间 */
  installedAt?: string;
  /** 最后更新时间 */
  lastUpdated?: string;
  /** MCP 服务器配置 */
  mcpServers?: Record<string, McpServerConfig>;
}

/** 可用插件 */
export interface AvailablePlugin {
  /** 插件 ID */
  pluginId: string;
  /** 插件名称 */
  name: string;
  /** 描述 */
  description?: string;
  /** 市场名称 */
  marketplaceName: string;
  /** 来源信息 */
  source: PluginSource;
  /** 安装数量 */
  installCount?: number;
}

/** 插件来源 */
export interface PluginSource {
  source?: string;
  url?: string;
  repo?: string;
  path?: string;
  ref?: string;
  sha?: string;
}

/** MCP 服务器配置 */
export interface McpServerConfig {
  /** 服务器类型 */
  type?: 'http' | 'stdio' | 'sse';
  /** HTTP URL */
  url?: string;
  /** stdio 命令 */
  command?: string;
  /** 命令参数 */
  args?: string[];
}

/** 市场信息 */
export interface Marketplace {
  /** 市场名称 */
  name: string;
  /** 来源类型 */
  source: string;
  /** GitHub 仓库 */
  repo?: string;
  /** 安装位置 */
  installLocation: string;
}

/** 插件操作结果 */
export interface PluginOperationResult {
  /** 是否成功 */
  success: boolean;
  /** 成功消息 */
  message?: string;
  /** 错误消息 */
  error?: string;
}

/** 插件详情（合并已安装和可用信息） */
export interface PluginDetail {
  /** 插件 ID */
  id: string;
  /** 插件名称 */
  name: string;
  /** 描述 */
  description?: string;
  /** 版本 */
  version?: string;
  /** 是否已安装 */
  installed: boolean;
  /** 是否启用 */
  enabled?: boolean;
  /** 安装范围 */
  scope?: PluginScope;
  /** 安装路径 */
  installPath?: string;
  /** 安装时间 */
  installedAt?: string;
  /** 更新时间 */
  lastUpdated?: string;
  /** 来源市场 */
  marketplaceName?: string;
  /** 安装数量 */
  installCount?: number;
  /** MCP 服务器 */
  mcpServers?: Record<string, McpServerConfig>;
}
