/**
 * 编辑器缓冲区存储
 *
 * 管理多文件缓冲区缓存，支持 Tab 切换时保留文件内容和编辑状态。
 * LRU 淘汰策略，上限 10 个缓冲区。
 */

import { create } from 'zustand'
import type { EditorState } from '@codemirror/state'
import { createLogger } from '../utils/logger'

const log = createLogger('EditorBuffer')

/** 缓冲区条目 */
export interface BufferEntry {
  /** 文件名 */
  name: string
  /** 语言类型 */
  language: string
  /** 最新内容（可能与磁盘不同步） */
  content: string
  /** 原始内容（上次保存/加载时的内容） */
  originalContent: string
  /** 是否有未保存修改 */
  isModified: boolean
  /** CM6 EditorState（保留 undo 历史、光标、折叠等） */
  editorState?: EditorState
}

interface EditorBufferState {
  /** 缓冲区 Map */
  buffers: Map<string, BufferEntry>
  /** 访问顺序（LRU），最近访问的在后 */
  accessOrder: string[]
  /** 最大缓冲区数量 */
  maxBuffers: number
}

interface EditorBufferActions {
  /** 保存缓冲区 */
  saveBuffer: (filePath: string, entry: BufferEntry) => void
  /** 加载缓冲区 */
  loadBuffer: (filePath: string) => BufferEntry | null
  /** 检查是否存在 */
  hasBuffer: (filePath: string) => boolean
  /** 移除缓冲区 */
  removeBuffer: (filePath: string) => void
  /** 更新缓冲区内容（不更新 editorState） */
  updateContent: (filePath: string, content: string) => void
  /** 保存 CM6 EditorState */
  saveEditorState: (filePath: string, state: EditorState) => void
  /** 清空所有缓冲区 */
  clearAll: () => void
}

export type EditorBufferStore = EditorBufferState & EditorBufferActions

const MAX_BUFFERS = 10

export const useEditorBufferStore = create<EditorBufferStore>()(
  (set, get) => ({
    buffers: new Map(),
    accessOrder: [],
    maxBuffers: MAX_BUFFERS,

    saveBuffer: (filePath: string, entry: BufferEntry) => {
      set((state) => {
        const buffers = new Map(state.buffers)
        const accessOrder = state.accessOrder.filter(p => p !== filePath)

        // LRU 淘汰
        while (buffers.size >= state.maxBuffers && !buffers.has(filePath)) {
          const oldest = accessOrder.shift()
          if (oldest) {
            buffers.delete(oldest)
            log.debug('LRU 淘汰缓冲区', { path: oldest })
          }
        }

        buffers.set(filePath, entry)
        accessOrder.push(filePath)

        return { buffers, accessOrder }
      })
    },

    loadBuffer: (filePath: string) => {
      const { buffers, accessOrder } = get()
      const entry = buffers.get(filePath)
      if (!entry) return null

      // 更新访问顺序
      const newOrder = accessOrder.filter(p => p !== filePath)
      newOrder.push(filePath)
      set({ accessOrder: newOrder })

      return entry
    },

    hasBuffer: (filePath: string) => {
      return get().buffers.has(filePath)
    },

    removeBuffer: (filePath: string) => {
      set((state) => {
        const buffers = new Map(state.buffers)
        buffers.delete(filePath)
        const accessOrder = state.accessOrder.filter(p => p !== filePath)
        return { buffers, accessOrder }
      })
    },

    updateContent: (filePath: string, content: string) => {
      set((state) => {
        const buffers = new Map(state.buffers)
        const entry = buffers.get(filePath)
        if (entry) {
          buffers.set(filePath, {
            ...entry,
            content,
            isModified: content !== entry.originalContent,
          })
        }
        return { buffers }
      })
    },

    saveEditorState: (filePath: string, editorState: EditorState) => {
      set((state) => {
        const buffers = new Map(state.buffers)
        const entry = buffers.get(filePath)
        if (entry) {
          buffers.set(filePath, { ...entry, editorState })
        }
        return { buffers }
      })
    },

    clearAll: () => {
      set({ buffers: new Map(), accessOrder: [] })
    },
  })
)
