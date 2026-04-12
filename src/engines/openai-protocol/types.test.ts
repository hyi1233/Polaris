import { describe, it, expect } from 'vitest'
import type { OpenAIMessage, OpenAIToolCall, OpenAIStreamChunk } from './types'

describe('OpenAI Types', () => {
  it('should define OpenAIMessage correctly', () => {
    const message: OpenAIMessage = {
      role: 'user',
      content: 'Hello',
    }
    expect(message.role).toBe('user')
    expect(message.content).toBe('Hello')
  })

  it('should define OpenAIToolCall correctly', () => {
    const toolCall: OpenAIToolCall = {
      id: 'call_123',
      type: 'function',
      function: {
        name: 'test_function',
        arguments: '{"arg": "value"}',
      },
    }
    expect(toolCall.id).toBe('call_123')
    expect(toolCall.function.name).toBe('test_function')
  })

  it('should define OpenAIStreamChunk correctly', () => {
    const chunk: OpenAIStreamChunk = {
      id: 'chunk_123',
      object: 'chat.completion.chunk',
      created: 1234567890,
      model: 'gpt-4o',
      choices: [{
        index: 0,
        delta: { content: 'Hello' },
        finish_reason: null,
      }],
    }
    expect(chunk.object).toBe('chat.completion.chunk')
    expect(chunk.choices[0].delta.content).toBe('Hello')
  })
})
