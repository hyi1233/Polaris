/**
 * QuickSwitchTrigger - 快速切换触发器组件
 *
 * 右侧贴边的玻璃风格触发器，悬停时展开面板
 */

import { memo } from 'react'
import { cn } from '@/utils/cn'
import { Zap } from 'lucide-react'
import { StatusDot } from '@/components/Session/StatusDot'
import type { SessionStatus } from '@/types/session'

interface QuickSwitchTriggerProps {
  /** 当前会话状态 */
  status: SessionStatus
  /** 是否悬停中 */
  isHovering: boolean
  /** 悬停进入回调 */
  onMouseEnter: () => void
  /** 悬停离开回调 */
  onMouseLeave: () => void
}

export const QuickSwitchTrigger = memo(function QuickSwitchTrigger({
  status,
  isHovering,
  onMouseEnter,
  onMouseLeave,
}: QuickSwitchTriggerProps) {
  return (
    <div
      className={cn(
        // 位置：右侧贴边
        'absolute right-0 top-[100px]',
        // 尺寸：32x44px
        'w-8 h-11',
        // 玻璃风格
        'bg-background-elevated/85 backdrop-blur-xl',
        // 边框：左圆角贴边设计
        'border border-border/50 border-r-0 rounded-l-xl',
        // 阴影
        'shadow-lg shadow-black/5',
        // 内容布局
        'flex flex-col items-center justify-center gap-1',
        // 交互
        'cursor-pointer transition-all duration-150',
        // 悬停状态
        isHovering && 'bg-background-elevated/95 shadow-xl shadow-black/10'
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* 状态指示点 */}
      <StatusDot status={status} size="sm" />

      {/* 快捷图标 */}
      <Zap className="w-3.5 h-3.5 text-text-muted" />
    </div>
  )
})
