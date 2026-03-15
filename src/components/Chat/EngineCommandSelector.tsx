/**
 * 引擎命令选择器组件
 *
 * 提供可视化的引擎命令选项配置界面
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  EngineCommandOption,
  EngineCommandCategory,
  CommandOptionValue,
} from '../../types/engineCommand'
import { getEngineCommands, getAllOptions } from '../../config/engineCommands'
import { IconSettings, IconX, IconAlertTriangle } from '../Common/Icons'

interface EngineCommandSelectorProps {
  /** 当前引擎 ID */
  engineId: string
  /** 已选择的命令选项 */
  selectedOptions: CommandOptionValue[]
  /** 选项变化回调 */
  onChange: (options: CommandOptionValue[]) => void
  /** 位置样式 */
  position?: { top: number; left: number }
  /** 关闭回调 */
  onClose?: () => void
}

/**
 * 渲染单个选项的输入控件
 */
function OptionInput({
  option,
  value,
  onChange,
}: {
  option: EngineCommandOption
  value: string | boolean | number | string[] | undefined
  onChange: (value: string | boolean | number | string[]) => void
}) {
  const { t } = useTranslation('chat')

  switch (option.type) {
    case 'boolean':
      return (
        <button
          onClick={() => onChange(!value)}
          className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
            value ? 'bg-primary' : 'bg-background-surface border border-border'
          }`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform ${
              value ? 'translate-x-4 bg-white' : 'translate-x-0.5 bg-text-tertiary'
            }`}
          />
        </button>
      )

    case 'select':
      return (
        <select
          value={value as string || ''}
          onChange={(e) => onChange(e.target.value)}
          className="px-2 py-1 bg-background-surface border border-border rounded text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary min-w-[80px]"
        >
          <option value="">{t('commandSelector.selectPlaceholder', '选择...')}</option>
          {option.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )

    case 'multiselect':
      const selectedValues = Array.isArray(value) ? value : []
      return (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {option.options?.map((opt) => {
            const isSelected = selectedValues.includes(opt.value)
            return (
              <button
                key={opt.value}
                onClick={() => {
                  if (isSelected) {
                    onChange(selectedValues.filter((v) => v !== opt.value))
                  } else {
                    onChange([...selectedValues, opt.value])
                  }
                }}
                className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                  isSelected
                    ? 'bg-primary text-white'
                    : 'bg-background-surface border border-border text-text-secondary hover:border-primary'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )

    case 'number':
      return (
        <input
          type="number"
          value={value as number || ''}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={option.placeholder}
          className="px-2 py-1 w-20 bg-background-surface border border-border rounded text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      )

    case 'string':
    default:
      return (
        <input
          type="text"
          value={value as string || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={option.placeholder}
          className="px-2 py-1 flex-1 min-w-[100px] bg-background-surface border border-border rounded text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      )
  }
}

/**
 * 命令选项行 - 紧凑布局
 */
function OptionRow({
  option,
  value,
  onChange,
  onRemove,
}: {
  option: EngineCommandOption
  value: string | boolean | number | string[] | undefined
  onChange: (value: string | boolean | number | string[]) => void
  onRemove: () => void
}) {
  const [showDangerConfirm, setShowDangerConfirm] = useState(false)

  const handleChange = (newValue: string | boolean | number | string[]) => {
    if (option.dangerous && !showDangerConfirm) {
      setShowDangerConfirm(true)
      return
    }
    onChange(newValue)
  }

  return (
    <div className="flex items-start gap-2 py-1.5 px-2 hover:bg-background-hover/50 rounded-md transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-text-primary truncate">{option.name}</span>
          {option.dangerous && (
            <span className="text-warning shrink-0" title={option.dangerWarning}>
              <IconAlertTriangle size={12} />
            </span>
          )}
          <code className="text-[10px] px-1 py-0.5 bg-background-surface rounded text-text-tertiary shrink-0">
            {option.cliFlag}
          </code>
        </div>

        {/* 危险操作确认 */}
        {showDangerConfirm && option.dangerWarning && (
          <div className="mt-1.5 p-1.5 bg-warning/10 border border-warning/30 rounded text-[10px] text-warning">
            <p className="font-medium">⚠️ {option.dangerWarning}</p>
            <div className="flex gap-1.5 mt-1">
              <button
                onClick={() => setShowDangerConfirm(false)}
                className="px-1.5 py-0.5 bg-background-surface border border-border rounded hover:border-warning"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setShowDangerConfirm(false)
                  onChange(value === undefined ? true : value)
                }}
                className="px-1.5 py-0.5 bg-warning text-white rounded hover:bg-warning/90"
              >
                确认
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 pt-0.5">
        <OptionInput option={option} value={value} onChange={handleChange} />
      </div>

      <button
        onClick={onRemove}
        className="shrink-0 p-0.5 text-text-tertiary opacity-0 group-hover:opacity-100 hover:text-danger transition-all"
        title="移除选项"
      >
        <IconX size={12} />
      </button>
    </div>
  )
}

/**
 * 分类面板 - 紧凑布局
 */
function CategoryPanel({
  category,
  selectedOptions,
  onToggleOption,
}: {
  category: EngineCommandCategory
  selectedOptions: CommandOptionValue[]
  onToggleOption: (option: EngineCommandOption) => void
}) {
  const selectedOptionIds = selectedOptions.map((o) => o.optionId)

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <div className="px-2 py-1.5 bg-background-surface/30">
        <h3 className="text-xs font-medium text-text-secondary">{category.name}</h3>
      </div>
      <div className="py-0.5">
        {category.options.map((option) => {
          const isSelected = selectedOptionIds.includes(option.id)
          return (
            <button
              key={option.id}
              onClick={() => onToggleOption(option)}
              className={`w-full px-2 py-1.5 text-left flex items-center justify-between hover:bg-background-hover/50 transition-colors ${
                isSelected ? 'bg-primary/5' : ''
              }`}
            >
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-text-primary truncate">{option.name}</span>
                  {option.dangerous && (
                    <IconAlertTriangle size={10} className="text-warning shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-text-tertiary truncate">{option.description}</p>
              </div>
              <div
                className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                  isSelected
                    ? 'bg-primary border-primary text-white'
                    : 'border-border/50 bg-background-surface'
                }`}
              >
                {isSelected && (
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * 引擎命令选择器主组件
 */
export function EngineCommandSelector({
  engineId,
  selectedOptions,
  onChange,
  position,
  onClose,
}: EngineCommandSelectorProps) {
  const { t } = useTranslation('chat')
  const panelRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'selected' | 'all'>('selected')

  // 获取当前引擎的命令配置
  const config = useMemo(() => getEngineCommands(engineId), [engineId])
  const allOptions = useMemo(() => (config ? getAllOptions(config) : []), [config])

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose?.()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // 更新选项值
  const handleValueChange = useCallback(
    (optionId: string, value: string | boolean | number | string[]) => {
      const newOptions = selectedOptions.map((o) =>
        o.optionId === optionId ? { ...o, value } : o
      )
      onChange(newOptions)
    },
    [selectedOptions, onChange]
  )

  // 移除选项
  const handleRemoveOption = useCallback(
    (optionId: string) => {
      onChange(selectedOptions.filter((o) => o.optionId !== optionId))
    },
    [selectedOptions, onChange]
  )

  // 切换选项（添加/移除）
  const handleToggleOption = useCallback(
    (option: EngineCommandOption) => {
      const exists = selectedOptions.some((o) => o.optionId === option.id)
      if (exists) {
        onChange(selectedOptions.filter((o) => o.optionId !== option.id))
      } else {
        // 添加选项时设置默认值
        let defaultValue: string | boolean | number | string[] = ''
        if (option.type === 'boolean') {
          defaultValue = true
        } else if (option.type === 'select' && option.options?.length) {
          defaultValue = option.defaultValue as string || ''
        } else if (option.type === 'multiselect') {
          defaultValue = (option.defaultValue as string[]) || []
        } else if (option.type === 'number') {
          defaultValue = (option.defaultValue as number) || 0
        } else {
          defaultValue = (option.defaultValue as string) || ''
        }

        onChange([
          ...selectedOptions,
          { optionId: option.id, value: defaultValue },
        ])
      }
    },
    [selectedOptions, onChange]
  )

  // 生成 CLI 参数预览
  const cliPreview = useMemo(() => {
    const args: string[] = []
    for (const opt of selectedOptions) {
      const option = allOptions.find((o) => o.id === opt.optionId)
      if (!option) continue

      if (option.type === 'boolean') {
        if (opt.value) {
          args.push(option.cliFlag)
        }
      } else if (option.type === 'multiselect') {
        const values = opt.value as string[]
        if (values.length > 0) {
          args.push(`${option.cliFlag} "${values.join(', ')}"`)
        }
      } else if (opt.value !== '' && opt.value !== undefined) {
        args.push(`${option.cliFlag} "${opt.value}"`)
      }
    }
    return args.join(' ')
  }, [selectedOptions, allOptions])

  if (!config) {
    return (
      <div className="p-3 text-center text-text-tertiary text-xs">
        {t('commandSelector.noConfig', '未找到引擎配置')}
      </div>
    )
  }

  const panelStyle = position
    ? { position: 'absolute' as const, top: position.top, left: position.left }
    : {}

  return (
    <div
      ref={panelRef}
      style={panelStyle}
      className="w-72 max-h-[360px] bg-background-elevated border border-border rounded-lg shadow-xl overflow-hidden flex flex-col z-50"
    >
      {/* 头部 */}
      <div className="px-3 py-2 border-b border-border/50 bg-background-surface/30">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-text-primary">
            {config.engineName} {t('commandSelector.title', '命令选项')}
          </h2>
          <button
            onClick={onClose}
            className="p-0.5 text-text-tertiary hover:text-text-primary transition-colors"
          >
            <IconX size={14} />
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-1 mt-1.5">
          <button
            onClick={() => setActiveTab('selected')}
            className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${
              activeTab === 'selected'
                ? 'bg-primary text-white'
                : 'bg-background-surface text-text-tertiary hover:text-text-primary'
            }`}
          >
            {t('commandSelector.selected', '已选')} ({selectedOptions.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${
              activeTab === 'all'
                ? 'bg-primary text-white'
                : 'bg-background-surface text-text-tertiary hover:text-text-primary'
            }`}
          >
            {t('commandSelector.all', '全部')}
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {activeTab === 'selected' ? (
          selectedOptions.length === 0 ? (
            <div className="p-4 text-center text-text-tertiary">
              <p className="text-xs">
                {t('commandSelector.emptyHint', '暂无已选选项')}
              </p>
              <p className="text-[10px] mt-1">
                {t('commandSelector.emptyHintSub', '点击"全部"标签添加选项')}
              </p>
            </div>
          ) : (
            <div className="py-0.5">
              {selectedOptions.map((opt) => {
                const option = allOptions.find((o) => o.id === opt.optionId)
                if (!option) return null
                return (
                  <OptionRow
                    key={option.id}
                    option={option}
                    value={opt.value}
                    onChange={(value) => handleValueChange(option.id, value)}
                    onRemove={() => handleRemoveOption(option.id)}
                  />
                )
              })}
            </div>
          )
        ) : (
          <div>
            {config.categories.map((category) => (
              <CategoryPanel
                key={category.id}
                category={category}
                selectedOptions={selectedOptions}
                onToggleOption={handleToggleOption}
              />
            ))}
          </div>
        )}
      </div>

      {/* CLI 预览 */}
      {selectedOptions.length > 0 && (
        <div className="px-2 py-1.5 border-t border-border/50 bg-background-surface/30">
          <div className="text-[10px] text-text-tertiary mb-0.5">CLI 参数预览:</div>
          <code className="text-[10px] text-primary break-all line-clamp-2">{cliPreview || '(无)'}</code>
        </div>
      )}
    </div>
  )
}

/**
 * 命令选项触发按钮
 * 显示当前已选择的选项数量和快速访问入口
 */
export function EngineCommandTrigger({
  engineId,
  selectedOptions,
  onClick,
}: {
  engineId: string
  selectedOptions: CommandOptionValue[]
  onClick: () => void
}) {
  const config = getEngineCommands(engineId)
  const allOptions = config ? getAllOptions(config) : []

  // 生成简要描述
  const summary = useMemo(() => {
    if (selectedOptions.length === 0) return null

    const parts: string[] = []
    for (const opt of selectedOptions.slice(0, 2)) {
      const option = allOptions.find((o) => o.id === opt.optionId)
      if (option) {
        if (option.type === 'boolean' && opt.value) {
          parts.push(option.name)
        } else if (opt.value !== '' && opt.value !== undefined) {
          const displayValue =
            option.type === 'select'
              ? option.options?.find((o) => o.value === opt.value)?.label || String(opt.value)
              : String(opt.value)
          parts.push(`${option.name}: ${displayValue.length > 8 ? displayValue.slice(0, 8) + '...' : displayValue}`)
        }
      }
    }

    if (selectedOptions.length > 2) {
      parts.push(`+${selectedOptions.length - 2}`)
    }

    return parts.join(', ')
  }, [selectedOptions, allOptions])

  // 无选项时显示简洁的图标按钮
  if (selectedOptions.length === 0) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-text-tertiary hover:text-text-secondary hover:bg-background-hover/50 transition-colors"
        title="引擎命令选项"
      >
        <IconSettings size={12} />
        <span className="text-[10px]">选项</span>
      </button>
    )
  }

  // 有选项时显示高亮状态
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors max-w-[160px]"
      title={`${selectedOptions.length} 个命令选项已配置`}
    >
      <IconSettings size={12} />
      <span className="text-[10px] truncate">{summary}</span>
      <span className="text-[10px] opacity-70">({selectedOptions.length})</span>
    </button>
  )
}

export default EngineCommandSelector
