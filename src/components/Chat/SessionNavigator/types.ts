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
  /** 是否可删除（非当前会话且至少有一个其他会话） */
  canDelete: boolean
}

/** 工作区导航项信息 */
export interface WorkspaceNavItem {
  id: string
  name: string
  path: string
  /** 是否为当前会话的主工作区 */
  isMain: boolean
  /** 是否为关联工作区 */
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
