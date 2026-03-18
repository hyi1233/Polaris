/**
 * Codex Engine 单元测试
 *
 * 测试 CodexEngine 的核心功能，包括：
 * - 引擎基本属性
 * - 会话创建
 * - 配置管理
 * - 生命周期管理
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  CodexEngine,
  createCodexEngine,
  defaultCodexEngine,
  type CodexEngineConfig,
} from './engine'

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

describe('CodexEngine', () => {
  let engine: CodexEngine

  beforeEach(() => {
    vi.clearAllMocks()
    engine = new CodexEngine()
  })

  afterEach(() => {
    engine.cleanup()
  })

  describe('基本属性', () => {
    it('应正确返回 id', () => {
      expect(engine.id).toBe('codex')
    })

    it('应正确返回 name', () => {
      expect(engine.name).toBe('Codex')
    })

    it('应正确返回 capabilities', () => {
      expect(engine.capabilities.supportsStreaming).toBe(true)
      expect(engine.capabilities.supportsConcurrentSessions).toBe(true)
      expect(engine.capabilities.supportsTaskAbort).toBe(true)
      expect(engine.capabilities.maxConcurrentSessions).toBe(3)
      expect(engine.capabilities.supportedTaskKinds).toContain('chat')
      expect(engine.capabilities.supportedTaskKinds).toContain('refactor')
      expect(engine.capabilities.supportedTaskKinds).toContain('explain')
      expect(engine.capabilities.supportedTaskKinds).toContain('generate')
      expect(engine.capabilities.supportedTaskKinds).toContain('fix-bug')
    })
  })

  describe('构造函数', () => {
    it('应使用默认配置初始化', () => {
      const defaultEngine = new CodexEngine()
      expect(defaultEngine.id).toBe('codex')
    })

    it('应接受自定义配置', () => {
      const customEngine = new CodexEngine({
        executablePath: '/custom/path/codex',
        model: 'gpt-4',
        apiKey: 'test-key',
        apiBase: 'https://api.example.com',
      })

      const config = customEngine.getConfig()
      expect(config.executablePath).toBe('/custom/path/codex')
      expect(config.model).toBe('gpt-4')
      expect(config.apiKey).toBe('test-key')
      expect(config.apiBase).toBe('https://api.example.com')
    })
  })

  describe('createSession', () => {
    it('应创建新的 Session', () => {
      const session = engine.createSession()

      expect(session).toBeDefined()
      expect(session.id).toBeDefined()
      expect(typeof session.id).toBe('string')
    })

    it('应创建具有不同 ID 的 Session', () => {
      const session1 = engine.createSession()
      const session2 = engine.createSession()

      expect(session1.id).not.toBe(session2.id)
    })

    it('应将配置传递给 Session', () => {
      const session = engine.createSession({
        workspaceDir: '/test/workspace',
        verbose: true,
      })

      expect(session).toBeDefined()
      expect(session.status).toBe('idle')
    })
  })

  describe('isAvailable', () => {
    it('应返回 boolean', async () => {
      const result = await engine.isAvailable()
      expect(typeof result).toBe('boolean')
    })

    it('默认实现应返回 true', async () => {
      const result = await engine.isAvailable()
      expect(result).toBe(true)
    })
  })

  describe('initialize', () => {
    it('首次初始化应成功', async () => {
      const result = await engine.initialize()
      expect(result).toBe(true)
    })

    it('重复初始化应返回 true', async () => {
      await engine.initialize()
      const result = await engine.initialize()
      expect(result).toBe(true)
    })
  })

  describe('cleanup', () => {
    it('应能成功调用清理', async () => {
      await engine.initialize()
      await engine.cleanup()
      const result = await engine.initialize()
      expect(result).toBe(true)
    })
  })

  describe('配置管理', () => {
    it('updateConfig 应合并配置', () => {
      engine.updateConfig({ model: 'gpt-4-turbo' })
      const config = engine.getConfig()
      expect(config.model).toBe('gpt-4-turbo')
    })

    it('updateConfig 应保留现有配置', () => {
      engine.updateConfig({ model: 'gpt-4' })
      engine.updateConfig({ apiKey: 'new-key' })

      const config = engine.getConfig()
      expect(config.model).toBe('gpt-4')
      expect(config.apiKey).toBe('new-key')
    })

    it('getConfig 应返回配置副本', () => {
      engine.updateConfig({ model: 'test-model' })
      const config1 = engine.getConfig()
      const config2 = engine.getConfig()

      expect(config1).not.toBe(config2)
      expect(config1.model).toBe(config2.model)
    })
  })
})

describe('createCodexEngine 工厂函数', () => {
  it('应创建 CodexEngine 实例', () => {
    const engine = createCodexEngine()
    expect(engine).toBeInstanceOf(CodexEngine)
    expect(engine.id).toBe('codex')
    engine.cleanup()
  })

  it('应传递配置给引擎', () => {
    const engine = createCodexEngine({
      executablePath: '/custom/codex',
      model: 'codex-2',
    })

    const config = engine.getConfig()
    expect(config.executablePath).toBe('/custom/codex')
    expect(config.model).toBe('codex-2')
    engine.cleanup()
  })
})

describe('defaultCodexEngine', () => {
  it('应是 CodexEngine 实例', () => {
    expect(defaultCodexEngine).toBeInstanceOf(CodexEngine)
  })

  it('应有正确的 id', () => {
    expect(defaultCodexEngine.id).toBe('codex')
  })

  it('应有正确的 name', () => {
    expect(defaultCodexEngine.name).toBe('Codex')
  })
})

describe('CodexEngine Session', () => {
  let engine: CodexEngine

  beforeEach(() => {
    vi.clearAllMocks()
    engine = new CodexEngine()
  })

  afterEach(() => {
    engine.cleanup()
  })

  describe('Session 状态管理', () => {
    it('创建的 Session 初始状态应为 idle', () => {
      const session = engine.createSession()
      expect(session.status).toBe('idle')
    })

    it('Session 应能被销毁', () => {
      const session = engine.createSession()
      session.dispose()

      expect(session.status).toBe('disposed')
    })

    it('Session 应能添加事件监听器', () => {
      const session = engine.createSession()
      const listener = vi.fn()

      const unsubscribe = session.onEvent(listener)
      expect(typeof unsubscribe).toBe('function')

      unsubscribe()
    })
  })

  describe('Session engineId', () => {
    it('Session 应有正确的 engineId', () => {
      const session = engine.createSession()
      expect((session as any).engineId).toBe('codex')
    })
  })

  describe('Session CLI 配置', () => {
    it('Session 应继承引擎配置', () => {
      const customEngine = new CodexEngine({
        model: 'gpt-4',
        apiKey: 'test-key',
      })

      const session = customEngine.createSession()
      const cliConfig = (session as any).getCLIConfig()

      expect(cliConfig.model).toBe('gpt-4')
      expect(cliConfig.apiKey).toBe('test-key')

      customEngine.cleanup()
    })
  })
})
