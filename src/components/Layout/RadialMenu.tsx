/**
 * RadialMenu - 扇形菜单组件
 *
 * 点击触发器后展开的扇形菜单，包含侧边栏功能按钮
 * 支持动画展开、点击外部关闭
 */

import { useRef, useEffect } from 'react'
import { Files, GitPullRequest, CheckSquare, Settings, Languages, Clock, Terminal, Code2, PanelRight } from 'lucide-react'
import { useViewStore, LeftPanelType } from '@/stores/viewStore'
import { useTranslation } from 'react-i18next'

interface RadialMenuProps {
  /** 是否显示 */
  isOpen: boolean
  /** 关闭菜单回调 */
  onClose: () => void
  /** 打开设置的回调 */
  onOpenSettings?: () => void
  /** 切换右侧面板的回调 */
  onToggleRightPanel?: () => void
  /** 右侧面板是否折叠 */
  rightPanelCollapsed?: boolean
}

interface MenuItem {
  id: LeftPanelType | 'settings' | 'rightPanel'
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  onClick: () => void
}

export function RadialMenu({
  isOpen,
  onClose,
  onOpenSettings,
  onToggleRightPanel,
  rightPanelCollapsed
}: RadialMenuProps) {
  const { t } = useTranslation('common')
  const leftPanelType = useViewStore((state) => state.leftPanelType)
  const toggleLeftPanel = useViewStore((state) => state.toggleLeftPanel)
  const menuRef = useRef<HTMLDivElement>(null)

  // 构建菜单项
  const menuItems: MenuItem[] = [
    {
      id: 'files',
      icon: Files,
      label: t('labels.fileExplorer'),
      onClick: () => {
        toggleLeftPanel('files')
        onClose()
      }
    },
    {
      id: 'git',
      icon: GitPullRequest,
      label: t('labels.gitPanel'),
      onClick: () => {
        toggleLeftPanel('git')
        onClose()
      }
    },
    {
      id: 'todo',
      icon: CheckSquare,
      label: t('labels.todoPanel'),
      onClick: () => {
        toggleLeftPanel('todo')
        onClose()
      }
    },
    {
      id: 'translate',
      icon: Languages,
      label: t('labels.translatePanel'),
      onClick: () => {
        toggleLeftPanel('translate')
        onClose()
      }
    },
    {
      id: 'scheduler',
      icon: Clock,
      label: t('labels.schedulerPanel'),
      onClick: () => {
        toggleLeftPanel('scheduler')
        onClose()
      }
    },
    {
      id: 'terminal',
      icon: Terminal,
      label: t('labels.terminalPanel'),
      onClick: () => {
        toggleLeftPanel('terminal')
        onClose()
      }
    },
    {
      id: 'developer',
      icon: Code2,
      label: t('labels.developerPanel'),
      onClick: () => {
        toggleLeftPanel('developer')
        onClose()
      }
    },
    {
      id: 'rightPanel',
      icon: PanelRight,
      label: rightPanelCollapsed ? t('labels.showAIPanel') : t('labels.hideAIPanel'),
      onClick: () => {
        onToggleRightPanel?.()
        onClose()
      }
    },
    {
      id: 'settings',
      icon: Settings,
      label: t('labels.settings'),
      onClick: () => {
        onOpenSettings?.()
        onClose()
      }
    }
  ]

  // 点击外部关闭菜单
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }

    // 延迟添加监听，避免立即关闭
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // ESC 键关闭菜单
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // 扇形菜单项的位置计算
  // 从悬浮球位置（左中上方）向右下展开扇形
  const itemCount = menuItems.length
  const startAngle = 0 // 从右边开始
  const endAngle = 180 // 展开到下方（半圆）
  const angleRange = endAngle - startAngle
  const radius = 100 // 半径（像素）

  return (
    <div
      ref={menuRef}
      className="fixed z-50 animate-in fade-in duration-150"
      style={{
        // 菜单展开位置：悬浮球右侧
        left: '56px',
        top: '80px' // 与悬浮球对齐
      }}
    >
      {/* 菜单项容器 - 半圆展开 */}
      <div className="relative" style={{ width: radius + 60, height: radius + 60 }}>
        {menuItems.map((item, index) => {
          // 计算角度（从右向下半圆展开）
          const angle = startAngle + (angleRange / (itemCount - 1)) * index
          const radian = (angle * Math.PI) / 180
          const x = Math.cos(radian) * radius
          const y = Math.sin(radian) * radius

          const isActive = item.id === leftPanelType ||
            (item.id === 'rightPanel' && !rightPanelCollapsed)

          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`
                absolute w-11 h-11 rounded-xl flex items-center justify-center
                transition-all duration-200 ease-out transform
                hover:scale-110
                ${isActive
                  ? 'bg-primary/20 text-primary border border-primary/30 shadow-md'
                  : 'bg-background-surface text-text-secondary hover:text-text-primary hover:bg-background-hover border border-border shadow-sm'
                }
              `}
              style={{
                left: x,
                top: y,
                animationDelay: `${index * 20}ms`
              }}
              title={item.label}
            >
              <item.icon size={18} className={isActive ? 'text-primary' : ''} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * RadialMenuTrigger - 扇形菜单触发器（悬浮球）
 * 位置：左中上方
 */
export function RadialMenuTrigger({
  onClick,
  isOpen
}: {
  onClick: () => void
  isOpen: boolean
}) {
  const { t } = useTranslation('common')

  return (
    <button
      onClick={onClick}
      className={`
        fixed left-4 w-10 h-10 rounded-full
        flex items-center justify-center shadow-lg
        transition-all duration-200 ease-out z-40 group
        ${isOpen
          ? 'bg-primary-hover scale-110 shadow-xl'
          : 'bg-primary hover:bg-primary-hover hover:scale-110 hover:shadow-xl'
        }
      `}
      style={{
        top: '80px' // 左中上方位置
      }}
      title={t('labels.showActivityBar')}
    >
      <div className={`
        w-5 h-5 flex flex-col items-center justify-center gap-0.5
        transition-transform duration-200
        ${isOpen ? 'rotate-45' : 'group-hover:scale-110'}
      `}>
        <div className={`w-3 h-0.5 bg-white rounded-full transition-all duration-200 ${isOpen ? 'rotate-90 absolute' : ''}`} />
        <div className={`w-3 h-0.5 bg-white rounded-full transition-all duration-200 ${isOpen ? 'opacity-0' : ''}`} />
        <div className={`w-3 h-0.5 bg-white rounded-full transition-all duration-200 ${isOpen ? '-rotate-90 absolute' : ''}`} />
      </div>
    </button>
  )
}
