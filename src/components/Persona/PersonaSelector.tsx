/**
 * PersonaSelector - 角色选择器组件
 *
 * 用于在聊天区域快速选择/切换角色
 * 紧凑设计，集成到 ChatStatusBar 或 ChatInput 附近
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { ChevronDown, Star, Search, X, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'
import { usePersonaStore } from '../../stores/personaStore'
import {
  PERSONA_CATEGORIES,
  type Persona,
} from '../../types/persona'

interface PersonaSelectorProps {
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义类名 */
  className?: string
}

export function PersonaSelector({ disabled = false, className }: PersonaSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const {
    personas,
    selectedPersonaId,
    selectPersona,
    clearPersona,
    getPersonaById,
    favoriteIds,
    toggleFavorite,
  } = usePersonaStore()

  const selectedPersona = selectedPersonaId ? getPersonaById(selectedPersonaId) : null

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 打开时聚焦搜索框
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  // 过滤角色
  const filteredPersonas = useMemo(() => {
    if (!searchQuery.trim()) return personas
    const q = searchQuery.toLowerCase()
    return personas.filter(p =>
      p.name.toLowerCase().includes(q)
      || p.description.toLowerCase().includes(q)
      || p.tags?.some(t => t.toLowerCase().includes(q))
    )
  }, [personas, searchQuery])

  // 按分类分组
  const groupedPersonas = useMemo(() => {
    const groups: Record<string, Persona[]> = {}

    // 收藏组
    const favPersonas = filteredPersonas.filter(p => favoriteIds.includes(p.id))
    if (favPersonas.length > 0) {
      groups['favorites'] = favPersonas
    }

    // 按分类
    for (const cat of PERSONA_CATEGORIES) {
      const catPersonas = filteredPersonas.filter(p => p.category === cat.id)
      if (catPersonas.length > 0) {
        groups[cat.id] = catPersonas
      }
    }

    return groups
  }, [filteredPersonas, favoriteIds])

  const handleSelect = useCallback((persona: Persona) => {
    if (selectedPersonaId === persona.id) {
      clearPersona()
    } else {
      selectPersona(persona.id)
    }
    setIsOpen(false)
    setSearchQuery('')
  }, [selectedPersonaId, selectPersona, clearPersona])

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    clearPersona()
  }, [clearPersona])

  // 分类显示名称
  const getCategoryLabel = (catId: string): { name: string; icon: string } => {
    if (catId === 'favorites') return { name: '收藏', icon: '⭐' }
    const cat = PERSONA_CATEGORIES.find(c => c.id === catId)
    return cat ? { name: cat.name, icon: cat.icon } : { name: catId, icon: '📌' }
  }

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      {/* 触发按钮 */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={clsx(
          'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all duration-150',
          'border border-transparent',
          disabled
            ? 'text-text-muted cursor-not-allowed opacity-50'
            : 'hover:bg-background-hover hover:border-border-subtle',
          selectedPersona && 'bg-primary/5 border-primary/20 text-primary',
          !selectedPersona && 'text-text-tertiary',
          isOpen && 'bg-background-hover border-border-subtle',
        )}
        title={selectedPersona ? selectedPersona.name : '选择角色'}
      >
        <span className="text-sm">{selectedPersona?.avatar || '🤖'}</span>
        <span className="max-w-[72px] truncate font-medium">
          {selectedPersona?.name || '角色'}
        </span>
        {selectedPersona && (
          <button
            onClick={handleClear}
            className="ml-0.5 p-0.5 rounded hover:bg-background-hover text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={10} />
          </button>
        )}
        {!selectedPersona && (
          <ChevronDown size={12} className="opacity-50" />
        )}
      </button>

      {/* 下拉面板 */}
      {isOpen && (
        <div className={clsx(
          'absolute bottom-full left-0 mb-1',
          'w-[320px] max-h-[400px]',
          'bg-background-elevated border border-border rounded-xl shadow-xl',
          'z-50 flex flex-col',
          'animate-in fade-in slide-in-from-bottom-2 duration-150',
        )}>
          {/* 搜索栏 */}
          <div className="p-2 border-b border-border-subtle">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索角色..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-border-subtle rounded-lg focus:outline-none focus:border-primary text-text-primary placeholder-text-muted"
              />
            </div>
          </div>

          {/* 角色列表 */}
          <div className="flex-1 overflow-y-auto p-1">
            {/* 无角色选项（默认模式） */}
            <button
              onClick={() => { clearPersona(); setIsOpen(false); setSearchQuery('') }}
              className={clsx(
                'w-full px-3 py-2 text-left text-xs rounded-lg transition-colors flex items-center gap-2',
                !selectedPersonaId
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-background-hover text-text-secondary',
              )}
            >
              <span className="text-sm">🤖</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium">默认助手</div>
                <div className="text-text-tertiary text-[10px] truncate">不使用角色，保持标准 AI 助手行为</div>
              </div>
            </button>

            {/* 分组角色 */}
            {Object.entries(groupedPersonas).map(([catId, catPersonas]) => {
              const { name: catName, icon: catIcon } = getCategoryLabel(catId)
              return (
                <div key={catId} className="mt-1">
                  <div className="px-3 py-1 text-[10px] text-text-muted font-medium uppercase tracking-wider flex items-center gap-1">
                    <span>{catIcon}</span>
                    <span>{catName}</span>
                    <span className="text-text-muted/50">({catPersonas.length})</span>
                  </div>
                  {catPersonas.map(persona => (
                    <button
                      key={persona.id}
                      onClick={() => handleSelect(persona)}
                      className={clsx(
                        'w-full px-3 py-2 text-left text-xs rounded-lg transition-colors flex items-center gap-2 group',
                        selectedPersonaId === persona.id
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-background-hover',
                      )}
                    >
                      <span className="text-base flex-shrink-0">{persona.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{persona.name}</div>
                        <div className="text-text-tertiary text-[10px] truncate">{persona.description}</div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(persona.id) }}
                        className={clsx(
                          'p-1 rounded transition-opacity flex-shrink-0',
                          favoriteIds.includes(persona.id)
                            ? 'text-yellow-500 opacity-100'
                            : 'text-text-muted opacity-0 group-hover:opacity-60 hover:!opacity-100',
                        )}
                      >
                        <Star size={12} fill={favoriteIds.includes(persona.id) ? 'currentColor' : 'none'} />
                      </button>
                    </button>
                  ))}
                </div>
              )
            })}

            {/* 空状态 */}
            {filteredPersonas.length === 0 && (
              <div className="py-6 text-center text-xs text-text-muted">
                <Sparkles size={20} className="mx-auto mb-2 opacity-30" />
                <p>没有找到匹配的角色</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default PersonaSelector
