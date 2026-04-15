/**
 * PersonaCreateModal - 创建/编辑角色弹窗
 */

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { clsx } from 'clsx'
import {
  PERSONA_CATEGORIES,
  type Persona,
  type PersonaCategory,
  type CreatePersonaParams,
} from '../../types/persona'

interface PersonaCreateModalProps {
  /** 编辑模式时传入已有角色 */
  persona?: Persona
  /** 是否显示 */
  isOpen: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 提交回调 */
  onSubmit: (params: CreatePersonaParams) => void
}

/** 常用头像选择 */
const AVATAR_OPTIONS = [
  '🎓', '🔍', '🐛', '🛡️', '⚙️', '🌸', '🌅', '🧘', '🎯', '✍️',
  '👨‍🏫', '🏆', '📋', '📝', '🎨', '💡', '🚀', '🔧', '🧪', '📊',
  '🎪', '🎭', '🤝', '💪', '🔮', '📖', '🌊', '🎵', '🌟', '🍀',
]

export function PersonaCreateModal({
  persona,
  isOpen,
  onClose,
  onSubmit,
}: PersonaCreateModalProps) {
  const isEdit = !!persona

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [avatar, setAvatar] = useState('🎨')
  const [category, setCategory] = useState<PersonaCategory>('custom')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [speakingStyle, setSpeakingStyle] = useState('')
  const [greeting, setGreeting] = useState('')
  const [tags, setTags] = useState('')
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  // 编辑模式时填充数据
  useEffect(() => {
    if (persona) {
      setName(persona.name)
      setDescription(persona.description)
      setAvatar(persona.avatar)
      setCategory(persona.category)
      setSystemPrompt(persona.systemPrompt)
      setSpeakingStyle(persona.speakingStyle || '')
      setGreeting(persona.greeting || '')
      setTags(persona.tags?.join(', ') || '')
    } else {
      setName('')
      setDescription('')
      setAvatar('🎨')
      setCategory('custom')
      setSystemPrompt('')
      setSpeakingStyle('')
      setGreeting('')
      setTags('')
    }
  }, [persona, isOpen])

  const handleSubmit = () => {
    if (!name.trim() || !systemPrompt.trim()) return

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      avatar,
      category,
      systemPrompt: systemPrompt.trim(),
      speakingStyle: speakingStyle.trim() || undefined,
      greeting: greeting.trim() || undefined,
      tags: tags.trim()
        ? tags.split(',').map(t => t.trim()).filter(Boolean)
        : undefined,
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 弹窗 */}
      <div className="relative w-full max-w-lg mx-4 bg-background-elevated rounded-2xl shadow-2xl border border-border overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2 className="text-base font-semibold text-text-primary">
            {isEdit ? '编辑角色' : '创建角色'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-background-hover transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 内容 */}
        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* 头像 + 名称行 */}
          <div className="flex gap-3">
            {/* 头像选择 */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="w-12 h-12 rounded-xl bg-surface border border-border-subtle flex items-center justify-center text-2xl hover:border-primary transition-colors"
              >
                {avatar}
              </button>
              {showAvatarPicker && (
                <div className="absolute top-full left-0 mt-1 p-2 bg-background-elevated border border-border rounded-xl shadow-lg z-10 grid grid-cols-6 gap-1 w-[200px]">
                  {AVATAR_OPTIONS.map(a => (
                    <button
                      key={a}
                      onClick={() => { setAvatar(a); setShowAvatarPicker(false) }}
                      className={clsx(
                        'w-8 h-8 rounded-lg flex items-center justify-center text-base hover:bg-background-hover transition-colors',
                        avatar === a && 'bg-primary/10 border border-primary/30',
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 名称 */}
            <div className="flex-1">
              <label className="block text-xs text-text-secondary mb-1">名称 *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：安全顾问"
                className="w-full px-3 py-2 text-sm bg-surface border border-border-subtle rounded-lg focus:outline-none focus:border-primary text-text-primary placeholder-text-muted"
              />
            </div>
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">描述</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简短描述角色的专长和特点"
              className="w-full px-3 py-2 text-sm bg-surface border border-border-subtle rounded-lg focus:outline-none focus:border-primary text-text-primary placeholder-text-muted"
            />
          </div>

          {/* 分类 */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">分类</label>
            <div className="flex flex-wrap gap-2">
              {PERSONA_CATEGORIES.filter(c => c.id !== 'custom').map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={clsx(
                    'px-3 py-1.5 text-xs rounded-lg border transition-colors',
                    category === cat.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border-subtle text-text-secondary hover:border-border hover:bg-background-hover',
                  )}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* 系统提示词 */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">系统提示词 *</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="定义角色的专业知识、行为准则、工作方式..."
              rows={6}
              className="w-full px-3 py-2 text-sm bg-surface border border-border-subtle rounded-lg focus:outline-none focus:border-primary text-text-primary placeholder-text-muted resize-y"
            />
          </div>

          {/* 说话风格 */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">说话风格（可选）</label>
            <textarea
              value={speakingStyle}
              onChange={(e) => setSpeakingStyle(e.target.value)}
              placeholder="描述角色的说话方式和语气特点..."
              rows={2}
              className="w-full px-3 py-2 text-sm bg-surface border border-border-subtle rounded-lg focus:outline-none focus:border-primary text-text-primary placeholder-text-muted resize-y"
            />
          </div>

          {/* 开场白 */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">开场白（可选）</label>
            <input
              type="text"
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              placeholder="选择角色后的第一条消息"
              className="w-full px-3 py-2 text-sm bg-surface border border-border-subtle rounded-lg focus:outline-none focus:border-primary text-text-primary placeholder-text-muted"
            />
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">标签（逗号分隔）</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="例如：安全, 审计, 合规"
              className="w-full px-3 py-2 text-sm bg-surface border border-border-subtle rounded-lg focus:outline-none focus:border-primary text-text-primary placeholder-text-muted"
            />
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border-subtle">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-background-hover rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !systemPrompt.trim()}
            className={clsx(
              'px-4 py-2 text-sm rounded-lg transition-colors',
              name.trim() && systemPrompt.trim()
                ? 'bg-primary text-white hover:opacity-90'
                : 'bg-background-hover text-text-muted cursor-not-allowed',
            )}
          >
            {isEdit ? '保存' : '创建'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PersonaCreateModal
