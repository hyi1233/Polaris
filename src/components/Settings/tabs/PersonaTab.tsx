/**
 * PersonaTab - 角色管理设置页
 *
 * 浏览、创建、编辑、删除、导入导出角色
 */

import React, { useState, useCallback, useMemo, useRef } from 'react'
import {
  Plus,
  Search,
  Star,
  Upload,
} from 'lucide-react'
import { clsx } from 'clsx'
import { usePersonaStore } from '../../../stores/personaStore'
import { PERSONA_CATEGORIES, type Persona, type CreatePersonaParams } from '../../../types/persona'
import { PersonaCard } from '../../Persona/PersonaCard'
import { PersonaCreateModal } from '../../Persona/PersonaCreateModal'

type FilterCategory = 'all' | string

export function PersonaTab() {
  const {
    personas,
    selectedPersonaId,
    favoriteIds,
    selectPersona,
    toggleFavorite,
    createPersona,
    updatePersona,
    deletePersona,
    exportPersona,
    importPersona,
  } = usePersonaStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPersona, setEditingPersona] = useState<Persona | undefined>(undefined)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 过滤和搜索
  const filteredPersonas = useMemo(() => {
    let result = personas

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(q)
        || p.description.toLowerCase().includes(q)
        || p.tags?.some(t => t.toLowerCase().includes(q))
      )
    }

    if (showFavoritesOnly) {
      result = result.filter(p => favoriteIds.includes(p.id))
    }

    if (filterCategory !== 'all') {
      result = result.filter(p => p.category === filterCategory)
    }

    return result
  }, [personas, searchQuery, filterCategory, showFavoritesOnly, favoriteIds])

  // 按分类分组
  const groupedPersonas = useMemo(() => {
    const groups: { category: string; label: string; icon: string; personas: Persona[] }[] = []

    for (const cat of PERSONA_CATEGORIES) {
      const catPersonas = filteredPersonas.filter(p => p.category === cat.id)
      if (catPersonas.length > 0) {
        groups.push({
          category: cat.id,
          label: cat.name,
          icon: cat.icon,
          personas: catPersonas,
        })
      }
    }

    return groups
  }, [filteredPersonas])

  // 处理创建/编辑提交
  const handleSubmit = useCallback((params: CreatePersonaParams) => {
    if (editingPersona) {
      updatePersona({ id: editingPersona.id, ...params })
    } else {
      const persona = createPersona(params)
      selectPersona(persona.id)
    }
    setEditingPersona(undefined)
  }, [editingPersona, createPersona, updatePersona, selectPersona])

  // 处理删除
  const handleDelete = useCallback((id: string) => {
    deletePersona(id)
    setConfirmDeleteId(null)
  }, [deletePersona])

  // 处理导出
  const handleExport = useCallback((id: string) => {
    const json = exportPersona(id)
    if (!json) return

    const persona = personas.find(p => p.id === id)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `persona-${persona?.name || id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [exportPersona, personas])

  // 处理导入
  const handleImport = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        if (data.name && data.systemPrompt) {
          importPersona(data as Persona)
        }
      } catch {
        // Invalid JSON
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [importPersona])

  // 当前选中角色
  const activePersona = personas.find(p => p.id === selectedPersonaId)

  return (
    <div className="h-full flex flex-col">
      {/* 顶部：当前角色 + 操作按钮 */}
      <div className="px-4 py-3 border-b border-border-subtle space-y-3">
        {/* 当前角色指示 */}
        {activePersona && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
            <span className="text-lg">{activePersona.avatar}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-primary">当前角色：{activePersona.name}</div>
              <div className="text-[10px] text-text-tertiary truncate">{activePersona.description}</div>
            </div>
            <button
              onClick={() => selectPersona('')}
              className="text-[10px] px-2 py-1 rounded text-text-tertiary hover:text-text-primary hover:bg-background-hover transition-colors"
            >
              取消选择
            </button>
          </div>
        )}

        {/* 搜索 + 筛选 */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索角色..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-surface border border-border-subtle rounded-lg focus:outline-none focus:border-primary text-text-primary placeholder-text-muted"
            />
          </div>

          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              showFavoritesOnly
                ? 'text-yellow-500 bg-yellow-500/10'
                : 'text-text-muted hover:text-text-primary hover:bg-background-hover',
            )}
            title="只看收藏"
          >
            <Star size={16} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* 分类筛选 */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterCategory('all')}
            className={clsx(
              'px-2.5 py-1 text-xs rounded-lg transition-colors',
              filterCategory === 'all'
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-text-tertiary hover:text-text-primary hover:bg-background-hover',
            )}
          >
            全部 ({personas.length})
          </button>
          {PERSONA_CATEGORIES.map(cat => {
            const count = personas.filter(p => p.category === cat.id).length
            if (count === 0) return null
            return (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={clsx(
                  'px-2.5 py-1 text-xs rounded-lg transition-colors',
                  filterCategory === cat.id
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-text-tertiary hover:text-text-primary hover:bg-background-hover',
                )}
              >
                {cat.icon} {cat.name} ({count})
              </button>
            )
          })}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setEditingPersona(undefined); setShowCreateModal(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:opacity-90 transition-colors"
          >
            <Plus size={14} />
            创建角色
          </button>
          <button
            onClick={handleImport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-background-hover rounded-lg transition-colors"
          >
            <Upload size={14} />
            导入
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* 角色网格 */}
      <div className="flex-1 overflow-y-auto p-4">
        {groupedPersonas.length === 0 ? (
          <div className="py-12 text-center text-sm text-text-muted">
            <p>没有找到匹配的角色</p>
            <button
              onClick={() => { setEditingPersona(undefined); setShowCreateModal(true) }}
              className="mt-3 text-primary text-xs hover:underline"
            >
              创建一个新角色
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedPersonas.map(group => (
              <div key={group.category}>
                <h3 className="text-xs font-medium text-text-muted mb-2 flex items-center gap-1">
                  <span>{group.icon}</span>
                  <span>{group.label}</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {group.personas.map((persona: Persona) => (
                    <PersonaCard
                      key={persona.id}
                      persona={persona}
                      isSelected={selectedPersonaId === persona.id}
                      isFavorite={favoriteIds.includes(persona.id)}
                      onSelect={(p: Persona) => selectPersona(p.id)}
                      onToggleFavorite={toggleFavorite}
                      onEdit={!persona.isBuiltin ? (p: Persona) => { setEditingPersona(p); setShowCreateModal(true) } : undefined}
                      onDelete={!persona.isBuiltin ? (id: string) => setConfirmDeleteId(id) : undefined}
                      onExport={handleExport}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 创建/编辑弹窗 */}
      <PersonaCreateModal
        persona={editingPersona}
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setEditingPersona(undefined) }}
        onSubmit={handleSubmit}
      />

      {/* 删除确认 */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative bg-background-elevated rounded-xl shadow-2xl border border-border p-6 w-80">
            <h3 className="text-sm font-semibold text-text-primary mb-2">确认删除</h3>
            <p className="text-xs text-text-secondary mb-4">
              确定要删除这个角色吗？此操作不可恢复。
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-background-hover rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:opacity-90 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PersonaTab
