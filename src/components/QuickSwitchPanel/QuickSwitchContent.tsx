/**
 * QuickSwitchContent - 快速切换面板内容组件
 *
 * 展示会话列表、工作区信息和更多工具
 */

import { memo, useMemo } from 'react'
import { cn } from '@/utils/cn'
import { Plus, FolderOpen, Loader2, X, Check, Download, Clock, Lock, Link } from 'lucide-react'
import { StatusDot } from '@/components/Session/StatusDot'
import type { QuickSessionInfo, QuickWorkspaceInfo } from './types'

interface QuickSwitchContentProps {
  /** 会话列表 */
  sessions: QuickSessionInfo[]
  /** 当前工作区信息 */
  workspace: QuickWorkspaceInfo | null
  /** 所有工作区列表 */
  workspaces: QuickWorkspaceInfo[]
  /** 关联工作区ID列表 */
  contextWorkspaceIds: string[]
  /** 工作区是否锁定 */
  isWorkspaceLocked: boolean
  /** 是否有消息可导出 */
  hasMessages: boolean
  /** 切换会话回调 */
  onSwitchSession: (sessionId: string) => void
  /** 删除会话回调 */
  onDeleteSession: (sessionId: string) => void
  /** 新建会话回调 */
  onCreateSession: () => void
  /** 切换主工作区回调 */
  onSwitchWorkspace: (workspaceId: string) => void
  /** 切换关联工作区回调 */
  onToggleContextWorkspace: (workspaceId: string) => void
  /** 导出聊天回调 */
  onExportChat: () => void
  /** 打开历史会话回调 */
  onOpenHistory: () => void
  /** 悬停进入回调 */
  onMouseEnter: () => void
  /** 悬停离开回调 */
  onMouseLeave: () => void
}

export const QuickSwitchContent = memo(function QuickSwitchContent({
  sessions,
  workspace,
  workspaces,
  contextWorkspaceIds,
  isWorkspaceLocked,
  hasMessages,
  onSwitchSession,
  onDeleteSession,
  onCreateSession,
  onSwitchWorkspace,
  onToggleContextWorkspace,
  onExportChat,
  onOpenHistory,
  onMouseEnter,
  onMouseLeave,
}: QuickSwitchContentProps) {
  // 获取当前活跃会话
  const activeSession = sessions.find(s => s.isActive)

  // 按最近访问排序工作区
  const sortedWorkspaces = useMemo(() => {
    return [...workspaces].sort((a, b) => {
      if (a.isMain) return -1
      if (b.isMain) return 1
      if (a.isContext && !b.isContext) return -1
      if (!a.isContext && b.isContext) return 1
      return 0
    })
  }, [workspaces])

  // 计算关联工作区数量
  const totalContextCount = contextWorkspaceIds.length + (workspace ? 1 : 0)

  return (
    <div
      className={cn(
        // 尺寸：280px宽
        'w-70',
        // 玻璃风格
        'bg-background-elevated/95 backdrop-blur-2xl',
        // 边框和圆角
        'border border-border/50 rounded-2xl',
        // 阴影
        'shadow-xl shadow-black/10',
        // 入场动画
        'animate-in fade-in-0 zoom-in-95 duration-150',
        // 内容布局
        'overflow-hidden'
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header: 当前状态 */}
      <div className="px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          {activeSession && (
            <>
              <StatusDot status={activeSession.status} size="md" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text-primary truncate">
                  {activeSession.title}
                </div>
                <div className="text-xs text-text-tertiary">
                  {getStatusLabel(activeSession.status)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sessions: 会话列表 */}
      <div className="px-4 py-2">
        <div className="text-xs text-text-tertiary uppercase tracking-wide mb-2">
          会话
        </div>

        <div className="space-y-1 max-h-48 overflow-y-auto">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                'group flex items-center gap-2 px-3 py-2 rounded-lg',
                'text-sm transition-colors',
                session.isActive
                  ? 'bg-primary/10 border-l-2 border-l-primary text-primary'
                  : 'hover:bg-background-hover text-text-secondary'
              )}
            >
              {/* 状态点 + 点击切换 */}
              <button
                onClick={() => onSwitchSession(session.id)}
                className="flex items-center gap-2 flex-1 min-w-0"
              >
                <StatusDot status={session.status} size="sm" />
                <span className="truncate">{session.title}</span>
              </button>

              {/* 运行中指示 */}
              {session.status === 'running' && (
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
              )}

              {/* 当前标签 */}
              {session.isActive && (
                <span className="text-xs text-primary">当前</span>
              )}

              {/* 删除按钮 */}
              {session.canDelete && (
                <button
                  onClick={() => onDeleteSession(session.id)}
                  className={cn(
                    'opacity-0 group-hover:opacity-100 p-1 rounded',
                    'text-text-muted hover:text-danger hover:bg-danger/10',
                    'transition-all'
                  )}
                  title="关闭会话"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* 新建会话按钮 */}
        <button
          onClick={onCreateSession}
          className={cn(
            'w-full mt-2 px-3 py-2 rounded-lg',
            'border border-dashed border-border-subtle',
            'text-xs text-text-tertiary',
            'hover:bg-background-hover hover:text-text-secondary',
            'transition-colors'
          )}
        >
          <Plus className="w-3 h-3 inline mr-1" />
          新建会话
        </button>
      </div>

      {/* Workspace: 工作区 */}
      <div className="px-4 py-2 border-t border-border-subtle">
        <div className="text-xs text-text-tertiary uppercase tracking-wide mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-3 h-3" />
            工作区
          </div>
        </div>

        {/* 锁定提示 */}
        {isWorkspaceLocked && (
          <div className="mb-2 px-2 py-1 bg-warning/10 rounded text-xs text-warning flex items-center gap-1">
            <Lock className="w-3 h-3" />
            会话进行中，主工作区已锁定
          </div>
        )}

        {/* 工作区列表 */}
        <div className="space-y-0.5 max-h-40 overflow-y-auto">
          {sortedWorkspaces.map((ws) => {
            // 主工作区：锁定时不可点击切换
            // 非主工作区：可以点击切换为主工作区（未锁定时）
            const canSwitchToMain = !isWorkspaceLocked && !ws.isMain

            return (
              <div
                key={ws.id}
                className={cn(
                  'group relative flex items-center gap-2 px-2 py-1.5 rounded-lg',
                  ws.isMain
                    ? isWorkspaceLocked
                      ? 'bg-primary/5 opacity-80'
                      : 'bg-primary/5'
                    : 'hover:bg-background-hover',
                  'transition-colors'
                )}
              >
                {/* 主工作区左侧指示条 */}
                {ws.isMain && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-l" />
                )}

                {/* 主工作区锁定图标 */}
                {ws.isMain && isWorkspaceLocked && (
                  <Lock className="w-3 h-3 text-text-muted shrink-0" />
                )}

                {/* 工作区信息 */}
                <button
                  onClick={() => canSwitchToMain && onSwitchWorkspace(ws.id)}
                  disabled={!canSwitchToMain}
                  className={cn(
                    'flex-1 min-w-0 text-left',
                    ws.isMain
                      ? 'text-primary font-medium'
                      : isWorkspaceLocked
                        ? 'text-text-secondary cursor-not-allowed opacity-50'
                        : 'text-text-secondary hover:text-text-primary',
                    canSwitchToMain && 'cursor-pointer'
                  )}
                >
                  <div className="text-sm truncate flex items-center gap-1.5">
                    {ws.isMain && !isWorkspaceLocked && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    )}
                    {ws.name}
                  </div>
                  <div className="text-xs truncate text-text-tertiary">
                    {ws.path}
                  </div>
                </button>

                {/* 主标签 */}
                {ws.isMain && (
                  <span className="text-xs text-primary px-1.5 py-0.5 bg-primary/10 rounded shrink-0">主</span>
                )}

                {/* 关联按钮（非主工作区，且有多个工作区） */}
                {!ws.isMain && workspaces.length > 1 && (
                  <button
                    onClick={() => onToggleContextWorkspace(ws.id)}
                    className={cn(
                      'p-1 rounded transition-colors shrink-0',
                      ws.isContext
                        ? 'text-primary bg-primary/10'
                        : 'text-text-tertiary hover:text-primary hover:bg-background-hover opacity-0 group-hover:opacity-100'
                    )}
                    title={ws.isContext ? '移除关联' : '添加关联'}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* 关联工作区汇总 */}
        {(contextWorkspaceIds.length > 0 || workspace) && (
          <div className="mt-2 pt-2 border-t border-border-subtle">
            <div className="text-xs text-text-tertiary flex items-center gap-1 mb-1">
              <Link className="w-3 h-3" />
              关联工作区 ({totalContextCount})
              <span className="text-text-muted">· AI 可访问这些文件</span>
            </div>

            {/* 主工作区 */}
            {workspace && (
              <div className="flex items-center px-2 py-1 text-sm text-text-secondary bg-primary/5 rounded">
                <span className="w-2 h-2 rounded-full bg-primary mr-2 shrink-0" />
                <span className="flex-1 truncate">{workspace.name}</span>
                <span className="text-xs text-text-tertiary mr-1">主</span>
              </div>
            )}

            {/* 关联工作区列表 */}
            {contextWorkspaceIds.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {contextWorkspaceIds.map((contextId) => {
                  const contextWs = workspaces.find(w => w.id === contextId)
                  if (!contextWs) return null
                  return (
                    <div
                      key={contextId}
                      className="group flex items-center px-2 py-1 text-sm text-text-secondary hover:bg-background-hover rounded"
                    >
                      <span className="w-2 h-2 rounded-full bg-primary/50 mr-2 shrink-0" />
                      <span className="flex-1 truncate">{contextWs.name}</span>
                      <button
                        onClick={() => onToggleContextWorkspace(contextId)}
                        className="p-1 rounded text-text-tertiary hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                        title="移除关联"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tools: 更多工具 */}
      <div className="px-4 py-2 border-t border-border-subtle">
        <div className="flex items-center gap-2">
          <button
            onClick={onExportChat}
            disabled={!hasMessages}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs',
              'transition-colors',
              hasMessages
                ? 'text-text-secondary hover:text-text-primary hover:bg-background-hover'
                : 'text-text-muted opacity-50 cursor-not-allowed'
            )}
            title={!hasMessages ? '当前会话无消息' : '导出聊天记录'}
          >
            <Download className="w-3.5 h-3.5" />
            导出
          </button>

          <button
            onClick={onOpenHistory}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs',
              'text-text-secondary hover:text-text-primary hover:bg-background-hover',
              'transition-colors'
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            历史
          </button>
        </div>
      </div>
    </div>
  )
})

// 状态标签映射
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    idle: '空闲',
    running: '运行中',
    waiting: '等待输入',
    error: '错误',
    'background-running': '后台运行',
  }
  return labels[status] || '未知'
}