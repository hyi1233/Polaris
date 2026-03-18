/**
 * Engines Index 单元测试
 *
 * 测试引擎注册表的核心功能，包括：
 * - 可用引擎 ID 获取
 * - 默认引擎 ID 获取
 * - 引擎描述信息获取
 */

import { describe, it, expect } from 'vitest'
import {
  getAvailableEngineIds,
  getDefaultEngineId,
  getEngineDescriptors,
  type EngineDescriptor,
} from './index'

describe('Engines Registry', () => {
  describe('getAvailableEngineIds', () => {
    it('应返回引擎 ID 数组', () => {
      const ids = getAvailableEngineIds()

      expect(Array.isArray(ids)).toBe(true)
      expect(ids.length).toBeGreaterThan(0)
    })

    it('应包含 claude-code 引擎', () => {
      const ids = getAvailableEngineIds()
      expect(ids).toContain('claude-code')
    })

    it('应包含 iflow 引擎', () => {
      const ids = getAvailableEngineIds()
      expect(ids).toContain('iflow')
    })

    it('应包含 codex 引擎', () => {
      const ids = getAvailableEngineIds()
      expect(ids).toContain('codex')
    })

    it('应返回 3 个引擎 ID', () => {
      const ids = getAvailableEngineIds()
      expect(ids).toHaveLength(3)
    })
  })

  describe('getDefaultEngineId', () => {
    it('应返回字符串', () => {
      const defaultId = getDefaultEngineId()
      expect(typeof defaultId).toBe('string')
    })

    it('应返回 claude-code 作为默认引擎', () => {
      const defaultId = getDefaultEngineId()
      expect(defaultId).toBe('claude-code')
    })

    it('返回的 ID 应在可用引擎列表中', () => {
      const defaultId = getDefaultEngineId()
      const availableIds = getAvailableEngineIds()
      expect(availableIds).toContain(defaultId)
    })
  })

  describe('getEngineDescriptors', () => {
    it('应返回引擎描述数组', () => {
      const descriptors = getEngineDescriptors()

      expect(Array.isArray(descriptors)).toBe(true)
      expect(descriptors.length).toBeGreaterThan(0)
    })

    it('每个描述应包含必要字段', () => {
      const descriptors = getEngineDescriptors()

      for (const desc of descriptors) {
        expect(desc).toHaveProperty('id')
        expect(desc).toHaveProperty('name')
        expect(desc).toHaveProperty('description')
        expect(desc).toHaveProperty('available')
        expect(typeof desc.id).toBe('string')
        expect(typeof desc.name).toBe('string')
        expect(typeof desc.description).toBe('string')
        expect(typeof desc.available).toBe('boolean')
      }
    })

    it('应包含 claude-code 引擎描述', () => {
      const descriptors = getEngineDescriptors()
      const claudeCode = descriptors.find((d) => d.id === 'claude-code')

      expect(claudeCode).toBeDefined()
      expect(claudeCode?.name).toBe('Claude Code')
      expect(claudeCode?.available).toBe(true)
    })

    it('应包含 iflow 引擎描述', () => {
      const descriptors = getEngineDescriptors()
      const iflow = descriptors.find((d) => d.id === 'iflow')

      expect(iflow).toBeDefined()
      expect(iflow?.name).toBe('IFlow')
      expect(iflow?.available).toBe(true)
    })

    it('应包含 codex 引擎描述', () => {
      const descriptors = getEngineDescriptors()
      const codex = descriptors.find((d) => d.id === 'codex')

      expect(codex).toBeDefined()
      expect(codex?.name).toBe('Codex')
      expect(codex?.available).toBe(true)
    })

    it('返回 3 个引擎描述', () => {
      const descriptors = getEngineDescriptors()
      expect(descriptors).toHaveLength(3)
    })

    it('所有引擎应标记为可用', () => {
      const descriptors = getEngineDescriptors()
      const allAvailable = descriptors.every((d) => d.available === true)
      expect(allAvailable).toBe(true)
    })
  })

  describe('EngineDescriptor 类型', () => {
    it('应正确定义 EngineDescriptor 接口', () => {
      const desc: EngineDescriptor = {
        id: 'test-engine',
        name: 'Test Engine',
        description: 'A test engine',
        available: true,
      }

      expect(desc.id).toBe('test-engine')
      expect(desc.name).toBe('Test Engine')
      expect(desc.description).toBe('A test engine')
      expect(desc.available).toBe(true)
    })
  })
})

describe('引擎导出验证', () => {
  it('应正确导出 Claude Code 引擎', async () => {
    const { ClaudeCodeEngine, getClaudeEngine, resetClaudeEngine } = await import('./claude-code')

    expect(ClaudeCodeEngine).toBeDefined()
    expect(getClaudeEngine).toBeDefined()
    expect(resetClaudeEngine).toBeDefined()
  })

  it('应正确导出 IFlow 引擎', async () => {
    const { IFlowEngine, createIFlowEngine, defaultIFlowEngine } = await import('./iflow')

    expect(IFlowEngine).toBeDefined()
    expect(createIFlowEngine).toBeDefined()
    expect(defaultIFlowEngine).toBeDefined()
  })

  it('应正确导出 Codex 引擎', async () => {
    const { CodexEngine, createCodexEngine, defaultCodexEngine } = await import('./codex')

    expect(CodexEngine).toBeDefined()
    expect(createCodexEngine).toBeDefined()
    expect(defaultCodexEngine).toBeDefined()
  })
})
