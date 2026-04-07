/**
 * 问题浮窗组件
 *
 * 当有待回答的 AskUserQuestion 时，在输入框上方弹出紧凑浮窗。
 * - 用户选择选项 → 格式化文本填入输入框
 * - 点击发送按钮 → 等效用户手动输入发送
 * - 支持多问题左右切换
 */

import { memo, useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { clsx } from 'clsx'
import { ChevronLeft, ChevronRight, X, HelpCircle, Send, Check } from 'lucide-react'
import type { QuestionBlock } from '../../types'

export interface QuestionFloatingPanelProps {
  questions: QuestionBlock[]
  onSelectOption: (text: string, questionId: string) => void
  onSend: () => void
  onDismiss: (questionId: string) => void
}

export const QuestionFloatingPanel = memo(function QuestionFloatingPanel({
  questions,
  onSelectOption,
  onSend,
  onDismiss,
}: QuestionFloatingPanelProps) {
  const { t } = useTranslation('chat')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedValues, setSelectedValues] = useState<string[]>([])
  const [hasFilledInput, setHasFilledInput] = useState(false)
  const [focusedOptionIndex, setFocusedOptionIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  const totalQuestions = questions.length
  const currentQuestion = questions[currentIndex]

  // 切换问题时重置选择状态
  useEffect(() => {
    setSelectedValues([])
    setHasFilledInput(false)
    setFocusedOptionIndex(-1)
  }, [currentIndex])

  // 当 questions 列表变化时（如某个被标记 answered），校正 currentIndex
  useEffect(() => {
    if (currentIndex >= totalQuestions) {
      setCurrentIndex(Math.max(0, totalQuestions - 1))
    }
  }, [totalQuestions, currentIndex])

  const handleOptionClick = useCallback((value: string) => {
    if (hasFilledInput) return

    if (currentQuestion.multiSelect) {
      setSelectedValues(prev =>
        prev.includes(value)
          ? prev.filter(v => v !== value)
          : [...prev, value]
      )
    } else {
      setSelectedValues([value])
    }
  }, [currentQuestion?.multiSelect, hasFilledInput])

  // 构建格式化文本
  const buildFormattedText = useCallback((values: string[]): string => {
    if (!currentQuestion) return ''
    const labels = values.map(v => {
      const opt = currentQuestion.options.find(o => o.value === v)
      return opt?.label || v
    })
    return `${currentQuestion.header}: ${labels.join(', ')}`
  }, [currentQuestion])

  // 确认选择 → 填入输入框
  const handleConfirm = useCallback(() => {
    if (selectedValues.length === 0) return
    const text = buildFormattedText(selectedValues)
    onSelectOption(text, currentQuestion.id)
    setHasFilledInput(true)
  }, [selectedValues, buildFormattedText, onSelectOption, currentQuestion])

  // 发送
  const handleSend = useCallback(() => {
    if (!hasFilledInput) return
    onSend()
  }, [hasFilledInput, onSend])

  // 关闭当前问题
  const handleDismiss = useCallback(() => {
    if (currentQuestion) {
      onDismiss(currentQuestion.id)
    }
  }, [currentQuestion, onDismiss])

  // 键盘导航
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const optionCount = currentQuestion?.options.length ?? 0

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        setFocusedOptionIndex(prev => (prev - 1 + optionCount) % optionCount)
        break
      case 'ArrowDown':
        e.preventDefault()
        setFocusedOptionIndex(prev => (prev + 1) % optionCount)
        break
      case 'ArrowLeft':
        if (e.altKey || optionCount === 0) {
          e.preventDefault()
          setCurrentIndex(prev => (prev - 1 + totalQuestions) % totalQuestions)
        }
        break
      case 'ArrowRight':
        if (e.altKey || optionCount === 0) {
          e.preventDefault()
          setCurrentIndex(prev => (prev + 1) % totalQuestions)
        }
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        e.stopPropagation()
        if (hasFilledInput) {
          handleSend()
        } else if (focusedOptionIndex >= 0 && focusedOptionIndex < optionCount) {
          handleOptionClick(currentQuestion.options[focusedOptionIndex].value)
        }
        break
      case 'Escape':
        e.preventDefault()
        e.stopPropagation()
        handleDismiss()
        break
    }
  }, [currentQuestion, totalQuestions, focusedOptionIndex, hasFilledInput, handleSend, handleDismiss, handleOptionClick])

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleDismiss()
      }
    }
    // 延迟绑定避免立即触发
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [handleDismiss])

  if (!currentQuestion) return null

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className={clsx(
        'rounded-xl border shadow-medium overflow-hidden',
        'bg-background-elevated border-accent/30',
        'max-h-[40vh] flex flex-col',
        'animate-in slide-in-from-bottom-2 duration-200'
      )}
    >
      {/* 头部 */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-accent-faint/50 shrink-0">
        <HelpCircle className="w-3.5 h-3.5 text-accent shrink-0" />
        <span className="text-xs font-medium text-text-primary truncate flex-1">
          {currentQuestion.header}
        </span>
        {totalQuestions > 1 && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => setCurrentIndex(prev => (prev - 1 + totalQuestions) % totalQuestions)}
              className="p-0.5 rounded hover:bg-background-hover text-text-tertiary hover:text-text-primary transition-colors"
              aria-label="上一个问题"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-text-tertiary tabular-nums min-w-[32px] text-center">
              {currentIndex + 1}/{totalQuestions}
            </span>
            <button
              onClick={() => setCurrentIndex(prev => (prev + 1) % totalQuestions)}
              className="p-0.5 rounded hover:bg-background-hover text-text-tertiary hover:text-text-primary transition-colors"
              aria-label="下一个问题"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
        <button
          onClick={handleDismiss}
          className="p-0.5 rounded hover:bg-background-hover text-text-tertiary hover:text-text-primary transition-colors shrink-0"
          aria-label={t('question.dismiss', '关闭')}
        >
          <X size={14} />
        </button>
      </div>

      {/* 选项列表 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedValues.includes(option.value)
          const isFocused = focusedOptionIndex === index
          return (
            <button
              key={option.value}
              onClick={() => handleOptionClick(option.value)}
              disabled={hasFilledInput}
              className={clsx(
                'w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors',
                'flex items-center gap-2',
                'focus:outline-none',
                isSelected
                  ? 'bg-accent/15 text-accent border border-accent/25'
                  : 'hover:bg-background-hover border border-transparent',
                isFocused && 'ring-1 ring-accent',
                hasFilledInput && 'opacity-50 cursor-not-allowed',
                !hasFilledInput && 'cursor-pointer'
              )}
            >
              <div
                role="presentation"
                className={clsx(
                  'w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0',
                  isSelected
                    ? 'border-accent bg-accent'
                    : 'border-border'
                )}
              >
                {isSelected && <Check className="w-2 h-2 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-[13px] leading-tight">
                  {option.label || option.value}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* 底部操作 */}
      <div className="shrink-0 px-2.5 py-2 border-t border-border bg-background-elevated/50 flex items-center gap-2">
        {hasFilledInput ? (
          <button
            onClick={handleSend}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
              'bg-primary text-white hover:bg-primary-hover transition-colors',
              'shadow-soft'
            )}
          >
            <Send size={12} />
            {t('input.send')}
          </button>
        ) : (
          <button
            onClick={handleConfirm}
            disabled={selectedValues.length === 0}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              selectedValues.length > 0
                ? 'bg-accent text-white hover:bg-accent-dark shadow-soft'
                : 'bg-bg-secondary text-text-tertiary cursor-not-allowed'
            )}
          >
            {t('question.selectAndSend')}
          </button>
        )}
        {currentQuestion.multiSelect && !hasFilledInput && (
          <span className="text-[11px] text-text-tertiary ml-auto">
            {t('question.multiSelectHint')}
          </span>
        )}
      </div>
    </div>
  )
})

export default QuestionFloatingPanel
