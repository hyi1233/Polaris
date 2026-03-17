/**
 * Base CLI Engine - CLI 类型引擎的通用基类
 *
 * 提供所有 CLI 类型 AI Engine 的公共功能：
 * - 配置管理
 * - 可用性检查
 * - 生命周期管理
 *
 * 各 CLI 引擎（IFlow、Codex 等）只需继承此类并实现差异化部分。
 */

import type { AIEngine, EngineCapabilities } from '../engine'
import type { AISession, AISessionConfig } from '../session'
import type { AITask, AIEvent } from '../index'
import { BaseSession } from './base-session'
import { createEventIterable } from './base-session'

/**
 * CLI Engine 配置接口
 *
 * 所有 CLI 类型引擎的统一配置格式
 */
export interface CLIEngineConfig {
  /** CLI 可执行文件路径 */
  executablePath?: string
  /** 模型配置 */
  model?: string
  /** API 密钥 */
  apiKey?: string
  /** API 基础 URL */
  apiBase?: string
  /** 额外命令行参数 */
  extraArgs?: string[]
}

/**
 * CLI 进程抽象接口
 *
 * 实际由 Tauri 后端实现
 */
export interface CLIProcess {
  pid?: number
  stdout?: ReadableStream
  stderr?: ReadableStream
  kill(): void
  on?(event: string, handler: (...args: unknown[]) => void): void
}

/**
 * CLI Engine 描述符
 *
 * 子类需提供这些差异化信息
 */
export interface CLIEngineDescriptor {
  /** Engine 唯一标识（如 'iflow', 'codex'） */
  id: string
  /** Engine 显示名称 */
  name: string
  /** Engine 描述 */
  description: string
  /** 默认可执行文件名 */
  defaultExecutable: string
}

/**
 * CLI Session 配置接口
 */
export interface CLISessionConfig extends CLIEngineConfig {
  /** 工作目录 */
  cwd?: string
  /** 环境变量 */
  env?: Record<string, string>
}

/**
 * CLI Session 抽象基类
 *
 * 提供 CLI Session 的通用实现，子类只需实现少量差异化方法。
 */
export abstract class BaseCLISession extends BaseSession {
  protected cliConfig: CLISessionConfig
  protected process: CLIProcess | null = null
  protected currentTaskId: string | null = null

  constructor(
    sessionConfig?: AISessionConfig,
    cliConfig?: CLISessionConfig
  ) {
    const sessionId = crypto.randomUUID()
    super({ id: sessionId, config: sessionConfig })
    this.cliConfig = cliConfig || {}
  }

  /**
   * 执行具体任务
   */
  protected async executeTask(task: AITask): Promise<AsyncIterable<AIEvent>> {
    this.currentTaskId = task.id

    // 启动 CLI 进程
    this.process = await this.startCLIProcess(task)

    // 设置输出处理
    this.setupOutputHandling()

    // 创建事件迭代器
    return createEventIterable(
      this.eventEmitter,
      (event) => event.type === 'session_end' || event.type === 'error'
    )
  }

  /**
   * 中断任务
   */
  protected abortTask(taskId?: string): void {
    if (taskId && taskId !== this.currentTaskId) {
      console.warn(`[${this.engineId}Session] 任务 ID 不匹配: ${taskId} != ${this.currentTaskId}`)
      return
    }

    if (this.process) {
      try {
        this.process.kill()
      } catch (e) {
        console.error(`[${this.engineId}Session] 终止进程失败:`, e)
      }
      this.process = null
    }

    this.currentTaskId = null
  }

  /**
   * 释放资源
   */
  protected disposeResources(): void {
    if (this.process) {
      try {
        this.process.kill()
      } catch {
        // 忽略错误
      }
      this.process = null
    }

    this.currentTaskId = null
  }

  /**
   * 设置输出处理
   *
   * 子类可覆盖此方法实现特定的输出解析逻辑
   */
  protected setupOutputHandling(): void {
    if (this.process?.stdout) {
      // 子类可覆盖实现具体解析逻辑
    }
  }

  /**
   * 启动 CLI 进程
   *
   * 实际实现需要使用 Tauri 的 Command API
   */
  protected async startCLIProcess(task: AITask): Promise<CLIProcess> {
    const args = this.buildCLIArgs(task)

    console.log(`[${this.engineId}Session] 启动命令:`, this.cliConfig.executablePath || this.getDefaultExecutable(), args)

    // 返回模拟的进程对象（实际实现需调用 Tauri 后端）
    return {
      kill: () => {},
      on: (_event: string, _handler: (...args: unknown[]) => void) => {},
    }
  }

  /**
   * 构建 CLI 命令行参数
   */
  protected buildCLIArgs(task: AITask): string[] {
    const args: string[] = []
    let prompt = task.input.prompt as string

    // 处理工作区上下文
    const workspaceContext = task.input.extra?.workspaceContext as
      | { currentWorkspace: { name: string; path: string }; contextWorkspaces: Array<{ name: string; path: string }> }
      | undefined

    if (workspaceContext) {
      const contextHeader = this.formatWorkspaceContext(workspaceContext)
      if (contextHeader) {
        prompt = `${contextHeader}\n\n${prompt}`
      }
    }

    // 基础参数
    args.push('--json')
    args.push('--stream')

    // 模型配置
    if (this.cliConfig.model) {
      args.push('--model', this.cliConfig.model)
    }

    // 额外参数
    if (this.cliConfig.extraArgs) {
      args.push(...this.cliConfig.extraArgs)
    }

    // 用户消息
    args.push('--')
    args.push(prompt)

    return args
  }

  /**
   * 格式化工作区上下文为提示词
   */
  protected formatWorkspaceContext(
    workspaceContext: { currentWorkspace: { name: string; path: string }; contextWorkspaces: Array<{ name: string; path: string }> }
  ): string {
    const lines: string[] = []

    lines.push('═══════════════════════════════════════════════════════════')
    lines.push('                        工作区信息')
    lines.push('═══════════════════════════════════════════════════════════')
    lines.push(`当前工作区: ${workspaceContext.currentWorkspace.name}`)
    lines.push(`  路径: ${workspaceContext.currentWorkspace.path}`)
    lines.push(`  引用语法: @/path`)

    if (workspaceContext.contextWorkspaces.length > 0) {
      lines.push('')
      lines.push('关联工作区:')
      for (const ws of workspaceContext.contextWorkspaces) {
        lines.push(`  • ${ws.name}`)
        lines.push(`    路径: ${ws.path}`)
        lines.push(`    引用语法: @${ws.name}:path`)
      }
    }

    lines.push('═══════════════════════════════════════════════════════════')

    return lines.join('\n')
  }

  /**
   * 获取默认可执行文件名
   */
  protected abstract getDefaultExecutable(): string

  /**
   * Engine ID
   */
  abstract readonly engineId: string

  /**
   * 更新 CLI 配置
   */
  updateCLIConfig(config: Partial<CLISessionConfig>): void {
    this.cliConfig = { ...this.cliConfig, ...config }
  }

  /**
   * 获取 CLI 配置
   */
  getCLIConfig(): CLISessionConfig {
    return { ...this.cliConfig }
  }
}

/**
 * CLI Engine 抽象基类
 *
 * 提供所有 CLI 类型引擎的通用实现，子类只需提供描述符和 Session 工厂。
 */
export abstract class BaseCLIEngine implements AIEngine {
  protected config: CLIEngineConfig
  protected isInitialized: boolean = false

  /**
   * Engine 描述符 - 子类必须实现
   */
  protected abstract readonly descriptor: CLIEngineDescriptor

  /**
   * Session 工厂 - 子类必须实现
   */
  protected abstract createCLISession(
    sessionConfig?: AISessionConfig,
    cliConfig?: CLISessionConfig
  ): BaseCLISession

  abstract readonly capabilities: EngineCapabilities

  get id(): string {
    return this.descriptor.id
  }

  get name(): string {
    return this.descriptor.name
  }

  constructor(config?: CLIEngineConfig) {
    this.config = config || {}
  }

  /**
   * 创建新的会话
   */
  createSession(sessionConfig?: AISessionConfig): AISession {
    return this.createCLISession(sessionConfig, {
      executablePath: this.config.executablePath,
      model: this.config.model,
      apiKey: this.config.apiKey,
      apiBase: this.config.apiBase,
      extraArgs: this.config.extraArgs,
    })
  }

  /**
   * 检查 Engine 是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await this.checkCLIInstalled()
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
        console.warn(`[${this.id}Engine] ${this.name} CLI 不可用，请先安装`)
        return false
      }

      this.isInitialized = true
      return true
    } catch (error) {
      console.error(`[${this.id}Engine] 初始化失败:`, error)
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
  updateConfig(config: Partial<CLIEngineConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 获取当前配置
   */
  getConfig(): CLIEngineConfig {
    return { ...this.config }
  }

  /**
   * 检查 CLI 是否已安装
   *
   * 子类可覆盖此方法实现特定的检查逻辑
   */
  protected async checkCLIInstalled(): Promise<boolean> {
    // TODO: 调用 Tauri 后端检查 CLI 是否安装
    // invoke('check_cli_installed', { cliName: this.descriptor.defaultExecutable })
    return true
  }

  /**
   * 获取 CLI 版本
   */
  async getVersion(): Promise<string | null> {
    // TODO: 调用 `${this.descriptor.defaultExecutable} --version` 获取版本
    return null
  }
}
