/**
 * IFlow Engine
 *
 * IFlow CLI 的 AIEngine 实现。
 * IFlow 是一个支持多种 AI 模型的编程助手 CLI 工具。
 */

import type { AISessionConfig, EngineCapabilities } from '../../ai-runtime'
import { createCapabilities } from '../../ai-runtime'
import { BaseCLIEngine, BaseCLISession, type CLIEngineConfig, type CLISessionConfig } from '../../ai-runtime/base'

/**
 * IFlow Session
 *
 * 继承 BaseCLISession，实现 IFlow 特定的 Session 逻辑。
 */
class IFlowSession extends BaseCLISession {
  readonly engineId = 'iflow'

  protected getDefaultExecutable(): string {
    return 'iflow'
  }
}

/**
 * IFlow Engine
 *
 * 继承 BaseCLIEngine，只需提供差异化配置。
 */
export class IFlowEngine extends BaseCLIEngine {
  protected readonly descriptor = {
    id: 'iflow',
    name: 'IFlow',
    description: 'IFlow AI CLI - 支持多种 AI 模型的智能编程助手',
    defaultExecutable: 'iflow',
  }

  readonly capabilities: EngineCapabilities = createCapabilities({
    supportedTaskKinds: ['chat', 'refactor', 'explain', 'generate', 'fix-bug'],
    supportsStreaming: true,
    supportsConcurrentSessions: true,
    supportsTaskAbort: true,
    maxConcurrentSessions: 3,
    description: 'IFlow AI CLI - 支持多种 AI 模型的智能编程助手',
    version: '1.0.0',
  })

  protected createCLISession(
    sessionConfig?: AISessionConfig,
    cliConfig?: CLISessionConfig
  ): BaseCLISession {
    return new IFlowSession(sessionConfig, cliConfig)
  }
}

// 类型别名，保持向后兼容
export type IFlowEngineConfig = CLIEngineConfig
export type IFlowConfig = CLISessionConfig

/**
 * 创建 IFlow Engine
 */
export function createIFlowEngine(config?: IFlowEngineConfig): IFlowEngine {
  return new IFlowEngine(config)
}

/**
 * 默认的 IFlow Engine 实例
 */
export const defaultIFlowEngine = new IFlowEngine()
