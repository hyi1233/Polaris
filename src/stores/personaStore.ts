/**
 * 角色系统 Store
 *
 * 管理角色的选择、自定义、收藏等状态
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  BUILTIN_PERSONAS,
  PERSONA_CATEGORIES,
  type Persona,
  type PersonaCategory,
  type CreatePersonaParams,
  type UpdatePersonaParams,
} from '../types/persona'

// ============================================
// Store 类型
// ============================================

interface PersonaState {
  /** 所有角色（内置 + 自定义） */
  personas: Persona[]
  /** 当前选中的角色 ID（空字符串表示未选中，使用默认模式） */
  selectedPersonaId: string
  /** 收藏的角色 ID 列表 */
  favoriteIds: string[]

  // ──── 计算属性 ────

  /** 获取当前选中的角色 */
  getSelectedPersona: () => Persona | null
  /** 根据 ID 获取角色 */
  getPersonaById: (id: string) => Persona | undefined
  /** 获取指定分类的角色列表 */
  getPersonasByCategory: (category: PersonaCategory) => Persona[]
  /** 获取收藏的角色列表 */
  getFavoritePersonas: () => Persona[]
  /** 搜索角色 */
  searchPersonas: (query: string) => Persona[]

  // ──── 操作 ────

  /** 选择角色 */
  selectPersona: (id: string) => void
  /** 清除角色选择（回到默认模式） */
  clearPersona: () => void
  /** 切换收藏 */
  toggleFavorite: (id: string) => void

  // ──── 自定义角色 CRUD ────

  /** 创建自定义角色 */
  createPersona: (params: CreatePersonaParams) => Persona
  /** 更新自定义角色 */
  updatePersona: (params: UpdatePersonaParams) => Persona | null
  /** 删除自定义角色 */
  deletePersona: (id: string) => boolean
  /** 导入角色 */
  importPersona: (persona: Persona) => Persona
  /** 导出角色 */
  exportPersona: (id: string) => string | null
}

// ============================================
// Store 实现
// ============================================

/** 生成唯一 ID */
function generateId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const usePersonaStore = create<PersonaState>()(
  persist(
    (set, get) => ({
      personas: [...BUILTIN_PERSONAS],
      selectedPersonaId: '',
      favoriteIds: [],

      // ──── 计算属性 ────

      getSelectedPersona: () => {
        const { personas, selectedPersonaId } = get()
        if (!selectedPersonaId) return null
        return personas.find(p => p.id === selectedPersonaId) || null
      },

      getPersonaById: (id: string) => {
        return get().personas.find(p => p.id === id)
      },

      getPersonasByCategory: (category: PersonaCategory) => {
        return get().personas.filter(p => p.category === category)
      },

      getFavoritePersonas: () => {
        const { personas, favoriteIds } = get()
        return personas.filter(p => favoriteIds.includes(p.id))
      },

      searchPersonas: (query: string) => {
        const q = query.toLowerCase()
        return get().personas.filter(p =>
          p.name.toLowerCase().includes(q)
          || p.description.toLowerCase().includes(q)
          || p.tags?.some(t => t.toLowerCase().includes(q))
          || p.expertise?.some(e => e.toLowerCase().includes(q))
        )
      },

      // ──── 操作 ────

      selectPersona: (id: string) => {
        set({ selectedPersonaId: id })
      },

      clearPersona: () => {
        set({ selectedPersonaId: '' })
      },

      toggleFavorite: (id: string) => {
        set((state) => {
          const isFav = state.favoriteIds.includes(id)
          return {
            favoriteIds: isFav
              ? state.favoriteIds.filter(fid => fid !== id)
              : [...state.favoriteIds, id],
          }
        })
      },

      // ──── 自定义角色 CRUD ────

      createPersona: (params: CreatePersonaParams) => {
        const now = new Date().toISOString()
        const persona: Persona = {
          id: generateId(),
          ...params,
          isBuiltin: false,
          isFavorite: false,
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({
          personas: [...state.personas, persona],
        }))
        return persona
      },

      updatePersona: (params: UpdatePersonaParams) => {
        const { id, ...updates } = params
        let updated: Persona | null = null
        set((state) => ({
          personas: state.personas.map(p => {
            if (p.id === id) {
              updated = {
                ...p,
                ...updates,
                updatedAt: new Date().toISOString(),
              }
              return updated
            }
            return p
          }),
        }))
        return updated
      },

      deletePersona: (id: string) => {
        const persona = get().getPersonaById(id)
        if (!persona || persona.isBuiltin) return false

        set((state) => ({
          personas: state.personas.filter(p => p.id !== id),
          selectedPersonaId: state.selectedPersonaId === id ? '' : state.selectedPersonaId,
          favoriteIds: state.favoriteIds.filter(fid => fid !== id),
        }))
        return true
      },

      importPersona: (persona: Persona) => {
        const now = new Date().toISOString()
        const imported: Persona = {
          ...persona,
          id: generateId(),
          isBuiltin: false,
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({
          personas: [...state.personas, imported],
        }))
        return imported
      },

      exportPersona: (id: string) => {
        const persona = get().getPersonaById(id)
        if (!persona) return null
        return JSON.stringify(persona, null, 2)
      },
    }),
    {
      name: 'polaris-persona-store',
      partialize: (state) => ({
        // 只持久化自定义角色和用户选择，内置角色每次从代码加载
        personas: state.personas.filter(p => !p.isBuiltin),
        selectedPersonaId: state.selectedPersonaId,
        favoriteIds: state.favoriteIds,
      }),
      // 合并持久化数据和内置角色
      merge: (persisted, current) => {
        const saved = persisted as Partial<PersonaState>
        const customPersonas = saved.personas || []
        return {
          ...current,
          personas: [...BUILTIN_PERSONAS, ...customPersonas],
          selectedPersonaId: saved.selectedPersonaId || '',
          favoriteIds: saved.favoriteIds || [],
        }
      },
    }
  )
)

// ============================================
// 便捷 hooks
// ============================================

/** 获取所有分类信息（带角色数量） */
export function usePersonaCategories() {
  const personas = usePersonaStore(s => s.personas)
  return PERSONA_CATEGORIES.map(cat => ({
    ...cat,
    count: personas.filter(p => p.category === cat.id).length,
  }))
}
