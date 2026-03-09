/**
 * Codex Engine
 *
 * OpenAI Codex CLI 的 AIEngine 实现。
 */

import type { AIEngine, AISession, AISessionConfig, EngineCapabilities } from '../../ai-runtime'
import { createCapabilities } from '../../ai-runtime'
import { CodexSession } from './session'

/**
 * Codex Engine 配置
 */
export interface CodexEngineConfig {
  /** Codex CLI 可执行文件路径 */
  executablePath?: string
  /** 默认模型 */
  defaultModel?: string
  /** API 密钥 */
  apiKey?: string
  /** 额外命令行参数 */
  extraArgs?: string[]
}

/**
 * Codex Engine
 *
 * 实现 AIEngine 接口，将 Codex CLI 集成到系统中。
 */
export class CodexEngine implements AIEngine {
  readonly id = 'codex'
  readonly name = 'Codex'

  readonly capabilities: EngineCapabilities = createCapabilities({
    supportedTaskKinds: ['chat', 'refactor', 'explain', 'generate', 'fix-bug'],
    supportsStreaming: true,
    supportsConcurrentSessions: true,
    supportsTaskAbort: true,
    maxConcurrentSessions: 3,
    description: 'OpenAI Codex CLI - OpenAI 的代码生成助手',
    version: '1.0.0',
  })

  private config: CodexEngineConfig
  private isInitialized: boolean = false

  constructor(config?: CodexEngineConfig) {
    this.config = config || {}
  }

  /**
   * 创建新的会话
   */
  createSession(sessionConfig?: AISessionConfig): AISession {
    return new CodexSession(sessionConfig, {
      executablePath: this.config.executablePath,
      model: this.config.defaultModel,
      apiKey: this.config.apiKey,
      extraArgs: this.config.extraArgs,
    })
  }

  /**
   * 检查 Engine 是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await this.checkCodexInstalled()
    } catch {
      return false
    }
  }

  /**
   * 初始化 Engine
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true
    }

    try {
      const available = await this.isAvailable()
      if (!available) {
        console.warn('[CodexEngine] Codex CLI 不可用，请先安装')
        return false
      }

      this.isInitialized = true
      return true
    } catch (error) {
      console.error('[CodexEngine] 初始化失败:', error)
      return false
    }
  }

  /**
   * 清理 Engine 资源
   */
  async cleanup(): Promise<void> {
    this.isInitialized = false
  }

  /**
   * 更新引擎配置
   */
  updateConfig(config: Partial<CodexEngineConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 获取当前配置
   */
  getConfig(): CodexEngineConfig {
    return { ...this.config }
  }

  /**
   * 检查 Codex CLI 是否已安装
   */
  private async checkCodexInstalled(): Promise<boolean> {
    // TODO: 调用 Tauri 后端检查 codex 是否安装
    return true
  }

  /**
   * 获取 Codex CLI 版本
   */
  async getVersion(): Promise<string | null> {
    // TODO: 调用 `codex --version` 获取版本
    return null
  }
}

/**
 * 创建 Codex Engine
 */
export function createCodexEngine(config?: CodexEngineConfig): CodexEngine {
  return new CodexEngine(config)
}

/**
 * 默认的 Codex Engine 实例
 */
export const defaultCodexEngine = new CodexEngine()
