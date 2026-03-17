/**
 * Codex Engine
 *
 * OpenAI Codex CLI 的 AIEngine 实现。
 */

import type { AISessionConfig, EngineCapabilities } from '../../ai-runtime'
import { createCapabilities } from '../../ai-runtime'
import { BaseCLIEngine, BaseCLISession, type CLIEngineConfig, type CLISessionConfig } from '../../ai-runtime/base'

/**
 * Codex Session
 *
 * 继承 BaseCLISession，实现 Codex 特定的 Session 逻辑。
 */
class CodexSession extends BaseCLISession {
  readonly engineId = 'codex'

  protected getDefaultExecutable(): string {
    return 'codex'
  }
}

/**
 * Codex Engine
 *
 * 继承 BaseCLIEngine，只需提供差异化配置。
 */
export class CodexEngine extends BaseCLIEngine {
  protected readonly descriptor = {
    id: 'codex',
    name: 'Codex',
    description: 'OpenAI Codex CLI - OpenAI 的代码生成助手',
    defaultExecutable: 'codex',
  }

  readonly capabilities: EngineCapabilities = createCapabilities({
    supportedTaskKinds: ['chat', 'refactor', 'explain', 'generate', 'fix-bug'],
    supportsStreaming: true,
    supportsConcurrentSessions: true,
    supportsTaskAbort: true,
    maxConcurrentSessions: 3,
    description: 'OpenAI Codex CLI - OpenAI 的代码生成助手',
    version: '1.0.0',
  })

  protected createCLISession(
    sessionConfig?: AISessionConfig,
    cliConfig?: CLISessionConfig
  ): BaseCLISession {
    return new CodexSession(sessionConfig, cliConfig)
  }
}

// 类型别名，保持向后兼容
export type CodexEngineConfig = CLIEngineConfig
export type CodexConfig = CLISessionConfig

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
