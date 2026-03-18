/**
 * CompactTextContent - 小屏模式文本内容渲染
 *
 * 特点：
 * - 复用完整的 Markdown 渲染逻辑，保证与正常模式一致
 * - 支持 Mermaid 图表
 * - 紧凑的代码块显示
 * - 行内代码高亮
 * - 链接可点击
 * - 列表简化渲染
 */

import { useMemo, memo } from 'react'
import { markdownCache } from '../../utils/cache'
import { splitMarkdownWithMermaid, type MarkdownPart } from '../../utils/markdown'
import { MermaidDiagram } from '../Chat/MermaidDiagram'

interface CompactTextContentProps {
  content: string
}

/**
 * 单个 Markdown 部分渲染组件
 */
const MarkdownPartRenderer = memo(function MarkdownPartRenderer({ part }: { part: MarkdownPart }) {
  if (part.type === 'mermaid' && part.id) {
    return (
      <div className="my-2">
        <MermaidDiagram code={part.content} id={part.id} />
      </div>
    )
  }

  // 文本部分使用完整的 Markdown 渲染
  const html = useMemo(() => markdownCache.render(part.content), [part.content])

  return (
    <div
      className="prose prose-invert prose-sm max-w-none compact-text-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
})

export const CompactTextContent = memo(function CompactTextContent({ content }: CompactTextContentProps) {
  // 复用完整的 Markdown 渲染逻辑（支持 Mermaid）
  const parts = useMemo(() => splitMarkdownWithMermaid(content), [content])

  // 如果没有内容，返回空
  if (parts.length === 0) {
    return null
  }

  return (
    <div className="bg-background-surface/50 rounded-lg px-2.5 py-1.5 space-y-1">
      {parts.map((part, index) => (
        <MarkdownPartRenderer
          key={part.type === 'mermaid' ? part.id : `text-${index}`}
          part={part}
        />
      ))}
    </div>
  )
})
