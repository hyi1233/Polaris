/**
 * CompactAssistantMessage - 小屏模式 AI 消息组件
 *
 * 特点：
 * - 紧凑布局
 * - 文本内容简化 Markdown 渲染
 * - 思考过程折叠显示
 * - 工具调用极简状态显示
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AssistantChatMessage, ThinkingBlock, ToolCallBlock } from '../../types/chat'
import { isTextBlock, isThinkingBlock, isToolCallBlock } from '../../types/chat'
import { ChevronDown, ChevronRight, Check, X, Loader2 } from 'lucide-react'
import { CompactTextContent } from './CompactTextContent'

interface CompactAssistantMessageProps {
  message: AssistantChatMessage
}

export function CompactAssistantMessage({ message }: CompactAssistantMessageProps) {
  const { t } = useTranslation('chat')
  // 按原始顺序渲染所有内容块
  const blocks = message.blocks || []

  return (
    <div className="flex justify-start">
      <div className="max-w-[95%] space-y-1.5">
        {/* 按原始顺序渲染所有内容块 */}
        {blocks.map((block, index) => {
          if (isTextBlock(block)) {
            return <CompactTextContent key={index} content={block.content} />
          } else if (isToolCallBlock(block)) {
            return (
              <CompactToolCall
                key={block.id || index}
                block={block}
              />
            )
          } else if (isThinkingBlock(block)) {
            return (
              <CompactThinking key={index} block={block as ThinkingBlock} />
            )
          }
          return null
        })}

        {/* 流式输出指示 */}
        {message.isStreaming && (
          <div className="text-xs text-text-tertiary animate-pulse">
            {t('compact.typing')}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 单个工具调用（可折叠显示）
 */
function CompactToolCall({ block }: { block: ToolCallBlock }) {
  const { t } = useTranslation('chat')
  const [expanded, setExpanded] = useState(false)

  const StatusIcon = {
    pending: Loader2,
    running: Loader2,
    completed: Check,
    failed: X,
    partial: Check,
  }[block.status]

  const statusColor = {
    pending: 'text-text-tertiary',
    running: 'text-warning animate-spin',
    completed: 'text-success',
    failed: 'text-danger',
    partial: 'text-warning',
  }[block.status]

  // 简化工具名称显示
  const displayName = block.name.replace(/^[A-Z]/, c => c.toLowerCase())

  return (
    <div className="bg-background-surface/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-background-hover/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown size={12} className="text-text-tertiary" />
        ) : (
          <ChevronRight size={12} className="text-text-tertiary" />
        )}
        <StatusIcon size={12} className={statusColor} />
        <span className="text-xs text-text-primary truncate">{displayName}</span>
        {block.duration && (
          <span className="text-xs text-text-tertiary ml-auto">{block.duration}ms</span>
        )}
      </button>

      {expanded && (
        <div className="px-2 pb-1.5">
          <pre className="text-xs text-text-tertiary whitespace-pre-wrap overflow-x-auto max-h-32">
            {JSON.stringify(block.input, null, 2)}
          </pre>
          {block.output && (
            <div className="mt-1 pt-1 border-t border-border/30">
              <div className="text-xs text-text-tertiary">{t('compact.output')}</div>
              <pre className="text-xs text-text-tertiary whitespace-pre-wrap overflow-x-auto max-h-32">
                {typeof block.output === 'string' ? block.output : JSON.stringify(block.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * 思考过程（折叠显示）
 */
function CompactThinking({ block }: { block: ThinkingBlock }) {
  const { t } = useTranslation('chat')
  const [expanded, setExpanded] = useState(false)

  // 截取思考内容的前 50 个字符作为摘要
  const summary = block.content.length > 50
    ? block.content.slice(0, 50) + '...'
    : block.content

  return (
    <div className="bg-background-surface/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-background-hover/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown size={12} className="text-text-tertiary" />
        ) : (
          <ChevronRight size={12} className="text-text-tertiary" />
        )}
        <span className="text-xs text-text-tertiary italic">
          💭 {expanded ? t('compact.thinking') : summary}
        </span>
      </button>

      {expanded && (
        <div className="px-2 pb-1.5">
          <p className="text-xs text-text-tertiary whitespace-pre-wrap italic">
            {block.content}
          </p>
        </div>
      )}
    </div>
  )
}
