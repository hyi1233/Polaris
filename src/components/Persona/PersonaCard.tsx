/**
 * PersonaCard - 角色卡片组件
 *
 * 展示角色概览信息的卡片，用于角色网格浏览
 */

import { Star, Trash2, Edit3, Copy } from 'lucide-react'
import { clsx } from 'clsx'
import type { Persona } from '../../types/persona'
import { PERSONA_CATEGORIES } from '../../types/persona'

interface PersonaCardProps {
  /** 角色数据 */
  persona: Persona
  /** 是否选中 */
  isSelected?: boolean
  /** 是否收藏 */
  isFavorite?: boolean
  /** 点击选择 */
  onSelect: (persona: Persona) => void
  /** 切换收藏 */
  onToggleFavorite?: (id: string) => void
  /** 编辑 */
  onEdit?: (persona: Persona) => void
  /** 删除 */
  onDelete?: (id: string) => void
  /** 导出 */
  onExport?: (id: string) => void
}

export function PersonaCard({
  persona,
  isSelected = false,
  isFavorite = false,
  onSelect,
  onToggleFavorite,
  onEdit,
  onDelete,
  onExport,
}: PersonaCardProps) {
  const category = PERSONA_CATEGORIES.find(c => c.id === persona.category)

  return (
    <div
      onClick={() => onSelect(persona)}
      className={clsx(
        'relative p-4 rounded-xl border cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5',
        isSelected
          ? 'border-primary/40 bg-primary/5 shadow-sm'
          : 'border-border-subtle bg-surface hover:border-border',
      )}
    >
      {/* 顶部：头像 + 名称 + 收藏 */}
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{persona.avatar}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary truncate">{persona.name}</h3>
            {category && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-background-elevated text-text-tertiary flex-shrink-0">
                {category.icon} {category.name}
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-1 line-clamp-2">{persona.description}</p>
        </div>
        {onToggleFavorite && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(persona.id) }}
            className={clsx(
              'p-1 rounded transition-colors flex-shrink-0',
              isFavorite ? 'text-yellow-500' : 'text-text-muted hover:text-yellow-500',
            )}
          >
            <Star size={14} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>

      {/* 标签 */}
      {persona.tags && persona.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {persona.tags.slice(0, 4).map(tag => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded bg-background-elevated text-text-tertiary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* 操作按钮（仅自定义角色） */}
      {!persona.isBuiltin && (onEdit || onDelete || onExport) && (
        <div className="flex items-center gap-1 mt-3 pt-2 border-t border-border-subtle/50">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(persona) }}
              className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-background-hover transition-colors"
              title="编辑"
            >
              <Edit3 size={12} />
            </button>
          )}
          {onExport && (
            <button
              onClick={(e) => { e.stopPropagation(); onExport(persona.id) }}
              className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-background-hover transition-colors"
              title="导出"
            >
              <Copy size={12} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(persona.id) }}
              className="p-1 rounded text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
              title="删除"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      )}

      {/* 选中标识 */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        </div>
      )}
    </div>
  )
}

export default PersonaCard
