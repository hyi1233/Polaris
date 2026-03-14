/**
 * WebviewPanel - Webview 标签页组件
 *
 * 负责管理 Tauri Webview 窗口的显示和交互
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { openUrl } from '@tauri-apps/plugin-opener'
import { ArrowLeft, ArrowRight, RotateCw, ExternalLink, X } from 'lucide-react'
import { useTabStore } from '@/stores/tabStore'

interface WebviewPanelProps {
  tabId: string
  url: string
}

export function WebviewPanel({ tabId, url }: WebviewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentUrl, setCurrentUrl] = useState(url)
  const [inputUrl, setInputUrl] = useState(url)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const closeTab = useTabStore((state) => state.closeTab)

  // 创建并定位 Webview 窗口
  const updateWebviewPosition = useCallback(async () => {
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()

    try {
      await invoke('create_webview_tab', {
        id: tabId,
        url: currentUrl,
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height - 40), // 减去导航栏高度
      })
      setIsLoading(false)
    } catch (e) {
      console.error('创建 Webview 失败:', e)
      setIsLoading(false)
    }
  }, [tabId, currentUrl])

  // 初始化 Webview
  useEffect(() => {
    updateWebviewPosition()

    // 监听窗口大小变化
    const handleResize = () => updateWebviewPosition()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      // 关闭时销毁 Webview
      invoke('close_webview_tab', { id: tabId }).catch(console.error)
    }
  }, [tabId, updateWebviewPosition])

  // 当 URL 变化时更新
  useEffect(() => {
    setCurrentUrl(url)
    setInputUrl(url)
    setIsLoading(true)

    // 导航到新 URL
    invoke('webview_navigate', { id: tabId, url })
      .then(() => setIsLoading(false))
      .catch((e) => {
        console.error('导航失败:', e)
        setIsLoading(false)
      })
  }, [tabId, url])

  // 聚焦输入框
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // 导航操作
  const handleGoBack = async () => {
    await invoke('webview_go_back', { id: tabId })
  }

  const handleGoForward = async () => {
    await invoke('webview_go_forward', { id: tabId })
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    await invoke('webview_refresh', { id: tabId })
    setIsLoading(false)
  }

  const handleOpenExternal = async () => {
    await openUrl(currentUrl)
  }

  const handleClose = () => {
    closeTab(tabId)
  }

  // 开始编辑 URL
  const handleStartEdit = () => {
    setIsEditing(true)
    setInputUrl(currentUrl)
  }

  // 提交 URL
  const handleSubmitUrl = async () => {
    setIsEditing(false)

    let newUrl = inputUrl.trim()

    // 如果没有协议，添加 https://
    if (newUrl && !newUrl.match(/^https?:\/\//)) {
      // 检查是否像域名
      if (newUrl.includes('.') && !newUrl.includes(' ')) {
        newUrl = `https://${newUrl}`
      } else {
        // 否则当作搜索
        newUrl = `https://www.bing.com/search?q=${encodeURIComponent(newUrl)}`
      }
    }

    if (newUrl && newUrl !== currentUrl) {
      setCurrentUrl(newUrl)
      setIsLoading(true)

      try {
        await invoke('webview_navigate', { id: tabId, url: newUrl })
      } catch (e) {
        console.error('导航失败:', e)
      }

      setIsLoading(false)
    }
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false)
    setInputUrl(currentUrl)
  }

  // 键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmitUrl()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 导航栏 */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-background-surface border-b border-border shrink-0">
        {/* 导航按钮 */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleGoBack}
            className="p-1.5 rounded hover:bg-background-hover text-text-secondary hover:text-text-primary transition-colors"
            title="后退"
          >
            <ArrowLeft size={14} />
          </button>
          <button
            onClick={handleGoForward}
            className="p-1.5 rounded hover:bg-background-hover text-text-secondary hover:text-text-primary transition-colors"
            title="前进"
          >
            <ArrowRight size={14} />
          </button>
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded hover:bg-background-hover text-text-secondary hover:text-text-primary transition-colors"
            title="刷新"
          >
            <RotateCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* URL 栏 */}
        <div className="flex-1 mx-2">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSubmitUrl}
              className="w-full px-2 py-1 bg-background-base rounded border border-primary text-xs text-text-primary outline-none"
              placeholder="输入网址或搜索内容..."
            />
          ) : (
            <div
              onClick={handleStartEdit}
              className="flex items-center gap-2 px-2 py-1 bg-background-base rounded border border-border text-xs text-text-secondary truncate cursor-text hover:border-primary/50 transition-colors"
            >
              <span className="truncate">{currentUrl}</span>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleOpenExternal}
            className="p-1.5 rounded hover:bg-background-hover text-text-secondary hover:text-text-primary transition-colors"
            title="在浏览器中打开"
          >
            <ExternalLink size={14} />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 rounded hover:bg-background-hover text-text-secondary hover:text-text-primary transition-colors"
            title="关闭"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Webview 容器 */}
      <div
        ref={containerRef}
        className="flex-1 bg-background-base relative"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background-base z-10">
            <div className="flex items-center gap-2 text-text-secondary">
              <RotateCw size={16} className="animate-spin" />
              <span className="text-sm">加载中...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
