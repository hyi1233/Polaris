# AI 助手模块设计规格

## 概述

在 Polaris 内新增一个 AI 助手模块，作为用户与 Claude Code 之间的智能协调层。助手只有一个工具——调用 Claude Code，由助手自主判断何时需要调用。

## 核心定位

| 角色 | 职责 |
|------|------|
| **用户** | 发出需求、做决策 |
| **AI 助手** | 理解意图、润色输入、规划方案、自主判断何时调用 Claude Code |
| **Claude Code** | 执行具体的项目操作（代码修改、文件读写等） |

## 模块架构

```
src/
├── engines/
│   └── openai-protocol/          # OpenAI 协议适配器（新增）
│       ├── engine.ts             # 实现 AIEngine 接口
│       ├── session.ts            # 会话管理
│       ├── types.ts              # OpenAI API 类型定义
│       ├── config.ts             # 配置验证
│       └── index.ts
│
├── assistant/                    # AI 助手模块（新增）
│   ├── core/
│   │   ├── AssistantEngine.ts    # 助手引擎，协调 LLM 和 Claude Code
│   │   ├── SystemPrompt.ts       # 系统提示词
│   │   └── ToolDefinitions.ts    # 工具定义（invoke_claude_code）
│   ├── store/
│   │   └── assistantStore.ts     # 助手状态管理
│   ├── components/
│   │   ├── AssistantPanel.tsx    # 助手面板（主界面）
│   │   ├── AssistantChat.tsx     # 对话消息流
│   │   ├── ClaudeCodeCard.tsx    # Claude Code 执行卡片
│   │   ├── ExecutionStatus.tsx   # 执行状态指示器
│   │   └── AssistantInput.tsx    # 输入框
│   ├── hooks/
│   │   └── useAssistant.ts       # 助手交互 Hook
│   ├── types/
│   │   └── index.ts              # 类型定义
│   └── utils/
│       └── promptBuilder.ts      # 提示词构建
│
├── components/Layout/
│   └── ActivityBar.tsx           # 修改：添加助手图标
│
└── types/
    └── config.ts                 # 修改：添加助手配置类型
```

## 核心组件设计

### 1. OpenAI 协议适配器

#### engine.ts

```typescript
export interface OpenAIEngineConfig {
  /** API Base URL（支持自定义服务商） */
  baseUrl: string
  /** API Key */
  apiKey: string
  /** 模型 ID */
  model: string
  /** 最大 Token 数 */
  maxTokens?: number
  /** 温度参数 */
  temperature?: number
}

export class OpenAIProtocolEngine implements AIEngine {
  readonly id = 'openai-protocol'
  readonly name = 'OpenAI Protocol'

  // 实现流式输出
  async *stream(messages: Message[], tools?: Tool[]): AsyncGenerator<AIEvent>

  // 工具调用处理
  async handleToolCall(toolCall: ToolCall): Promise<ToolResult>
}
```

#### types.ts

```typescript
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: OpenAIToolCall[]
  tool_call_id?: string
}

export interface OpenAITool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: object
  }
}

export interface OpenAIToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}
```

### 2. AI 助手核心

#### AssistantEngine.ts

```typescript
export class AssistantEngine {
  private llmEngine: OpenAIProtocolEngine
  private claudeCodeEngine: ClaudeCodeEngine
  private eventBus: EventBus

  /**
   * 处理用户消息
   * 1. 发送给 LLM
   * 2. 判断是否需要调用工具
   * 3. 执行工具调用（如有）
   * 4. 返回结果给用户
   */
  async *processMessage(
    message: string,
    context?: AssistantContext
  ): AsyncGenerator<AssistantEvent>

  /**
   * 执行 Claude Code 调用
   */
  async *executeClaudeCode(
    params: InvokeClaudeCodeParams
  ): AsyncGenerator<ClaudeCodeExecutionEvent>

  /**
   * 中断当前执行
   */
  abort(): void
}
```

#### ToolDefinitions.ts

```typescript
export const INVOKE_CLAUDE_CODE_TOOL: OpenAITool = {
  type: 'function',
  function: {
    name: 'invoke_claude_code',
    description: `
调用 Claude Code 执行项目操作。

何时使用：
- 需要读取/修改项目文件
- 需要了解项目结构或代码
- 需要执行代码重构或调试
- 需要进行 Git 操作

何时不需要：
- 用户只是闲聊或咨询概念
- 可以直接回答的技术问题
- 不涉及具体项目的规划讨论
    `.trim(),
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: '发送给 Claude Code 的指令'
        },
        mode: {
          type: 'string',
          enum: ['new_session', 'continue_session', 'interrupt_current'],
          description: '执行模式：new_session=新会话, continue_session=继续会话'
        },
        reason: {
          type: 'string',
          description: '简要说明为什么需要调用 Claude Code'
        }
      },
      required: ['prompt', 'reason']
    }
  }
}
```

#### SystemPrompt.ts

```typescript
export const ASSISTANT_SYSTEM_PROMPT = `
# 角色定义

你是用户的 AI 助手，负责帮助用户分析需求、规划方案、协调资源。
你有一个工具：\`invoke_claude_code\`，可以调用 Claude Code 执行项目操作。

# 工作原则

1. **先理解再行动**：充分理解用户意图后，再决定是否需要调用工具
2. **透明沟通**：调用工具前告知用户你的计划和原因
3. **主动汇报**：工具执行完成后，主动总结结果并询问下一步
4. **保持对话**：Claude Code 执行期间，用户可以继续和你对话

# 判断逻辑

## 不需要调用 Claude Code 的情况
- 用户只是咨询概念、方法论
- 可以直接回答的技术问题
- 纯粹的需求讨论和规划
- 代码逻辑解释（不需要读取实际文件）

## 需要调用 Claude Code 的情况
- 需要了解项目具体代码结构
- 需要修改项目文件
- 需要执行 Git 操作
- 需要调试或分析具体问题
- 用户明确要求操作项目

# 调用模式选择

- **new_session**: 全新独立任务，不需要之前上下文
- **continue_session**: 延续上次任务，保持上下文连续性
- 如果不确定，优先选择 continue_session

# 输出格式

1. 调用工具前，用简洁语言说明你要做什么
2. 工具执行中，等待结果
3. 收到结果后，总结关键信息，提出下一步建议
`
```

### 3. 状态管理

#### assistantStore.ts

```typescript
export interface AssistantState {
  // 会话状态
  messages: AssistantMessage[]
  isLoading: boolean

  // Claude Code 执行状态
  claudeCodeStatus: 'idle' | 'running' | 'completed' | 'error'
  claudeCodeSessionId: string | null
  claudeCodeEvents: ClaudeCodeExecutionEvent[]

  // 当前工具调用
  pendingToolCall: ToolCall | null

  // 折叠状态
  executionPanelExpanded: boolean
}

export interface AssistantActions {
  // 消息操作
  sendMessage: (content: string) => Promise<void>
  clearMessages: () => void

  // Claude Code 控制
  abortClaudeCode: () => void
  toggleExecutionPanel: () => void

  // 事件处理
  handleClaudeCodeEvent: (event: ClaudeCodeExecutionEvent) => void
}

export type AssistantStore = AssistantState & AssistantActions
```

### 4. UI 组件

#### AssistantPanel.tsx

```typescript
export function AssistantPanel() {
  return (
    <div className="flex flex-col h-full">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-medium">AI 助手</h2>
        <ClaudeCodeStatusIndicator />
      </div>

      {/* 对话消息流 */}
      <AssistantChat />

      {/* Claude Code 执行卡片（条件显示） */}
      <ClaudeCodeCard />

      {/* 输入框 */}
      <AssistantInput />
    </div>
  )
}
```

#### ClaudeCodeCard.tsx

```typescript
export function ClaudeCodeCard() {
  const { claudeCodeStatus, claudeCodeEvents, executionPanelExpanded } = useAssistantStore()
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (claudeCodeStatus === 'idle') return null

  return (
    <div className={cn(
      "border-t border-border transition-all",
      isCollapsed ? "h-10" : "h-48"
    )}>
      {/* 状态栏 */}
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          {claudeCodeStatus === 'running' && (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          )}
          {claudeCodeStatus === 'completed' && (
            <CheckCircle className="w-4 h-4 text-success" />
          )}
          {claudeCodeStatus === 'error' && (
            <XCircle className="w-4 h-4 text-danger" />
          )}
          <span className="text-sm">
            {claudeCodeStatus === 'running' ? 'Claude Code 执行中...' :
             claudeCodeStatus === 'completed' ? '执行完成' : '执行失败'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {claudeCodeStatus === 'running' && (
            <Button size="sm" variant="ghost" onClick={handleAbort}>
              中断
            </Button>
          )}
          {isCollapsed ? <ChevronUp /> : <ChevronDown />}
        </div>
      </div>

      {/* 执行详情 */}
      {!isCollapsed && (
        <div className="px-4 py-2 overflow-auto h-[calc(100%-40px)]">
          {claudeCodeEvents.map((event, idx) => (
            <ExecutionEventItem key={idx} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
```

### 5. 类型定义

#### types/index.ts

```typescript
/** 助手消息 */
export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number

  // 工具调用信息
  toolCalls?: ToolCallInfo[]
  toolResults?: ToolResultInfo[]
}

/** 工具调用信息 */
export interface ToolCallInfo {
  id: string
  name: string
  arguments: InvokeClaudeCodeParams
  status: 'pending' | 'running' | 'completed' | 'error'
}

/** 工具执行结果 */
export interface ToolResultInfo {
  toolCallId: string
  result: string
  success: boolean
}

/** Claude Code 调用参数 */
export interface InvokeClaudeCodeParams {
  prompt: string
  mode: 'new_session' | 'continue_session' | 'interrupt_current'
  reason?: string
}

/** Claude Code 执行事件 */
export interface ClaudeCodeExecutionEvent {
  type: 'tool_call' | 'token' | 'progress' | 'error' | 'complete'
  timestamp: number
  data: {
    tool?: string
    content?: string
    message?: string
    error?: string
  }
}

/** 助手事件 */
export type AssistantEvent =
  | { type: 'message_start' }
  | { type: 'content_delta'; content: string }
  | { type: 'tool_call'; toolCall: ToolCallInfo }
  | { type: 'tool_result'; result: ToolResultInfo }
  | { type: 'message_complete' }
  | { type: 'claude_code_event'; event: ClaudeCodeExecutionEvent }
```

## 数据流设计

```
用户输入
    │
    ▼
┌─────────────────────────────────────────┐
│           AssistantStore                 │
│  ┌─────────────────────────────────┐    │
│  │ sendMessage(content)             │    │
│  └──────────────┬──────────────────┘    │
└─────────────────┼───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│           AssistantEngine                │
│  ┌─────────────────────────────────┐    │
│  │ 1. 构建消息（含系统提示词）       │    │
│  │ 2. 调用 OpenAI Protocol Engine  │    │
│  │ 3. 流式接收响应                  │    │
│  └──────────────┬──────────────────┘    │
│                 │                        │
│    ┌────────────┴────────────┐          │
│    │                         │          │
│    ▼                         ▼          │
│ 直接回复              检测到工具调用     │
│    │                         │          │
│    │                         ▼          │
│    │              ┌──────────────────┐  │
│    │              │ invoke_claude_   │  │
│    │              │ code 工具执行    │  │
│    │              └────────┬─────────┘  │
│    │                       │            │
│    │                       ▼            │
│    │              ┌──────────────────┐  │
│    │              │ ClaudeCodeEngine │  │
│    │              │ 执行任务         │  │
│    │              └────────┬─────────┘  │
│    │                       │            │
│    │                       ▼            │
│    │              ┌──────────────────┐  │
│    │              │ 收集执行结果     │  │
│    │              │ 返回给 LLM       │  │
│    │              └────────┬─────────┘  │
│    │                       │            │
│    └───────────────────────┘            │
│                 │                        │
└─────────────────┼───────────────────────┘
                  │
                  ▼
           更新 UI 显示
```

## 配置设计

### config.ts 扩展

```typescript
export interface AssistantConfig {
  /** 是否启用助手模块 */
  enabled: boolean

  /** LLM 配置 */
  llm: {
    /** API Base URL */
    baseUrl: string
    /** API Key（加密存储） */
    apiKey: string
    /** 模型 ID */
    model: string
    /** 最大 Token */
    maxTokens?: number
    /** 温度 */
    temperature?: number
  }

  /** Claude Code 调用配置 */
  claudeCode: {
    /** 默认执行模式 */
    defaultMode: 'new_session' | 'continue_session'
    /** 超时时间（毫秒） */
    timeout?: number
  }
}
```

### 默认配置

```typescript
export const DEFAULT_ASSISTANT_CONFIG: AssistantConfig = {
  enabled: false,
  llm: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o',
    maxTokens: 4096,
    temperature: 0.7
  },
  claudeCode: {
    defaultMode: 'continue_session',
    timeout: 300000
  }
}
```

## 界面集成

### Activity Bar 扩展

在 Activity Bar 添加助手图标，点击后在左侧面板显示助手界面。

```typescript
// ActivityBar 图标配置
const ACTIVITY_ITEMS = [
  { id: 'files', icon: FileText, label: '文件' },
  { id: 'git', icon: GitBranch, label: 'Git' },
  { id: 'todo', icon: CheckSquare, label: '待办' },
  { id: 'assistant', icon: Bot, label: 'AI 助手' }, // 新增
  { id: 'settings', icon: Settings, label: '设置' }
]
```

### 设置页面扩展

在设置页面添加"AI 助手"标签页，配置 LLM 参数。

```typescript
// SettingsSidebar 标签页
const SETTINGS_TABS = [
  { id: 'general', label: '常规' },
  { id: 'assistant', label: 'AI 助手' }, // 新增
  { id: 'window', label: '窗口' },
  // ...
]
```

## 实现优先级

### Phase 1：核心基础（必须）

1. OpenAI 协议适配器实现
2. 助手状态管理
3. 基础对话 UI
4. Claude Code 工具调用

### Phase 2：体验优化（重要）

1. Claude Code 执行卡片
2. 折叠/展开交互
3. 执行进度显示
4. 中断功能

### Phase 3：完善功能（可选）

1. 对话历史持久化
2. 多助手配置
3. 自定义系统提示词
4. 快捷键支持

## 测试策略

### 单元测试

- OpenAI 协议适配器 API 调用
- 工具参数验证
- 状态管理逻辑

### 集成测试

- 完整对话流程
- Claude Code 调用流程
- 中断和恢复

### E2E 测试

- 用户完整操作流程
- 多种场景覆盖

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| OpenAI API 调用失败 | 完善错误处理，支持重试，显示友好错误信息 |
| Claude Code 执行超时 | 可配置超时时间，支持中断 |
| 工具调用判断错误 | 优化系统提示词，提供手动调用选项 |
| 流式输出中断 | 实现断点续传，保存中间状态 |

## 兼容性考虑

- 支持主流 OpenAI 兼容服务商（OpenAI、Azure、本地模型）
- 复用现有 EventBus 和事件系统
- 不影响现有 Claude Code 对话功能
