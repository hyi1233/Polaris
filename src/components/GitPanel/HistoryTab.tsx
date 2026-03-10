/**
 * 提交历史组件
 *
 * 显示 Git 提交历史列表，使用虚拟滚动优化性能
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { GitCommit, User, Clock, RefreshCw, ChevronRight, Loader2, Search, X, Cherry, AlertTriangle, XCircle, CheckCircle } from 'lucide-react'
import { Virtuoso } from 'react-virtuoso'
import { useGitStore } from '@/stores/gitStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useToastStore } from '@/stores/toastStore'
import type { GitCommit as GitCommitType, GitCherryPickResult } from '@/types/git'

const PAGE_SIZE = 50

export function HistoryTab() {
  const { t } = useTranslation('git')
  const [commits, setCommits] = useState<GitCommitType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCommit, setSelectedCommit] = useState<GitCommitType | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const loadingRef = useRef(false)

  // Cherry-pick 相关状态
  const [showCherryPickDialog, setShowCherryPickDialog] = useState(false)
  const [cherryPickTarget, setCherryPickTarget] = useState<GitCommitType | null>(null)
  const [cherryPickResult, setCherryPickResult] = useState<GitCherryPickResult | null>(null)
  const [isCherryPicking, setIsCherryPicking] = useState(false)

  const getLog = useGitStore((s) => s.getLog)
  const cherryPick = useGitStore((s) => s.cherryPick)
  const cherryPickAbort = useGitStore((s) => s.cherryPickAbort)
  const cherryPickContinue = useGitStore((s) => s.cherryPickContinue)
  const currentWorkspace = useWorkspaceStore((s) => s.getCurrentWorkspace())
  const toast = useToastStore()

  // 过滤提交（按消息和作者搜索）
  const filteredCommits = useMemo(() => {
    if (!searchQuery.trim()) return commits
    const query = searchQuery.toLowerCase()
    return commits.filter((commit) =>
      commit.message.toLowerCase().includes(query) ||
      commit.author.toLowerCase().includes(query) ||
      commit.shortSha.toLowerCase().includes(query)
    )
  }, [commits, searchQuery])

  const loadCommits = useCallback(async (append = false) => {
    console.log('[HistoryTab] loadCommits called', { 
      currentWorkspace: currentWorkspace?.path, 
      append,
      loadingRef: loadingRef.current 
    })

    if (!currentWorkspace) {
      console.log('[HistoryTab] currentWorkspace is null, skipping load')
      return
    }
    if (loadingRef.current) {
      console.log('[HistoryTab] already loading, skipping')
      return
    }

    if (append) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
      setCommits([])
      setHasMore(true)
    }
    loadingRef.current = true
    setError(null)

    try {
      const skip = append ? commits.length : 0
      console.log('[HistoryTab] calling getLog', { 
        path: currentWorkspace.path, 
        limit: PAGE_SIZE, 
        skip 
      })
      const result = await getLog(currentWorkspace.path, PAGE_SIZE, skip)
      console.log('[HistoryTab] getLog result', { count: result.length })
      
      if (result.length < PAGE_SIZE) {
        setHasMore(false)
      }
      
      if (append) {
        setCommits((prev) => [...prev, ...result])
      } else {
        setCommits(result)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error('[HistoryTab] getLog error', errorMsg)
      setError(errorMsg)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
      loadingRef.current = false
    }
  }, [currentWorkspace, getLog, commits.length])

  // 初始加载 - 当 currentWorkspace 变化时重新加载
  useEffect(() => {
    console.log('[HistoryTab] useEffect triggered', { 
      workspacePath: currentWorkspace?.path,
      workspaceId: currentWorkspace?.id 
    })
    loadCommits(false)
  }, [currentWorkspace?.path, loadCommits])

  // 加载更多
  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && commits.length > 0) {
      loadCommits(true)
    }
  }, [isLoadingMore, hasMore, commits.length, loadCommits])

  // 手动刷新
  const handleRefresh = useCallback(() => {
    loadCommits(false)
  }, [loadCommits])

  // 打开 Cherry-pick 确认弹窗
  const handleOpenCherryPick = useCallback((commit: GitCommitType) => {
    setCherryPickTarget(commit)
    setCherryPickResult(null)
    setShowCherryPickDialog(true)
  }, [])

  // 执行 Cherry-pick
  const handleCherryPick = useCallback(async () => {
    if (!currentWorkspace || !cherryPickTarget) return

    setIsCherryPicking(true)
    try {
      const result = await cherryPick(currentWorkspace.path, cherryPickTarget.sha)
      setCherryPickResult(result)

      if (result.success && !result.hasConflicts) {
        toast.success(t('cherryPick.success'))
        setShowCherryPickDialog(false)
        loadCommits(false)
      } else if (result.hasConflicts) {
        toast.warning(t('cherryPick.conflicts'))
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      toast.error(t('cherryPick.failed', { error: errorMsg }))
    } finally {
      setIsCherryPicking(false)
    }
  }, [currentWorkspace, cherryPickTarget, cherryPick, toast, t, loadCommits])

  // 中止 Cherry-pick
  const handleCherryPickAbort = useCallback(async () => {
    if (!currentWorkspace) return

    setIsCherryPicking(true)
    try {
      await cherryPickAbort(currentWorkspace.path)
      toast.info(t('cherryPick.aborted'))
      setShowCherryPickDialog(false)
      setCherryPickResult(null)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      toast.error(t('cherryPick.abortFailed', { error: errorMsg }))
    } finally {
      setIsCherryPicking(false)
    }
  }, [currentWorkspace, cherryPickAbort, toast, t])

  // 继续 Cherry-pick
  const handleCherryPickContinue = useCallback(async () => {
    if (!currentWorkspace) return

    setIsCherryPicking(true)
    try {
      const result = await cherryPickContinue(currentWorkspace.path)
      setCherryPickResult(result)

      if (result.success && !result.hasConflicts) {
        toast.success(t('cherryPick.success'))
        setShowCherryPickDialog(false)
        loadCommits(false)
      } else if (result.hasConflicts) {
        toast.warning(t('cherryPick.stillConflicts'))
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      toast.error(t('cherryPick.continueFailed', { error: errorMsg }))
    } finally {
      setIsCherryPicking(false)
    }
  }, [currentWorkspace, cherryPickContinue, toast, t, loadCommits])

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return t('history.justNow')
    if (diffMins < 60) return t('history.minutesAgo', { count: diffMins })
    if (diffHours < 24) return t('history.hoursAgo', { count: diffHours })
    if (diffDays < 7) return t('history.daysAgo', { count: diffDays })
    return date.toLocaleDateString()
  }

  // 渲染单个提交项
  const CommitItem = useCallback(({ commit }: { commit: GitCommitType }) => (
    <div
      onClick={() => setSelectedCommit(commit)}
      className={`px-4 py-3 cursor-pointer hover:bg-background-hover transition-colors border-b border-border-subtle ${
        selectedCommit?.sha === commit.sha ? 'bg-primary/5' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
          <GitCommit size={12} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-text-tertiary bg-background-surface px-1.5 py-0.5 rounded">
              {commit.shortSha}
            </span>
          </div>
          <div className="text-sm text-text-primary font-medium truncate mb-1">
            {commit.message.split('\n')[0]}
          </div>
          <div className="flex items-center gap-3 text-xs text-text-tertiary">
            <span className="flex items-center gap-1">
              <User size={10} />
              {commit.author}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {formatTime(commit.timestamp)}
            </span>
          </div>
        </div>
        <ChevronRight size={14} className="text-text-tertiary flex-shrink-0" />
      </div>
    </div>
  ), [selectedCommit?.sha])

  // 渲染底部加载更多指示器
  const Footer = useCallback(() => {
    if (searchQuery.trim()) return null // 搜索模式下不显示加载更多
    if (isLoadingMore) {
      return (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={16} className="animate-spin text-text-tertiary" />
          <span className="ml-2 text-xs text-text-tertiary">{t('history.loadingMore')}</span>
        </div>
      )
    }
    if (!hasMore && commits.length > 0) {
      return (
        <div className="flex items-center justify-center py-4 text-xs text-text-tertiary">
          {t('history.noMore')}
        </div>
      )
    }
    return null
  }, [isLoadingMore, hasMore, commits.length, searchQuery, t])

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b border-border-subtle flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-text-primary shrink-0">
          {t('history.title')}
          {commits.length > 0 && (
            <span className="ml-2 text-xs text-text-tertiary">({commits.length})</span>
          )}
        </span>
        <div className="flex-1 max-w-[200px]">
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('history.searchPlaceholder')}
              className="w-full pl-7 pr-6 py-1 text-xs bg-background-surface border border-border-subtle rounded focus:outline-none focus:border-primary text-text-primary placeholder:text-text-tertiary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-text-tertiary hover:text-text-primary rounded"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="p-1 text-text-tertiary hover:text-text-primary hover:bg-background-hover rounded transition-colors disabled:opacity-50 shrink-0"
          title={t('refresh', { ns: 'common' })}
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="px-4 py-2 text-xs text-danger bg-danger/10 border-b border-danger/20">
          {error}
        </div>
      )}

      <div className="flex-1">
        {isLoading && commits.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-text-tertiary" />
          </div>
        ) : commits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-text-tertiary">
            <GitCommit size={24} className="mb-2 opacity-50" />
            <span className="text-sm">{t('history.noCommits')}</span>
          </div>
        ) : filteredCommits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-text-tertiary">
            <Search size={24} className="mb-2 opacity-50" />
            <span className="text-sm">{t('history.noSearchResults')}</span>
          </div>
        ) : (
          <Virtuoso
            data={filteredCommits}
            endReached={loadMore}
            itemContent={(_, commit) => <CommitItem commit={commit} />}
            components={{
              Footer,
            }}
            className="h-full"
          />
        )}
      </div>

      {selectedCommit && (
        <div className="border-t border-border-subtle p-4 bg-background-surface">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-text-tertiary">
              {selectedCommit.shortSha}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenCherryPick(selectedCommit)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                title={t('cherryPick.title')}
              >
                <Cherry size={12} />
                {t('cherryPick.button')}
              </button>
              <button
                onClick={() => setSelectedCommit(null)}
                className="text-xs text-text-tertiary hover:text-text-primary"
              >
                {t('close', { ns: 'common' })}
              </button>
            </div>
          </div>
          <div className="text-sm text-text-primary whitespace-pre-wrap">
            {selectedCommit.message}
          </div>
          <div className="mt-2 text-xs text-text-tertiary">
            {selectedCommit.author} · {formatTime(selectedCommit.timestamp)}
          </div>
        </div>
      )}

      {/* Cherry-pick 弹窗 */}
      {showCherryPickDialog && cherryPickTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-surface border border-border-subtle rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b border-border-subtle">
              <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
                <Cherry size={16} className="text-primary" />
                {t('cherryPick.title')}
              </h3>
              <button
                onClick={() => {
                  setShowCherryPickDialog(false)
                  setCherryPickResult(null)
                }}
                className="text-text-tertiary hover:text-text-primary"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4">
              {/* 显示要 cherry-pick 的提交信息 */}
              <div className="mb-4 p-3 bg-background rounded border border-border-subtle">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-text-tertiary bg-background-surface px-1.5 py-0.5 rounded">
                    {cherryPickTarget.shortSha}
                  </span>
                </div>
                <div className="text-sm text-text-primary truncate">
                  {cherryPickTarget.message.split('\n')[0]}
                </div>
                <div className="text-xs text-text-tertiary mt-1">
                  {cherryPickTarget.author}
                </div>
              </div>

              {/* 冲突提示 */}
              {cherryPickResult?.hasConflicts && (
                <div className="mb-4 p-3 bg-warning/10 border border-warning/20 rounded">
                  <div className="flex items-center gap-2 text-warning mb-2">
                    <AlertTriangle size={14} />
                    <span className="text-sm font-medium">{t('cherryPick.conflictTitle')}</span>
                  </div>
                  <div className="text-xs text-text-secondary mb-2">
                    {t('cherryPick.conflictDesc')}
                  </div>
                  {cherryPickResult.conflicts.length > 0 && (
                    <div className="max-h-32 overflow-y-auto">
                      <ul className="text-xs text-text-tertiary space-y-1">
                        {cherryPickResult.conflicts.map((file, idx) => (
                          <li key={idx} className="font-mono">• {file}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex justify-end gap-2">
                {cherryPickResult?.hasConflicts ? (
                  <>
                    <button
                      onClick={handleCherryPickAbort}
                      disabled={isCherryPicking}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-danger/10 text-danger rounded hover:bg-danger/20 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={14} />
                      {t('cherryPick.abort')}
                    </button>
                    <button
                      onClick={handleCherryPickContinue}
                      disabled={isCherryPicking}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {isCherryPicking ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle size={14} />
                      )}
                      {t('cherryPick.continue')}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setShowCherryPickDialog(false)
                        setCherryPickResult(null)
                      }}
                      className="px-3 py-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors"
                    >
                      {t('cancel', { ns: 'common' })}
                    </button>
                    <button
                      onClick={handleCherryPick}
                      disabled={isCherryPicking}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {isCherryPicking && <Loader2 size={14} className="animate-spin" />}
                      {t('cherryPick.confirm')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
