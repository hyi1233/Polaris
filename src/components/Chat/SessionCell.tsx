/**
 * SessionCell 组件 - 多会话窗口中的单个会话格子
 *
 * 功能：
 * - 渲染单个会话的消息列表
 * - 显示会话标题和状态
 * - 点击切换活跃会话
 */

import { memo, useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Loader2, XCircle, X, Circle } from 'lucide-react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import type { ChatMessage, AssistantChatMessage, ContentBlock, TextBlock, ToolCallBlock } from '../../types';
import { useConversationStore } from '../../stores/conversationStore';
import { useSessionMetadataList, useSessionManagerActions } from '../../stores/conversationStore/sessionStoreManager';
import { useViewStore } from '../../stores';
import { markdownCache } from '../../utils/cache';
import { getToolConfig, extractToolKeyInfo, getToolShortName } from '../../utils/toolConfig';
import { formatDuration, calculateDuration, generateCollapsedSummary } from '../../utils/toolSummary';

/** Markdown 渲染器（使用缓存优化） */
function formatContent(content: string): string {
  return markdownCache.render(content);
}

/** SessionCell Props */
interface SessionCellProps {
  sessionId: string;
  isActive: boolean;
  onClose?: () => void;
}

/** 状态图标映射 */
const SESSION_STATUS_CONFIG = {
  idle: { icon: Circle, className: 'text-text-muted', label: '空闲' },
  running: { icon: Loader2, className: 'animate-spin text-primary', label: '运行中' },
  waiting: { icon: Loader2, className: 'animate-spin text-warning', label: '等待中' },
  error: { icon: XCircle, className: 'text-error', label: '错误' },
  background_running: { icon: Loader2, className: 'animate-spin text-text-muted', label: '后台运行' },
};

/**
 * SessionCell 组件
 */
export const SessionCell = memo(function SessionCell({
  sessionId,
  isActive,
  onClose,
}: SessionCellProps) {
  const { switchSession } = useSessionManagerActions();
  const removeFromMultiView = useViewStore(state => state.removeFromMultiView);

  // 获取会话元数据
  const sessionMetadata = useSessionMetadataList().find(m => m.id === sessionId);

  // 获取会话 Store
  const store = useConversationStore(sessionId);

  // 获取消息列表
  const messages = useMemo(() => {
    if (!store) return [];
    return store.messages || [];
  }, [store]);

  // 获取流式状态
  const isStreaming = useMemo(() => {
    if (!store) return false;
    return store.isStreaming || false;
  }, [store]);

  // 状态配置 - 需要将 hyphen 格式转换为 underscore 格式
  const statusKey = (sessionMetadata?.status || 'idle').replace(/-/g, '_') as keyof typeof SESSION_STATUS_CONFIG;
  const statusConfig = SESSION_STATUS_CONFIG[statusKey] || SESSION_STATUS_CONFIG.idle;
  const StatusIcon = statusConfig.icon;

  // 点击切换活跃会话
  const handleClick = useCallback(() => {
    if (!isActive) {
      switchSession(sessionId);
    }
  }, [isActive, sessionId, switchSession]);

  // 关闭格子
  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromMultiView(sessionId);
    if (onClose) onClose();
  }, [sessionId, removeFromMultiView, onClose]);

  // Virtuoso 引用
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // 自动滚动到底部
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && virtuosoRef.current && messages.length > 0) {
      virtuosoRef.current.scrollToIndex({
        index: messages.length - 1,
        align: 'end',
        behavior: isStreaming ? 'auto' : 'smooth',
      });
    }
  }, [messages.length, isStreaming, autoScroll]);

  const handleAtBottomStateChange = useCallback((atBottom: boolean) => {
    setAutoScroll(atBottom);
  }, []);

  // 空状态
  const isEmpty = messages.length === 0;

  return (
    <div
      className={clsx(
        'flex flex-col h-full overflow-hidden rounded-lg border transition-all',
        isActive ? 'border-primary shadow-glow' : 'border-border hover:border-border-strong'
      )}
      onClick={handleClick}
    >
      {/* 头部：标题 + 状态 + 关闭按钮 */}
      <div className={clsx(
        'flex items-center gap-2 px-3 py-2 border-b shrink-0',
        isActive ? 'bg-primary/10 border-primary/20' : 'bg-background-surface border-border'
      )}>
        {/* 会话标题 */}
        <span className={clsx(
          'text-sm font-medium truncate flex-1',
          isActive ? 'text-primary' : 'text-text-secondary'
        )}>
          {sessionMetadata?.title || '未命名会话'}
        </span>

        {/* 状态图标 */}
        <StatusIcon className={clsx('w-4 h-4 shrink-0', statusConfig.className)} />

        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="shrink-0 p-1 rounded text-text-muted hover:text-text-primary hover:bg-background-hover transition-colors"
          title="关闭"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 min-h-0 overflow-hidden bg-background-base">
        {isEmpty ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm">
            暂无消息
          </div>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            style={{ height: '100%' }}
            data={messages}
            itemContent={(index, message) => (
              <div className="px-2">
                {renderMessage(message, isStreaming && index === messages.length - 1)}
              </div>
            )}
            followOutput={autoScroll ? (isStreaming ? true : 'smooth') : false}
            atBottomStateChange={handleAtBottomStateChange}
            atBottomThreshold={100}
            increaseViewportBy={{ top: 50, bottom: 100 }}
          />
        )}
      </div>
    </div>
  );
});

/**
 * 简化版消息渲染
 */
function renderMessage(message: ChatMessage, isStreaming: boolean): React.ReactNode {
  switch (message.type) {
    case 'user':
      return (
        <div className="flex justify-end my-1">
          <div className="max-w-[80%] px-2 py-1.5 rounded-xl bg-primary text-white text-xs">
            {message.content}
          </div>
        </div>
      );
    case 'assistant':
      return <AssistantMessageCell message={message} isStreaming={isStreaming} />;
    default:
      return null;
  }
}

/**
 * 简化版 Assistant 消息渲染
 */
const AssistantMessageCell = memo(function AssistantMessageCell({
  message,
  isStreaming,
}: {
  message: AssistantChatMessage;
  isStreaming: boolean;
}) {
  const hasBlocks = message.blocks && message.blocks.length > 0;

  return (
    <div className="flex gap-2 my-1">
      {/* Avatar */}
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-white">P</span>
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        {hasBlocks ? (
          <div className="space-y-0.5">
            {message.blocks.map((block, idx) => renderBlock(block, isStreaming, idx))}
          </div>
        ) : message.content ? (
          <div
            className="text-xs text-text-secondary prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
          />
        ) : null}

        {/* 流式光标 */}
        {isStreaming && (
          <span className="inline-flex ml-1">
            <span className="w-1 h-1 bg-text-muted rounded-full animate-pulse" />
          </span>
        )}
      </div>
    </div>
  );
});

/**
 * 简化版内容块渲染
 */
function renderBlock(block: ContentBlock, _isStreaming: boolean, index: number): React.ReactNode {
  switch (block.type) {
    case 'text':
      return (
        <div key={`text-${index}`} className="text-xs text-text-secondary whitespace-pre-wrap">
          {(block as TextBlock).content}
        </div>
      );
    case 'thinking':
      return null; // 简化版不渲染思考块
    case 'tool_call':
      return <SimplifiedToolBlock key={`tool-${index}`} block={block as ToolCallBlock} />;
    default:
      return null;
  }
}

/**
 * 简化版工具调用渲染
 */
const SimplifiedToolBlock = memo(function SimplifiedToolBlock({ block }: { block: ToolCallBlock }) {
  const toolConfig = useMemo(() => getToolConfig(block.name), [block.name]);
  const toolShortName = useMemo(() => getToolShortName(block.name), [block.name]);
  const keyInfo = useMemo(() => extractToolKeyInfo(block.name, block.input), [block.name, block.input]);

  // 状态配置
  const getToolStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Loader2, className: 'animate-spin text-yellow-500' };
      case 'running':
        return { icon: Loader2, className: 'animate-spin text-blue-500' };
      case 'completed':
        return { icon: Circle, className: 'text-green-500' };
      case 'failed':
        return { icon: XCircle, className: 'text-red-500' };
      default:
        return { icon: Circle, className: 'text-text-muted' };
    }
  };
  const statusConfig = getToolStatusConfig(block.status);
  const StatusIcon = statusConfig.icon;

  const duration = useMemo(() => {
    if (block.duration) return formatDuration(block.duration);
    const calculated = calculateDuration(block.startedAt, block.completedAt);
    return calculated ? formatDuration(calculated) : '';
  }, [block.duration, block.startedAt, block.completedAt]);

  // 折叠摘要
  const collapsedSummary = useMemo(() => {
    if (block.status === 'completed' || block.status === 'failed') {
      return generateCollapsedSummary(block.name, block.input, block.output, block.status);
    }
    return null;
  }, [block.name, block.input, block.output, block.status]);

  return (
    <div className={clsx(
      'flex items-center gap-1.5 px-2 py-1 rounded text-xs my-0.5',
      'bg-background-surface border-l-2',
      toolConfig.borderColor
    )}>
      {/* 工具缩写 */}
      <div className={clsx(
        'w-4 h-4 rounded text-[9px] font-semibold flex items-center justify-center shrink-0',
        toolConfig.bgColor,
        toolConfig.color
      )}>
        {toolShortName}
      </div>

      {/* 工具名称 */}
      <span className="text-text-secondary shrink-0">{toolConfig.label}</span>

      {/* 关键参数 */}
      {keyInfo && (
        <span className={clsx('truncate', toolConfig.color)}>{keyInfo}</span>
      )}

      {/* 摘要 */}
      {collapsedSummary?.summary && (
        <span className="text-text-muted truncate ml-auto">{collapsedSummary.summary}</span>
      )}

      {/* 耗时 */}
      {duration && (
        <span className="text-text-muted shrink-0">{duration}</span>
      )}

      {/* 状态图标 */}
      <StatusIcon className={clsx('w-3 h-3 shrink-0', statusConfig.className)} />
    </div>
  );
});