import { describe, it, expect, beforeEach } from 'vitest'
import { OpenAIProtocolEngine } from './engine'

describe('OpenAIProtocolEngine', () => {
  let engine: OpenAIProtocolEngine

  beforeEach(() => {
    engine = new OpenAIProtocolEngine({
      apiKey: 'test-key',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o',
    })
  })

  it('should create engine with correct id and name', () => {
    expect(engine.id).toBe('openai-protocol')
    expect(engine.name).toBe('OpenAI Protocol')
  })

  it('should have correct capabilities', () => {
    expect(engine.capabilities.supportsStreaming).toBe(true)
    expect(engine.capabilities.supportsConcurrentSessions).toBe(true)
    expect(engine.capabilities.supportsTaskAbort).toBe(true)
  })

  it('should create session', () => {
    const session = engine.createSession()
    expect(session.id).toBeDefined()
    expect(session.status).toBe('idle')
  })

  it('should be available with complete config', async () => {
    const available = await engine.isAvailable()
    expect(available).toBe(true)
  })

  it('should throw on invalid config', () => {
    expect(() => new OpenAIProtocolEngine({ baseUrl: 'not-a-url' })).toThrow()
  })

  it('should cleanup sessions', () => {
    engine.createSession()
    engine.createSession()
    engine.cleanup()
    // 无错误即通过
  })
})
