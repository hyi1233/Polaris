# SessionNavigator 集成到 ChatStatusBar 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 ChatStatusBar 中间添加会话导航组件，支持左右切换会话、点击当前会话向上展开面板选择其他会话和工作区。

**Architecture:** 新建 SessionNavigator 组件包含导航按钮组和向上展开的面板，集成到 ChatStatusBar 中间位置，复用 QuickSwitchContent 的会话列表和工作区切换逻辑，移除 QuickSwitchPanel 组件。

**Tech Stack:** React, TypeScript, Zustand, Tailwind CSS, Lucide Icons

---

## 文件结构

**新建文件：**
- `src/components/Chat/SessionNavigator/index.ts` - 导出入口
- `src/components/Chat/SessionNavigator/SessionNavigator.tsx` - 主组件：导航按钮组 + 展开状态管理
- `src/components/Chat/SessionNavigator/SessionNavigatorPanel.tsx` - 展开面板内容
- `src/components/Chat/SessionNavigator/types.ts` - 类型定义

**修改文件：**
- `src/components/Chat/ChatStatusBar.tsx` - 集成 SessionNavigator，添加宽度响应逻辑
- `src/components/Layout/RightPanel.tsx` - 移除 QuickSwitchPanel 引用
- `src/components/Chat/index.ts` - 导出 SessionNavigator

**删除文件：**
- `src/components/QuickSwitchPanel/` - 整个目录（功能被 SessionNavigator 替代）

---

## Task 1: 创建类型定义文件

**Files:**
- Create: `src/components/Chat/SessionNavigator/types.ts`

- [ ] **Step 1: 创建类型定义文件**

```typescript
/**
 * SessionNavigator 组件类型定义
 */

import type { SessionStatus } from '@/types/session'

/** 会话导航项信息 */
export interface SessionNavItem {
  id: string
  title: string
  status: SessionStatus
  isActive: boolean
  canDelete: boolean
}

/** 工作区导航项信息 */
export interface WorkspaceNavItem {
  id: string
  name: string
  path: string
  isMain: boolean
  isContext: boolean
}

/** SessionNavigator Props */
export interface SessionNavigatorProps {
  /** 是否显示版本徽章（根据宽度决定） */
  showVersionBadge?: boolean
}

/** SessionNavigatorPanel Props */
export interface SessionNavigatorPanelProps {
  /** 会话列表 */
  sessions: SessionNavItem[]
  /** 当前工作区信息 */
  currentWorkspace: WorkspaceNavItem | null
  /** 所有工作区列表 */
  workspaces: WorkspaceNavItem[]
  /** 关联工作区ID列表 */
  contextWorkspaceIds: string[]
  /** 工作区是否锁定 */
  isWorkspaceLocked: boolean
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
  /** 关闭面板回调 */
  onClose: () => void
}
```

---

## Task 2: 创建 SessionNavigatorPanel 组件

**Files:**
- Create: `src/components/Chat/SessionNavigator/SessionNavigatorPanel.tsx`

- [ ] **Step 1: 创建展开面板组件**

```tsx
/**
 * SessionNavigatorPanel - 会话导航展开面板
 *
 * 向上展开的会话选择和工作区切换面板
 */

import { memo, useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/utils/cn'
import { Plus, Loader2, X, FolderOpen, ChevronDown, Lock, Check, FolderPlus } from 'lucide-react'
import { StatusSymbol } from '@/components/QuickSwitchPanel/StatusSymbol'
import { CreateSessionModal } from '@/components/Session/CreateSessionModal'
import { CreateWorkspaceModal } from '@/components/Workspace/CreateWorkspaceModal'
import { createLogger } from '@/utils/logger'
import type { SessionNavigatorPanelProps, WorkspaceNavItem } from './types'

const log = createLogger('SessionNavigatorPanel')

export const SessionNavigatorPanel = memo(function SessionNavigatorPanel({
  sessions,
  currentWorkspace,
  workspaces,
  contextWorkspaceIds,
  isWorkspaceLocked,
  onSwitchSession,
  onDeleteSession,
  onCreateSession,
  onSwitchWorkspace,
  onToggleContextWorkspace,
  onClose,
}: SessionNavigatorPanelProps) {
  // 工作区下拉状态
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false)
  const workspaceButtonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })

  // 新建会话弹窗状态
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false)

  // 获取当前活跃会话
  const activeSession = sessions.find(s => s.isActive)

  // 工作区显示名称
  const workspaceDisplayName = currentWorkspace?.name || '工作区'

  // 计算关联工作区数量
  const totalContextCount = contextWorkspaceIds.length + (currentWorkspace ? 1 : 0)

  // 打开/关闭工作区下拉
  const handleToggleDropdown = (open: boolean) => {
    log.info('handleToggleDropdown', { open })
    if (open && workspaceButtonRef.current) {
      const rect = workspaceButtonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
      })
    }
    setIsWorkspaceDropdownOpen(open)
  }

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element
      const clickedButton = workspaceButtonRef.current?.contains(target)
      const clickedDropdown = !!target.closest('[data-workspace-dropdown]')
      if (!clickedButton && !clickedDropdown) {
        handleToggleDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 按主工作区优先排序
  const sortedWorkspaces = [...workspaces].sort((a, b) => {
    if (a.isMain) return -1
    if (b.isMain) return 1
    if (a.isContext && !b.isContext) return -1
    if (!a.isContext && b.isContext) return 1
    return 0
  })

  return (
    <>
      <div
        className={cn(
          'w-60',
          'bg-background-elevated/98 backdrop-blur-2xl',
          'border border-border/40',
          'rounded-xl',
          'shadow-2xl shadow-black/30',
          'animate-in fade-in-0 slide-in-from-bottom-2 duration-200',
          'overflow-hidden'
        )}
      >
        {/* 顶部发光线 */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        {/* 头部：当前会话概览 */}
        <div className="px-3 py-2.5 border-b border-border-subtle/30">
          <div className="flex items-center gap-2">
            {activeSession && (
              <>
                <StatusSymbol status={activeSession.status} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-text-primary truncate">
                    {activeSession.title}
                  </div>
                  {/* 工作区按钮 */}
                  <button
                    ref={workspaceButtonRef}
                    onClick={() => handleToggleDropdown(!isWorkspaceDropdownOpen)}
                    className={cn(
                      'flex items-center gap-1 mt-0.5 px-1 py-0.5 rounded',
                      'text-[10px] text-text-muted',
                      'hover:bg-background-hover/50 hover:text-text-secondary',
                      'transition-colors'
                    )}
                  >
                    <FolderOpen className="w-2.5 h-2.5" />
                    <span className="truncate max-w-[100px]">{workspaceDisplayName}</span>
                    {totalContextCount > 1 && (
                      <span className="text-primary">+{totalContextCount - 1}</span>
                    )}
                    <ChevronDown className={cn(
                      'w-2.5 h-2.5 transition-transform',
                      isWorkspaceDropdownOpen && 'rotate-180'
                    )} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 会话列表 */}
        <div className="py-1.5">
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  'group relative mx-1.5 flex items-center gap-2 px-2 py-1.5 rounded-lg',
                  'text-xs transition-all duration-150 cursor-pointer',
                  session.isActive
                    ? 'bg-primary/10 border border-primary/15'
                    : 'hover:bg-background-hover/50 border border-transparent'
                )}
                onClick={() => {
                  onSwitchSession(session.id)
                  onClose()
                }}
              >
                {/* 活跃指示条 */}
                {session.isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full shadow-[0_0_6px_rgba(59,130,246,0.4)]" />
                )}

                {/* 状态符号 */}
                <StatusSymbol status={session.status} size="sm" />

                {/* 会话名 */}
                <span className={cn(
                  'flex-1 truncate',
                  session.isActive ? 'text-primary font-medium' : 'text-text-secondary'
                )}>
                  {session.title}
                </span>

                {/* 运行中 */}
                {session.status === 'running' && (
                  <Loader2 className="w-3 h-3 animate-spin text-success shrink-0" />
                )}

                {/* 删除按钮 */}
                {session.canDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteSession(session.id)
                    }}
                    className={cn(
                      'opacity-0 group-hover:opacity-100 p-0.5 rounded',
                      'text-text-muted hover:text-danger hover:bg-danger/10',
                      'transition-all shrink-0'
                    )}
                    title="关闭"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 底部：新建会话 */}
        <div className="px-2 pb-2 pt-1 border-t border-border-subtle/20">
          <button
            onClick={() => setShowCreateSessionModal(true)}
            className={cn(
              'w-full px-2 py-1.5 rounded-lg',
              'border border-dashed border-border-subtle/50',
              'text-[11px] text-text-muted',
              'hover:bg-background-hover/30 hover:text-text-secondary hover:border-border/30',
              'transition-all duration-150',
              'flex items-center justify-center gap-1'
            )}
          >
            <Plus className="w-3 h-3" />
            <span>新建会话</span>
          </button>
        </div>
      </div>

      {/* 工作区下拉菜单 - Portal */}
      {isWorkspaceDropdownOpen && createPortal(
        <WorkspaceDropdown
          sessionId={activeSession?.id || null}
          workspaces={sortedWorkspaces}
          currentWorkspaceId={currentWorkspace?.id || null}
          contextWorkspaceIds={contextWorkspaceIds}
          isLocked={isWorkspaceLocked}
          position={dropdownPosition}
          onSelect={onSwitchWorkspace}
          onToggleContext={onToggleContextWorkspace}
          onClose={() => handleToggleDropdown(false)}
        />,
        document.body
      )}

      {/* 新建会话弹窗 */}
      {showCreateSessionModal && (
        <CreateSessionModal onClose={() => setShowCreateSessionModal(false)} />
      )}
    </>
  )
})

// ============================================================================
// WorkspaceDropdown - 工作区下拉菜单
// ============================================================================

interface WorkspaceDropdownProps {
  sessionId: string | null
  workspaces: WorkspaceNavItem[]
  currentWorkspaceId: string | null
  contextWorkspaceIds: string[]
  isLocked: boolean
  position: { top: number; left: number }
  onSelect: (workspaceId: string) => void
  onToggleContext: (workspaceId: string) => void
  onClose: () => void
}

const WorkspaceDropdown = memo(function WorkspaceDropdown({
  sessionId,
  workspaces,
  currentWorkspaceId,
  contextWorkspaceIds,
  isLocked,
  position,
  onSelect,
  onToggleContext,
  onClose: _onClose,
}: WorkspaceDropdownProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)

  const handleSetMain = (workspaceId: string) => {
    if (isLocked || !sessionId) return
    onSelect(workspaceId)
  }

  const handleToggleContext = (workspaceId: string) => {
    if (!sessionId) return
    onToggleContext(workspaceId)
  }

  return (
    <>
      <div
        data-workspace-dropdown
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          width: 200,
        }}
        className={cn(
          'z-50 bg-background-elevated border border-border rounded-xl',
          'shadow-xl overflow-hidden',
          'animate-in fade-in-0 zoom-in-95 duration-150'
        )}
      >
        {/* 锁定提示 */}
        {isLocked && (
          <div className="px-2.5 py-1.5 bg-warning/10 border-b border-border-subtle flex items-center gap-1.5 text-[10px] text-warning">
            <Lock className="w-3 h-3" />
            <span>创建时已指定主工作区，不可修改</span>
          </div>
        )}

        {/* 工作区列表 */}
        <div className="max-h-48 overflow-y-auto">
          {workspaces.length === 0 ? (
            <div className="py-3 text-center text-xs text-text-tertiary">
              暂无工作区
            </div>
          ) : (
            workspaces.map((ws) => {
              const isCurrent = ws.id === currentWorkspaceId
              const isContext = contextWorkspaceIds.includes(ws.id)

              return (
                <div
                  key={ws.id}
                  className={cn(
                    'group relative flex items-center',
                    isCurrent && (isLocked ? 'bg-primary/5 opacity-80' : 'bg-primary/5')
                  )}
                >
                  {/* 当前工作区左侧指示条 */}
                  {isCurrent && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
                  )}

                  {/* 锁定图标 */}
                  {isCurrent && isLocked && (
                    <div className="px-2">
                      <Lock className="w-3 h-3 text-text-muted" />
                    </div>
                  )}

                  {/* 工作区信息 */}
                  <button
                    onClick={() => handleSetMain(ws.id)}
                    disabled={isLocked && isCurrent}
                    className={cn(
                      'flex-1 text-left px-2.5 py-1.5 text-xs transition-colors',
                      isCurrent
                        ? 'text-primary'
                        : isLocked
                          ? 'text-text-tertiary cursor-not-allowed'
                          : 'text-text-secondary hover:text-text-primary hover:bg-background-hover',
                      isLocked && isCurrent && 'cursor-not-allowed'
                    )}
                  >
                    <div className="font-medium truncate flex items-center gap-1.5">
                      {isCurrent && !isLocked && (
                        <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                      )}
                      {ws.name}
                    </div>
                  </button>

                  {/* 主标签 */}
                  {isCurrent && (
                    <span className="px-1.5 text-[10px] text-primary">主</span>
                  )}

                  {/* 关联按钮 */}
                  {!isCurrent && workspaces.length > 1 && (
                    <button
                      onClick={() => handleToggleContext(ws.id)}
                      className={cn(
                        'p-1 rounded transition-colors shrink-0',
                        isContext
                          ? 'text-primary bg-primary/10'
                          : 'text-text-tertiary hover:text-primary hover:bg-background-hover opacity-0 group-hover:opacity-100'
                      )}
                      title={isContext ? '移除关联' : '添加关联'}
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* 分割线 */}
        <div className="border-t border-border-subtle" />

        {/* 新增工作区 */}
        <button
          onClick={() => setShowCreateModal(true)}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-1.5 text-xs',
            'text-text-secondary hover:text-text-primary hover:bg-background-hover',
            'transition-colors'
          )}
        >
          <FolderPlus className="w-3.5 h-3.5 text-text-muted" />
          <span>新增工作区</span>
        </button>

        {/* 新建工作区弹窗 */}
        {showCreateModal && (
          <CreateWorkspaceModal onClose={() => setShowCreateModal(false)} />
        )}
      </div>
    </>
  )
})
```

---

## Task 3: 创建 SessionNavigator 主组件

**Files:**
- Create: `src/components/Chat/SessionNavigator/SessionNavigator.tsx`

- [ ] **Step 1: 创建 SessionNavigator 主组件**

```tsx
/**
 * SessionNavigator - 会话导航组件
 *
 * 显示在 ChatStatusBar 中间，支持左右切换会话和向上展开选择
 */

import { memo, useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { cn } from '@/utils/cn'
import { ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import { createPortal } from 'react-dom'
import { SessionNavigatorPanel } from './SessionNavigatorPanel'
import { StatusSymbol } from '@/components/QuickSwitchPanel/StatusSymbol'
import { CreateSessionModal } from '@/components/Session/CreateSessionModal'
import {
  useSessionMetadataList,
  useActiveSessionId,
  useSessionManagerActions,
} from '@/stores/conversationStore'
import { useWorkspaceStore, useViewStore } from '@/stores'
import { createLogger } from '@/utils/logger'
import type { SessionNavItem, WorkspaceNavItem } from './types'

const log = createLogger('SessionNavigator')

/** 展开面板的最小顶部空间（像素） */
const MIN_PANEL_SPACE = 300

/** 版本徽章最小宽度阈值 */
const VERSION_BADGE_MIN_WIDTH = 450

export const SessionNavigator = memo(function SessionNavigator() {
  // 面板展开状态
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)

  // 会话数据
  const sessions = useSessionMetadataList()
  const activeSessionId = useActiveSessionId()
  const { deleteSession, switchSession, updateSessionWorkspace, addContextWorkspace, removeContextWorkspace } = useSessionManagerActions()

  // 工作区数据
  const workspaces = useWorkspaceStore((state) => state.workspaces)

  // 面板宽度（用于响应式判断）
  const rightPanelWidth = useViewStore((state) => state.rightPanelWidth)

  // 过滤静默会话
  const visibleSessions = sessions.filter(s => !s.silentMode)

  // 计算会话列表
  const sessionList = useMemo<SessionNavItem[]>(() => {
    return visibleSessions.map(session => ({
      id: session.id,
      title: session.title,
      status: mapSessionStatus(session.status),
      isActive: session.id === activeSessionId,
      canDelete: session.id !== activeSessionId && visibleSessions.length > 1,
    }))
  }, [visibleSessions, activeSessionId])

  // 当前会话索引
  const currentIndex = visibleSessions.findIndex(s => s.id === activeSessionId)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < visibleSessions.length - 1

  // 当前会话
  const activeSession = visibleSessions.find(s => s.id === activeSessionId)

  // 当前工作区信息
  const currentWorkspace = useMemo<WorkspaceNavItem | null>(() => {
    if (!activeSession?.workspaceId) return null
    const workspace = workspaces.find(w => w.id === activeSession.workspaceId)
    if (!workspace) return null
    return {
      id: workspace.id,
      name: workspace.name,
      path: workspace.path,
      isMain: true,
      isContext: false,
    }
  }, [activeSession, workspaces])

  // 工作区列表
  const workspaceList = useMemo<WorkspaceNavItem[]>(() => {
    const mainWorkspaceId = activeSession?.workspaceId
    const contextIds = activeSession?.contextWorkspaceIds || []

    return workspaces.map(w => ({
      id: w.id,
      name: w.name,
      path: w.path,
      isMain: w.id === mainWorkspaceId,
      isContext: contextIds.includes(w.id),
    }))
  }, [activeSession, workspaces])

  // 关联工作区ID列表
  const contextWorkspaceIds = activeSession?.contextWorkspaceIds || []

  // 工作区是否锁定
  const isWorkspaceLocked = activeSession?.workspaceLocked || false

  // 计算面板位置（向上展开）
  const calculatePanelPosition = useCallback(() => {
    if (!triggerRef.current) return { top: 0, left: 0 }

    const rect = triggerRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const spaceAbove = rect.top

    // 面板高度约 300px，检查是否有足够空间
    const panelHeight = Math.min(MIN_PANEL_SPACE, spaceAbove - 20)

    return {
      top: rect.top - panelHeight - 8,
      left: rect.left + rect.width / 2,
    }
  }, [])

  // 打开面板
  const handleOpenPanel = useCallback(() => {
    const position = calculatePanelPosition()
    setPanelPosition(position)
    setIsPanelOpen(true)
  }, [calculatePanelPosition])

  // 关闭面板
  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false)
  }, [])

  // 切换面板
  const handleTogglePanel = useCallback(() => {
    if (isPanelOpen) {
      handleClosePanel()
    } else {
      handleOpenPanel()
    }
  }, [isPanelOpen, handleOpenPanel, handleClosePanel])

  // 上一个会话
  const handlePrevSession = useCallback(() => {
    if (hasPrev) {
      switchSession(visibleSessions[currentIndex - 1].id)
    }
  }, [hasPrev, currentIndex, visibleSessions, switchSession])

  // 下一个会话
  const handleNextSession = useCallback(() => {
    if (hasNext) {
      switchSession(visibleSessions[currentIndex + 1].id)
    }
  }, [hasNext, currentIndex, visibleSessions, switchSession])

  // 切换会话
  const handleSwitchSession = useCallback((sessionId: string) => {
    switchSession(sessionId)
    handleClosePanel()
  }, [switchSession, handleClosePanel])

  // 删除会话
  const handleDeleteSession = useCallback((sessionId: string) => {
    deleteSession(sessionId)
  }, [deleteSession])

  // 新建会话弹窗状态
  const [showCreateModal, setShowCreateModal] = useState(false)

  // 新建会话
  const handleCreateSession = useCallback(() => {
    setShowCreateModal(true)
    handleClosePanel()
  }, [handleClosePanel])

  // 切换主工作区
  const handleSwitchWorkspace = useCallback((workspaceId: string) => {
    if (!activeSessionId || isWorkspaceLocked) return
    updateSessionWorkspace(activeSessionId, workspaceId)
  }, [activeSessionId, isWorkspaceLocked, updateSessionWorkspace])

  // 切换关联工作区
  const handleToggleContextWorkspace = useCallback((workspaceId: string) => {
    if (!activeSessionId) return
    if (contextWorkspaceIds.includes(workspaceId)) {
      removeContextWorkspace(activeSessionId, workspaceId)
    } else {
      addContextWorkspace(activeSessionId, workspaceId)
    }
  }, [activeSessionId, contextWorkspaceIds, addContextWorkspace, removeContextWorkspace])

  // 点击外部关闭面板
  useEffect(() => {
    if (!isPanelOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element
      const clickedTrigger = triggerRef.current?.contains(target)
      const clickedPanel = !!target.closest('[data-session-navigator-panel]')
      if (!clickedTrigger && !clickedPanel) {
        handleClosePanel()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isPanelOpen, handleClosePanel])

  // 键盘支持
  useEffect(() => {
    if (!isPanelOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClosePanel()
      } else if (e.key === 'ArrowLeft') {
        handlePrevSession()
      } else if (e.key === 'ArrowRight') {
        handleNextSession()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isPanelOpen, handleClosePanel, handlePrevSession, handleNextSession])

  // 无会话时不显示
  if (sessionList.length === 0) {
    return null
  }

  // 当前会话显示标题（截断）
  const displayTitle = activeSession?.title && activeSession.title.length > 16
    ? activeSession.title.slice(0, 16) + '...'
    : activeSession?.title || '会话'

  // 当前会话状态
  const currentStatus = activeSession ? mapSessionStatus(activeSession.status) : 'idle'

  // 是否显示版本徽章的宽度
  const showVersionBadge = rightPanelWidth >= VERSION_BADGE_MIN_WIDTH

  return (
    <>
      <div
        ref={triggerRef}
        className={cn(
          'flex items-center gap-1',
          'px-2 py-0.5 rounded-lg',
          'bg-background-surface/50',
          'border border-border/30',
          'transition-all duration-150',
          'hover:bg-background-hover/50 hover:border-border/50'
        )}
      >
        {/* 上一个会话按钮 */}
        <button
          onClick={handlePrevSession}
          disabled={!hasPrev}
          className={cn(
            'p-1 rounded transition-colors',
            hasPrev
              ? 'text-text-muted hover:text-text-primary hover:bg-background-hover'
              : 'text-text-disabled cursor-not-allowed'
          )}
          title="上一个会话"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* 当前会话按钮 */}
        <button
          onClick={handleTogglePanel}
          className={cn(
            'flex items-center gap-1.5 px-2 py-0.5 rounded',
            'transition-colors min-w-0',
            isPanelOpen
              ? 'bg-primary/10 text-primary'
              : 'hover:bg-background-hover'
          )}
        >
          <StatusSymbol status={currentStatus} size="sm" />
          <span className={cn(
            'text-xs font-medium truncate max-w-[120px]',
            showVersionBadge ? 'max-w-[120px]' : 'max-w-[180px]'
          )}>
            {displayTitle}
          </span>
          <ChevronUp className={cn(
            'w-3 h-3 transition-transform shrink-0',
            isPanelOpen && 'rotate-180'
          )} />
        </button>

        {/* 下一个会话按钮 */}
        <button
          onClick={handleNextSession}
          disabled={!hasNext}
          className={cn(
            'p-1 rounded transition-colors',
            hasNext
              ? 'text-text-muted hover:text-text-primary hover:bg-background-hover'
              : 'text-text-disabled cursor-not-allowed'
          )}
          title="下一个会话"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 展开面板 - Portal */}
      {isPanelOpen && createPortal(
        <div
          data-session-navigator-panel
          style={{
            position: 'fixed',
            top: panelPosition.top,
            left: panelPosition.left,
            transform: 'translateX(-50%)',
          }}
          className="z-50"
        >
          <SessionNavigatorPanel
            sessions={sessionList}
            currentWorkspace={currentWorkspace}
            workspaces={workspaceList}
            contextWorkspaceIds={contextWorkspaceIds}
            isWorkspaceLocked={isWorkspaceLocked}
            onSwitchSession={handleSwitchSession}
            onDeleteSession={handleDeleteSession}
            onCreateSession={handleCreateSession}
            onSwitchWorkspace={handleSwitchWorkspace}
            onToggleContextWorkspace={handleToggleContextWorkspace}
            onClose={handleClosePanel}
          />
        </div>,
        document.body
      )}

      {/* 新建会话弹窗 */}
      {showCreateModal && (
        <CreateSessionModal onClose={() => setShowCreateModal(false)} />
      )}
    </>
  )
})

// 会话状态映射
function mapSessionStatus(status: string): 'idle' | 'running' | 'waiting' | 'error' | 'background-running' {
  switch (status) {
    case 'running':
      return 'running'
    case 'waiting':
      return 'waiting'
    case 'error':
      return 'error'
    case 'background-running':
      return 'background-running'
    default:
      return 'idle'
  }
}
```

---

## Task 4: 创建导出入口文件

**Files:**
- Create: `src/components/Chat/SessionNavigator/index.ts`

- [ ] **Step 1: 创建 index.ts 导出文件**

```typescript
/**
 * SessionNavigator 组件导出
 */

export { SessionNavigator } from './SessionNavigator'
export type { SessionNavigatorProps, SessionNavigatorPanelProps, SessionNavItem, WorkspaceNavItem } from './types'
```

---

## Task 5: 修改 ChatStatusBar 集成 SessionNavigator

**Files:**
- Modify: `src/components/Chat/ChatStatusBar.tsx`

- [ ] **Step 1: 导入 SessionNavigator 和宽度相关 store**

在文件顶部导入区域添加：

```typescript
import { SessionNavigator } from './SessionNavigator'
import { useViewStore } from '../../stores'
```

- [ ] **Step 2: 获取面板宽度并计算是否显示版本徽章**

在组件内部，`const { t } = useTranslation('chat');` 之后添加：

```typescript
// 获取面板宽度
const rightPanelWidth = useViewStore((state) => state.rightPanelWidth)

// 是否显示版本徽章（宽度 >= 450px 时显示）
const showVersionBadge = rightPanelWidth >= 450
```

- [ ] **Step 3: 修改布局结构，添加中间区域**

将 return 语句内的 JSX 替换为：

```tsx
return (
  <div className={clsx(
    'flex items-center justify-between gap-2 px-4 py-1.5 text-xs text-text-tertiary',
    'bg-background-surface/50 border-t border-border-subtle'
  )}>
    {/* 左侧：版本徽章 */}
    <div className="flex items-center gap-2 flex-shrink-0">
      {showVersionBadge && config?.defaultEngine === 'claude-code' && healthStatus?.claudeVersion && (
        <span className="px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
          v{healthStatus.claudeVersion}
        </span>
      )}
    </div>

    {/* 中间：会话导航 */}
    <div className="flex items-center justify-center flex-1 min-w-0">
      <SessionNavigator />
    </div>

    {/* 右侧：语音、状态提示和字数 */}
    <div className="flex items-center gap-3 flex-shrink-0">
      {/* 语音识别 */}
      {speechEnabled && speechSupported && (
        <button
          onClick={isListening ? stopSpeech : startSpeech}
          className={clsx(
            'flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors',
            isListening
              ? 'bg-primary/10 text-primary'
              : 'text-text-tertiary hover:text-text-primary hover:bg-background-hover'
          )}
          title={isListening ? t('speech.stop', '停止语音识别') : t('speech.start', '开始语音识别')}
        >
          <IconMic size={14} className={isListening ? 'animate-pulse' : ''} />
          {isListening && (
            <span className="max-w-[200px] truncate">
              {interimTranscript || t('speech.listening', '正在听...')}
            </span>
          )}
        </button>
      )}

      {/* TTS 播放控制 */}
      <button
        onClick={handleTTSClick}
        disabled={ttsStatus === 'synthesizing'}
        className={clsx(
          'flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors',
          ttsStatus === 'playing' && 'bg-primary/10 text-primary',
          ttsStatus === 'paused' && 'text-text-secondary hover:text-text-primary hover:bg-background-hover',
          ttsStatus === 'synthesizing' && 'text-warning cursor-wait',
          (ttsStatus === 'idle' || ttsStatus === 'error') && (ttsEnabled
            ? 'text-text-muted cursor-not-allowed'
            : 'text-text-tertiary hover:text-text-primary hover:bg-background-hover'
          )
        )}
        title={
          ttsStatus === 'playing' ? t('tts.stop', '停止播放') :
          ttsStatus === 'paused' ? t('tts.disable', '关闭语音播放') :
          ttsStatus === 'synthesizing' ? t('tts.synthesizing', '合成中...') :
          ttsEnabled ? t('tts.idle', '语音播放') : t('tts.enable', '开启语音播放')
        }
      >
        {ttsStatus === 'synthesizing' && <Loader2 size={14} className="animate-spin" />}
        {(ttsStatus === 'playing' || ttsStatus === 'paused') && (
          <IconVolume size={14} className={ttsStatus === 'playing' ? 'animate-pulse' : ''} />
        )}
        {(ttsStatus === 'idle' || ttsStatus === 'error') && (
          <IconVolumeX size={14} />
        )}
      </button>

      {/* 输入状态提示 */}
      {inputHint && (
        <span className={clsx(
          'flex items-center gap-1.5',
          inputHint.type === 'accent' && 'text-accent',
          inputHint.type === 'violet' && 'text-violet-500'
        )}>
          {inputHint.type !== 'default' && <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />}
          {attachmentCount > 0 && inputHint.type === 'default' && <Paperclip size={12} />}
          {inputHint.text}
        </span>
      )}

      {/* 流式状态指示 */}
      {isStreaming && (
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
          <span className="text-primary">{t('statusBar.responding')}</span>
        </div>
      )}

      {/* 字数 */}
      {inputLength > 0 && (
        <span className="text-text-tertiary">{inputLength}</span>
      )}
    </div>
  </div>
);
```

---

## Task 6: 更新 Chat 组件导出

**Files:**
- Modify: `src/components/Chat/index.ts`

- [ ] **Step 1: 添加 SessionNavigator 导出**

在文件末尾添加：

```typescript
export { SessionNavigator } from './SessionNavigator'
```

---

## Task 7: 移除 QuickSwitchPanel

**Files:**
- Modify: `src/components/Layout/RightPanel.tsx`
- Delete: `src/components/QuickSwitchPanel/` 目录

- [ ] **Step 1: 从 RightPanel 移除 QuickSwitchPanel 引用**

修改 `src/components/Layout/RightPanel.tsx`：

删除导入：
```typescript
// 删除这行
import { QuickSwitchPanel } from '../QuickSwitchPanel'
```

删除 JSX 中的 `<QuickSwitchPanel />` 调用（两处）：
- 填充模式下的 `<QuickSwitchPanel />`
- 固定宽度模式下的 `<QuickSwitchPanel />`

修改后的 RightPanel.tsx 完整代码：

```tsx
/**
 * RightPanel - 右侧 AI 对话面板组件
 */

import { ReactNode } from 'react'
import { useViewStore } from '@/stores/viewStore'
import { ResizeHandle } from '../Common'

interface RightPanelProps {
  children: ReactNode
  /** 是否填充剩余空间（当中间区域为空时） */
  fillRemaining?: boolean
}

/**
 * 右侧面板组件
 * 支持折叠（完全隐藏）和任意宽度调整
 * 当 fillRemaining 为 true 时，自动扩展填充剩余空间
 */
export function RightPanel({ children, fillRemaining = false }: RightPanelProps) {
  const width = useViewStore((state) => state.rightPanelWidth)
  const setWidth = useViewStore((state) => state.setRightPanelWidth)
  const collapsed = useViewStore((state) => state.rightPanelCollapsed)

  // 折叠状态：不渲染面板
  if (collapsed) {
    return null
  }

  // 拖拽处理 - 调整宽度，支持更灵活的范围
  const handleResize = (delta: number) => {
    const newWidth = Math.max(200, Math.min(1200, width + delta))
    setWidth(newWidth)
  }

  // 填充模式：使用 flex-1 自动扩展，不显示拖拽手柄
  if (fillRemaining) {
    return (
      <aside className="flex flex-col flex-1 bg-background-elevated border-l border-border min-w-[200px] relative">
        {/* 内容区域 */}
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </aside>
    )
  }

  return (
    <>
      {/* 拖拽手柄 */}
      <ResizeHandle direction="horizontal" position="left" onDrag={handleResize} />

      {/* 面板容器 - 使用固定宽度 */}
      <aside
        className="flex flex-col bg-background-elevated border-l border-border shrink-0 relative"
        style={{ width: `${width}px` }}
      >
        {/* 内容区域 */}
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </aside>
    </>
  )
}
```

- [ ] **Step 2: 删除 QuickSwitchPanel 目录**

删除整个 `src/components/QuickSwitchPanel/` 目录及其下所有文件：
- `src/components/QuickSwitchPanel/QuickSwitchPanel.tsx`
- `src/components/QuickSwitchPanel/QuickSwitchTrigger.tsx`
- `src/components/QuickSwitchPanel/QuickSwitchContent.tsx`
- `src/components/QuickSwitchPanel/StatusSymbol.tsx`
- `src/components/QuickSwitchPanel/types.ts`
- `src/components/QuickSwitchPanel/index.ts`

---

## Task 8: 更新 StatusSymbol 组件位置

**Files:**
- Create: `src/components/Common/StatusSymbol.tsx`（移动）
- Modify: `src/components/Chat/SessionNavigator/SessionNavigatorPanel.tsx`（更新导入）
- Delete: `src/components/QuickSwitchPanel/StatusSymbol.tsx`

**注意：** StatusSymbol 组件被 SessionNavigatorPanel 使用，但由于 QuickSwitchPanel 目录会被删除，需要将 StatusSymbol 移动到 Common 目录。

- [ ] **Step 1: 创建 StatusSymbol 到 Common 目录**

创建 `src/components/Common/StatusSymbol.tsx`：

```tsx
/**
 * StatusSymbol - 状态几何符号
 *
 * 使用几何图形表示会话状态，而非简单的圆点
 * 太空舱控制面板风格
 */

import { cn } from '@/utils/cn'
import type { SessionStatus } from '@/types/session'

interface StatusSymbolProps {
  status: SessionStatus
  size?: 'sm' | 'md'
  className?: string
}

const sizeConfig = {
  sm: {
    container: 'w-3 h-3',
    lineWidth: 'w-1.5 h-0.5',
    ringSize: 'w-2 h-2',
    dotSize: 'w-1 h-1',
    rectSize: 'w-2 h-1',
  },
  md: {
    container: 'w-4 h-4',
    lineWidth: 'w-2.5 h-0.5',
    ringSize: 'w-3 h-3',
    dotSize: 'w-1.5 h-1.5',
    rectSize: 'w-3 h-1.5',
  },
}

const statusConfig: Record<SessionStatus, { color: string; glow?: string }> = {
  idle: { color: 'bg-text-muted' },
  running: { color: 'bg-success', glow: 'shadow-[0_0_6px_rgba(52,211,153,0.5)]' },
  waiting: { color: 'bg-info', glow: 'shadow-[0_0_6px_rgba(96,165,250,0.5)]' },
  error: { color: 'bg-danger', glow: 'shadow-[0_0_6px_rgba(248,113,113,0.5)]' },
  'background-running': { color: 'bg-text-tertiary', glow: 'shadow-[0_0_4px_rgba(142,142,147,0.3)]' },
}

export function StatusSymbol({ status, size = 'sm', className }: StatusSymbolProps) {
  const config = sizeConfig[size]
  const { glow } = statusConfig[status]

  // 不同状态使用不同几何形状
  switch (status) {
    case 'running':
      // 旋转中的圆环（带脉冲效果）
      return (
        <div className={cn(config.container, 'relative flex items-center justify-center', className)}>
          <div
            className={cn(
              config.ringSize,
              'rounded-full',
              'border-2 border-success',
              'animate-spin',
              glow
            )}
            style={{ animationDuration: '2s' }}
          />
          {/* 中心发光点 */}
          <div className={cn(config.dotSize, 'rounded-full bg-success absolute', glow)} />
        </div>
      )

    case 'waiting':
      // 等待中的脉冲点（呼吸灯效果）
      return (
        <div className={cn(config.container, 'relative flex items-center justify-center', className)}>
          <div
            className={cn(
              config.dotSize,
              'rounded-full bg-info',
              'animate-pulse',
              glow
            )}
          />
          {/* 外圈 */}
          <div
            className={cn(
              config.ringSize,
              'rounded-full',
              'border border-info/30',
              'absolute'
            )}
          />
        </div>
      )

    case 'error':
      // 错误：菱形警告符号
      return (
        <div className={cn(config.container, 'relative flex items-center justify-center', className)}>
          <div
            className={cn(
              config.dotSize,
              'bg-danger',
              '[clip-path:polygon(50%_0%,_100%_50%,_50%_100%,_0%_50%)]',
              glow
            )}
          />
        </div>
      )

    case 'background-running':
      // 后台运行：虚线圆环
      return (
        <div className={cn(config.container, 'relative flex items-center justify-center', className)}>
          <div
            className={cn(
              config.ringSize,
              'rounded-full',
              'border border-text-tertiary/60',
              'border-dashed',
              glow
            )}
          />
        </div>
      )

    case 'idle':
    default:
      // 空闲：简单横线（休眠状态）
      return (
        <div className={cn(config.container, 'flex items-center justify-center', className)}>
          <div className={cn(config.lineWidth, 'rounded-full bg-text-muted')} />
        </div>
      )
  }
}
```

- [ ] **Step 2: 更新 Common/index.ts 导出**

在 `src/components/Common/index.ts` 添加导出：

```typescript
export { StatusSymbol } from './StatusSymbol'
```

- [ ] **Step 3: 更新 SessionNavigatorPanel 的导入**

修改 `src/components/Chat/SessionNavigator/SessionNavigatorPanel.tsx`：

将：
```typescript
import { StatusSymbol } from '@/components/QuickSwitchPanel/StatusSymbol'
```

改为：
```typescript
import { StatusSymbol } from '@/components/Common/StatusSymbol'
```

---

## Task 9: 验证与测试

- [ ] **Step 1: 检查 TypeScript 编译**

运行: `npm run typecheck`
预期: 无类型错误

- [ ] **Step 2: 检查 ESLint**

运行: `npm run lint`
预期: 无 lint 错误

- [ ] **Step 3: 手动测试功能**

1. 启动应用，查看 ChatStatusBar 中间是否显示会话导航
2. 点击左右箭头，验证切换会话功能
3. 点击当前会话按钮，验证向上展开面板
4. 在展开面板中点击其他会话，验证切换功能
5. 测试工作区切换下拉
6. 测试新建会话按钮
7. 调整右侧面板宽度，验证版本徽章的显示/隐藏
8. 测试键盘快捷键（Escape 关闭面板，左右箭头切换会话）

---

## 设计决策总结

| 决策 | 选择 | 原因 |
|------|------|------|
| 面板展开方向 | 向上展开 | 符合用户预期，输入框在底部，向上展开不遮挡内容 |
| 面板定位 | Portal + fixed | 避免被父容器 overflow 裁剪 |
| 版本徽章响应式 | ≥450px 显示 | 中间会话导航需要足够空间 |
| 复用 vs 重写 | 复用 StatusSymbol，重写面板 | StatusSymbol 设计精良，面板逻辑需适配向上展开 |
| 删除 QuickSwitchPanel | 是 | 功能完全重复，减少界面复杂度 |
