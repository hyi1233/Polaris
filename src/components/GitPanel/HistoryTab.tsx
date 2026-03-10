/**
 * 提交历史组件
 *
 * 显示 Git 提交历史列表
 *
 * TODO: 完全重构此组件
 * - 当前实现已被删除
 * - 需要重新设计数据加载逻辑
 * - 需要重新设计UI/UX
 * - 考虑简化功能，只保留核心的提交历史显示
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGitStore } from '@/stores/gitStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'

interface HistoryTabProps {
  targetCommitSha?: string | null
  onCommitSelected?: () => void
}

export function HistoryTab({ targetCommitSha, onCommitSelected }: HistoryTabProps) {
  const { t } = useTranslation('git')
  const [error, setError] = useState<string | null>(null)

  const getLog = useGitStore((s) => s.getLog)
  const currentWorkspace = useWorkspaceStore((s) => {
    const { workspaces, currentWorkspaceId } = s
    return workspaces.find(w => w.id === currentWorkspaceId) || null
  })

  // TODO: 重新实现提交历史加载逻辑
  // - 简化数据流
  // - 移除虚拟滚动（如果不需要）
  // - 简化错误处理
  // - 只保留核心功能

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 标题栏 */}
      <div className="px-4 py-2 border-b border-border-subtle flex items-center justify-between">
        <span className="text-sm font-medium text-text-primary">
          {t('history.title')}
        </span>
      </div>

      {/* 错误显示 */}
      {error && (
        <div className="px-4 py-2 text-xs text-danger bg-danger/10 border-b border-danger/20">
          {error}
        </div>
      )}

      {/* TODO: 实现提交历史列表 */}
      <div className="flex-1 overflow-hidden flex items-center justify-center text-text-tertiary">
        <div className="text-center">
          <p className="text-sm mb-2">{t('history.noCommits')}</p>
          <p className="text-xs">提交历史功能正在重构中...</p>
        </div>
      </div>
    </div>
  )
}
