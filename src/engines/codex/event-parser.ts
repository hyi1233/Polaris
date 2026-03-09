/**
 * Codex Event Parser
 *
 * 负责将 Codex CLI 的输出解析为通用的 AIEvent。
 */

import type { AIEvent } from '../../ai-runtime'
import {
  createToolCallStartEvent,
  createToolCallEndEvent,
  createProgressEvent,
  createErrorEvent,
  createSessionStartEvent,
  createSessionEndEvent,
  createAssistantMessageEvent,
} from '../../ai-runtime'
import {
  BaseEventParser,
  type BaseStreamEvent,
} from '../../ai-runtime/base/base-event-parser'

/**
 * Codex StreamEvent 类型
 */
export interface CodexStreamEvent extends BaseStreamEvent {
  type: string
  [key: string]: unknown
}

/**
 * Codex 消息事件
 */
export interface CodexMessageEvent extends CodexStreamEvent {
  type: 'message' | 'assistant'
  role?: 'assistant' | 'user' | 'system'
  content: string | Array<{ type: string; text?: string }>
}

/**
 * Codex Token 事件
 */
export interface CodexTokenEvent extends CodexStreamEvent {
  type: 'token' | 'delta' | 'content_block_delta'
  text?: string
  delta?: string
}

/**
 * Codex 工具调用事件
 */
export interface CodexToolEvent extends CodexStreamEvent {
  type: 'tool' | 'tool_call' | 'content_block_start'
  name?: string
  tool_id?: string
  id?: string
  input?: Record<string, unknown>
  output?: unknown
  status?: 'start' | 'end' | 'error'
}

/**
 * Codex 进度事件
 */
export interface CodexProgressEvent extends CodexStreamEvent {
  type: 'progress'
  message: string
  percent?: number
}

/**
 * Codex 错误事件
 */
export interface CodexErrorEvent extends CodexStreamEvent {
  type: 'error'
  message: string
  code?: string
}

/**
 * Codex 事件解析器
 */
export class CodexEventParser extends BaseEventParser<CodexStreamEvent> {
  private currentContent: string = ''

  constructor(sessionId: string) {
    super(sessionId)
  }

  /**
   * 解析单个原始事件为 AIEvent 数组
   */
  parse(event: CodexStreamEvent): AIEvent[] {
    const events: AIEvent[] = []
    const eventType = event.type

    switch (eventType) {
      case 'message':
      case 'assistant':
        const msgEvents = this.parseMessageEvent(event as CodexMessageEvent)
        events.push(...msgEvents)
        break

      case 'token':
      case 'delta':
      case 'content_block_delta':
        const tokenEvent = this.parseTokenEvent(event as CodexTokenEvent)
        if (tokenEvent) events.push(tokenEvent)
        break

      case 'tool':
      case 'tool_call':
      case 'content_block_start':
        const toolEvents = this.parseToolEvent(event as CodexToolEvent)
        events.push(...toolEvents)
        break

      case 'progress':
        const progressEvent = this.parseProgressEvent(event as CodexProgressEvent)
        if (progressEvent) events.push(progressEvent)
        break

      case 'error':
        const errorEvent = this.parseErrorEvent(event as CodexErrorEvent)
        if (errorEvent) events.push(errorEvent)
        break

      case 'session_start':
      case 'thread_started':
        events.push(createSessionStartEvent(this.sessionId))
        break

      case 'session_end':
      case 'thread_completed':
        events.push(createSessionEndEvent(this.sessionId))
        break

      default:
        break
    }

    return events
  }

  /**
   * 解析消息事件
   */
  private parseMessageEvent(event: CodexMessageEvent): AIEvent[] {
    let content = ''
    if (typeof event.content === 'string') {
      content = event.content
    } else if (Array.isArray(event.content)) {
      for (const block of event.content) {
        if (block.type === 'text' && block.text) {
          content += block.text
        }
      }
    }

    this.currentContent = content
    return [createAssistantMessageEvent(content)]
  }

  /**
   * 解析 Token 事件
   */
  private parseTokenEvent(event: CodexTokenEvent): AIEvent | null {
    const text = event.text || event.delta || ''
    if (!text) {
      return null
    }

    this.currentContent += text
    return createAssistantMessageEvent(text, true)
  }

  /**
   * 解析工具调用事件
   */
  private parseToolEvent(event: CodexToolEvent): AIEvent[] {
    const events: AIEvent[] = []
    const toolName = event.name || ''
    const status = event.status

    if (status === 'start' || event.type === 'content_block_start') {
      // 工具调用开始
      const input = event.input || {}
      events.push(createToolCallStartEvent(toolName, input))
    } else if (status === 'end') {
      // 工具调用结束
      const result = event.output
      events.push(createToolCallEndEvent(
        toolName,
        typeof result === 'string' ? result : JSON.stringify(result),
        true
      ))
    }

    return events
  }

  /**
   * 解析进度事件
   */
  private parseProgressEvent(event: CodexProgressEvent): AIEvent | null {
    return createProgressEvent(event.message, event.percent)
  }

  /**
   * 解析错误事件
   */
  private parseErrorEvent(event: CodexErrorEvent): AIEvent | null {
    return createErrorEvent(event.message, event.code)
  }

  /**
   * 重置解析器状态
   */
  reset(): void {
    super.reset()
    this.currentContent = ''
  }

  /**
   * 获取当前累积的内容
   */
  getCurrentContent(): string {
    return this.currentContent
  }
}

/**
 * 创建 Codex 事件解析器
 */
export function createCodexEventParser(sessionId: string): CodexEventParser {
  return new CodexEventParser(sessionId)
}