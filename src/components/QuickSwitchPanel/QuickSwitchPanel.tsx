/**
 * QuickSwitchPanel - 快速切换面板主组件
 *
 * 右侧悬停触发的会话/工作区快速切换面板
 */

import { memo, useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { cn } from '@/utils/cn'
import { QuickSwitchTrigger } from './QuickSwitchTrigger'
import { QuickSwitchContent } from './QuickSwitchContent'
import type { QuickSwitchPanelProps, QuickSessionInfo, QuickWorkspaceInfo } from './types'
import type { SessionStatus } from '@/types/session'
import {
  useSessionMetadataList,
  useActiveSessionId,
  useSessionManagerActions,
} from '@/stores/conversationStore/sessionStoreManager'
import { useWorkspaceStore } from '@/stores/workspaceStore'

/** 展开延迟（毫秒） */
const SHOW_DELAY = 0

/** 关闭延迟（毫秒） */
const HIDE_DELAY = 150

export const QuickSwitchPanel = memo(function QuickSwitchPanel({
  className,
}: QuickSwitchPanelProps) {
  // 面板可见状态
  const [isPanelVisible, setIsPanelVisible] = useState(false)

  // 使用 ref 管理悬停状态，避免闭包陷阱
  const isHoveringTriggerRef = useRef(false)
  const isHoveringPanelRef = useRef(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 会话数据
  const sessions = useSessionMetadataList()
  const activeSessionId = useActiveSessionId()
  const { createSession, switchSession } = useSessionManagerActions()

  // 工作区数据
  const workspaces = useWorkspaceStore((state) => state.workspaces)
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId)

  // 清除所有定时器
  const clearTimers = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current)
      showTimerRef.current = null
    }
  }, [])

  // 显示面板（带延迟）
  const scheduleShow = useCallback(() => {
    clearTimers()
    showTimerRef.current = setTimeout(() => {
      setIsPanelVisible(true)
    }, SHOW_DELAY)
  }, [clearTimers])

  // 隐藏面板（带延迟）
  const scheduleHide = useCallback(() => {
    clearTimers()
    hideTimerRef.current = setTimeout(() => {
      if (!isHoveringTriggerRef.current && !isHoveringPanelRef.current) {
        setIsPanelVisible(false)
      }
    }, HIDE_DELAY)
  }, [clearTimers])

  // 组件卸载时清理
  useEffect(() => {
    return () => clearTimers()
  }, [clearTimers])

  // 触发器悬停处理
  const handleTriggerMouseEnter = useCallback(() => {
    isHoveringTriggerRef.current = true
    scheduleShow()
  }, [scheduleShow])

  const handleTriggerMouseLeave = useCallback(() => {
    isHoveringTriggerRef.current = false
    scheduleHide()
  }, [scheduleHide])

  // 面板悬停处理
  const handlePanelMouseEnter = useCallback(() => {
    isHoveringPanelRef.current = true
    clearTimers()
  }, [clearTimers])

  const handlePanelMouseLeave = useCallback(() => {
    isHoveringPanelRef.current = false
    scheduleHide()
  }, [scheduleHide])

  // 会话切换
  const handleSwitchSession = useCallback((sessionId: string) => {
    switchSession(sessionId)
    // 切换后保持面板展开，用户可能需要连续切换
  }, [switchSession])

  // 新建会话
  const handleCreateSession = useCallback(() => {
    createSession({
      type: 'free',
      workspaceId: currentWorkspaceId || undefined,
    })
  }, [createSession, currentWorkspaceId])

  // 计算会话列表数据
  const sessionList = useMemo<QuickSessionInfo[]>(() => {
    // 过滤静默会话
    const visibleSessions = sessions.filter(s => !s.silentMode)
    return visibleSessions.map(session => ({
      id: session.id,
      title: session.title,
      status: mapSessionStatus(session.status),
      isActive: session.id === activeSessionId,
    }))
  }, [sessions, activeSessionId])

  // 计算工作区数据
  const workspaceInfo = useMemo<QuickWorkspaceInfo | null>(() => {
    const activeSession = sessions.find(s => s.id === activeSessionId)
    if (!activeSession?.workspaceId) return null
    const workspace = workspaces.find(w => w.id === activeSession.workspaceId)
    if (!workspace) return null
    return {
      id: workspace.id,
      name: workspace.name,
      path: workspace.path,
      isMain: true,
      contextCount: activeSession.contextWorkspaceIds?.length || 0,
    }
  }, [sessions, activeSessionId, workspaces])

  // 获取当前会话状态
  const currentStatus = useMemo<SessionStatus>(() => {
    const activeSession = sessions.find(s => s.id === activeSessionId)
    return activeSession ? mapSessionStatus(activeSession.status) : 'idle'
  }, [sessions, activeSessionId])

  // 无会话时不显示
  if (sessions.length === 0) {
    return null
  }

  return (
    <div className={cn('absolute right-0 top-0 bottom-0 pointer-events-none', className)}>
      {/* 触发器 */}
      <div className="pointer-events-auto">
        <QuickSwitchTrigger
          status={currentStatus}
          isHovering={isPanelVisible}
          onMouseEnter={handleTriggerMouseEnter}
          onMouseLeave={handleTriggerMouseLeave}
        />
      </div>

      {/* 面板 */}
      {isPanelVisible && (
        <div className="pointer-events-auto">
          <QuickSwitchContent
            sessions={sessionList}
            workspace={workspaceInfo}
            onSwitchSession={handleSwitchSession}
            onCreateSession={handleCreateSession}
            onMouseEnter={handlePanelMouseEnter}
            onMouseLeave={handlePanelMouseLeave}
          />
        </div>
      )}
    </div>
  )
})

// 会话状态映射
function mapSessionStatus(status: string): SessionStatus {
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
