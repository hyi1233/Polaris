# Scheduler API 文档

> 定时任务系统 API 参考
> 版本: 1.0.0

## 概述

调度器系统提供两种任务模式：

- **简单模式 (Simple)**: 直接使用 prompt 执行任务
- **协议模式 (Protocol)**: 使用文档驱动的工作流，支持 AI 记忆和迭代开发

## 核心类型

### TriggerType

触发类型枚举。

```typescript
type TriggerType = 'once' | 'cron' | 'interval';
```

| 值 | 说明 | 触发值格式 |
|---|---|---|
| `once` | 单次执行 | ISO 时间戳 (如 `2024-03-16T14:00:00Z`) |
| `cron` | Cron 表达式 | Cron 表达式 (如 `0 9 * * 1-5`) |
| `interval` | 间隔执行 | 间隔表达式 (如 `30s`, `5m`, `2h`, `1d`) |

### TaskMode

任务模式枚举。

```typescript
type TaskMode = 'simple' | 'protocol';
```

| 值 | 说明 |
|---|---|
| `simple` | 简单模式，直接使用 prompt |
| `protocol` | 协议模式，使用文档驱动工作流 |

### TaskCategory

任务分类枚举。

```typescript
type TaskCategory = 'development' | 'review' | 'news' | 'monitor' | 'custom';
```

| 值 | 说明 |
|---|---|
| `development` | 开发任务 |
| `review` | 审查任务 |
| `news` | 新闻搜索 |
| `monitor` | 监控任务 |
| `custom` | 自定义任务 |

### TaskStatus

任务执行状态。

```typescript
type TaskStatus = 'running' | 'success' | 'failed';
```

---

## 任务管理 API

### scheduler_list_tasks

列出所有定时任务。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `workspace_path` | `string?` | 否 | 工作区路径过滤 |

**返回:** `ScheduledTask[]`

**示例:**

```typescript
const tasks = await invoke('scheduler_list_tasks', { workspacePath: null });
```

### scheduler_get_task

获取单个任务详情。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | `string` | 是 | 任务 ID |

**返回:** `ScheduledTask | null`

### scheduler_create_task

创建新任务。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `params` | `CreateTaskParams` | 是 | 任务参数 |
| `workspace_path` | `string?` | 否 | 工作区路径 |

**CreateTaskParams:**

```typescript
interface CreateTaskParams {
  // 基础属性
  name: string;                    // 任务名称
  enabled?: boolean;               // 是否启用，默认 true
  triggerType: TriggerType;        // 触发类型
  triggerValue: string;            // 触发值
  engineId: string;                // 引擎 ID
  prompt: string;                  // 提示词 (simple 模式)
  workDir?: string;                // 工作目录
  description?: string;            // 任务描述

  // 任务模式
  mode?: TaskMode;                 // 任务模式，默认 simple
  category?: TaskCategory;         // 任务分类

  // 协议模式属性
  mission?: string;                // 任务目标
  templateId?: string;             // 模板 ID
  templateParams?: Record<string, string>;  // 模板参数

  // 执行控制
  maxRuns?: number;                // 最大执行次数
  maxRetries?: number;             // 最大重试次数
  retryInterval?: string;          // 重试间隔
  timeoutMinutes?: number;         // 超时时间

  // 其他
  group?: string;                  // 分组
  notifyOnComplete?: boolean;      // 完成通知，默认 true
}
```

**返回:** `ScheduledTask`

**示例 - 创建简单任务:**

```typescript
const task = await invoke('scheduler_create_task', {
  params: {
    name: '每小时检查服务状态',
    triggerType: 'interval',
    triggerValue: '1h',
    engineId: 'claude-code',
    prompt: '检查服务状态并报告异常',
    mode: 'simple',
  }
});
```

**示例 - 创建协议任务:**

```typescript
const task = await invoke('scheduler_create_task', {
  params: {
    name: '功能开发任务',
    triggerType: 'interval',
    triggerValue: '1h',
    engineId: 'claude-code',
    prompt: '',
    mode: 'protocol',
    category: 'development',
    mission: '实现用户认证功能',
    templateId: 'dev-feature',
    templateParams: { mission: '实现用户认证功能' },
    maxRuns: 100,
    timeoutMinutes: 60,
  }
});
```

### scheduler_update_task

更新任务。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `task` | `ScheduledTask` | 是 | 完整的任务对象 |

**返回:** `ScheduledTask`

### scheduler_delete_task

删除任务。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | `string` | 是 | 任务 ID |

**返回:** `ScheduledTask` (被删除的任务)

### scheduler_toggle_task

切换任务启用状态。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | `string` | 是 | 任务 ID |
| `enabled` | `boolean` | 是 | 启用状态 |

**返回:** `ScheduledTask`

---

## 任务分类过滤 API

### scheduler_list_tasks_by_category

按分类列出任务。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `category` | `TaskCategory` | 是 | 任务分类 |
| `workspace_path` | `string?` | 否 | 工作区路径 |

**返回:** `ScheduledTask[]`

### scheduler_list_tasks_by_mode

按模式列出任务。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `mode` | `TaskMode` | 是 | 任务模式 |
| `workspace_path` | `string?` | 否 | 工作区路径 |

**返回:** `ScheduledTask[]`

### scheduler_list_tasks_by_group

按分组列出任务。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `group` | `string` | 是 | 分组名称 |
| `workspace_path` | `string?` | 否 | 工作区路径 |

**返回:** `ScheduledTask[]`

---

## 调度器控制 API

### scheduler_get_status

获取调度器运行状态。

**返回:** `SchedulerStatus`

```typescript
interface SchedulerStatus {
  isRunning: boolean;        // 调度器是否正在运行
  isHolder: boolean;         // 当前实例是否持有锁
  isLockedByOther: boolean;  // 是否有其他实例持有锁
  pid: number;               // 当前进程 PID
  message?: string;          // 状态消息
}
```

### scheduler_start

启动调度器。

**返回:** `SchedulerStatus`

### scheduler_stop

停止调度器。

**返回:** `SchedulerStatus`

### scheduler_run_task

手动触发任务执行。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | `string` | 是 | 任务 ID |

**返回:** `ScheduledTask`

### scheduler_update_run_status

更新任务执行结果。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | `string` | 是 | 任务 ID |
| `status` | `string` | 是 | 状态 (`"success"` \| `"failed"`) |

**返回:** `ScheduledTask`

### scheduler_validate_trigger

验证触发表达式。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `trigger_type` | `TriggerType` | 是 | 触发类型 |
| `trigger_value` | `string` | 是 | 触发值 |

**返回:** `number | null` (下次执行时间戳，无效返回 null)

### scheduler_get_workspace_breakdown

获取工作区任务分布统计。

**返回:** `Record<string, number>`

---

## 提示词模板 API

### scheduler_list_templates

列出所有提示词模板。

**返回:** `PromptTemplate[]`

### scheduler_get_template

获取单个模板。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | `string` | 是 | 模板 ID |

**返回:** `PromptTemplate | null`

### scheduler_create_template

创建模板。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `params` | `CreateTemplateParams` | 是 | 模板参数 |

**返回:** `PromptTemplate`

### scheduler_update_template

更新模板。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `template` | `PromptTemplate` | 是 | 完整的模板对象 |

**返回:** `PromptTemplate`

### scheduler_delete_template

删除模板。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | `string` | 是 | 模板 ID |

**返回:** `void`

### scheduler_build_prompt

使用模板构建提示词。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `template_id` | `string` | 是 | 模板 ID |
| `task_name` | `string` | 是 | 任务名称 |
| `user_prompt` | `string` | 是 | 用户提示词 |

**返回:** `string`

---

## 协议模板 API

### scheduler_list_protocol_templates

列出所有协议模板（内置 + 自定义）。

**返回:** `ProtocolTemplate[]`

### scheduler_list_protocol_templates_by_category

按分类列出协议模板。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `category` | `TaskCategory` | 是 | 分类 |

**返回:** `ProtocolTemplate[]`

### scheduler_get_protocol_template

获取单个协议模板。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | `string` | 是 | 模板 ID |

**返回:** `ProtocolTemplate | null`

### scheduler_create_protocol_template

创建自定义协议模板。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `params` | `CreateProtocolTemplateParams` | 是 | 模板参数 |

**返回:** `ProtocolTemplate`

### scheduler_update_protocol_template

更新自定义协议模板。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | `string` | 是 | 模板 ID |
| `params` | `CreateProtocolTemplateParams` | 是 | 模板参数 |

**返回:** `ProtocolTemplate | null` (内置模板返回 null)

### scheduler_delete_protocol_template

删除自定义协议模板。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | `string` | 是 | 模板 ID |

**返回:** `boolean` (内置模板返回 false)

### scheduler_toggle_protocol_template

切换协议模板启用状态。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | `string` | 是 | 模板 ID |
| `enabled` | `boolean` | 是 | 启用状态 |

**返回:** `ProtocolTemplate | null` (内置模板始终返回模板且保持启用)

### scheduler_render_protocol_document

使用模板生成协议文档。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `template` | `ProtocolTemplate` | 是 | 模板对象 |
| `params` | `Record<string, string>` | 是 | 模板参数 |

**返回:** `string` (生成的文档内容)

---

## 协议文档 API

### scheduler_read_protocol_documents

读取协议任务的所有文档。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `task_path` | `string` | 是 | 任务文档路径 |
| `work_dir` | `string` | 是 | 工作目录 |

**返回:** `ProtocolDocuments`

```typescript
interface ProtocolDocuments {
  protocol: string;       // 协议文档内容
  supplement: string;     // 用户补充内容
  memoryIndex: string;    // 记忆索引
  memoryTasks: string;    // 记忆任务
}
```

### scheduler_update_protocol

更新协议文档。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `task_path` | `string` | 是 | 任务文档路径 |
| `work_dir` | `string` | 是 | 工作目录 |
| `content` | `string` | 是 | 新内容 |

**返回:** `void`

### scheduler_update_supplement

更新用户补充。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `task_path` | `string` | 是 | 任务文档路径 |
| `work_dir` | `string` | 是 | 工作目录 |
| `content` | `string` | 是 | 新内容 |

**返回:** `void`

### scheduler_update_memory_index

更新记忆索引。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `task_path` | `string` | 是 | 任务文档路径 |
| `work_dir` | `string` | 是 | 工作目录 |
| `content` | `string` | 是 | 新内容 |

**返回:** `void`

### scheduler_update_memory_tasks

更新记忆任务。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `task_path` | `string` | 是 | 任务文档路径 |
| `work_dir` | `string` | 是 | 工作目录 |
| `content` | `string` | 是 | 新内容 |

**返回:** `void`

### scheduler_clear_supplement

清空用户补充。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `task_path` | `string` | 是 | 任务文档路径 |
| `work_dir` | `string` | 是 | 工作目录 |

**返回:** `void`

### scheduler_backup_supplement

备份用户补充内容。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `task_path` | `string` | 是 | 任务文档路径 |
| `work_dir` | `string` | 是 | 工作目录 |
| `content` | `string` | 是 | 要备份的内容 |

**返回:** `string` (备份文件路径)

### scheduler_backup_document

备份协议文档。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `task_path` | `string` | 是 | 任务文档路径 |
| `work_dir` | `string` | 是 | 工作目录 |
| `doc_name` | `string` | 是 | 文档名称 |
| `content` | `string` | 是 | 要备份的内容 |
| `summary` | `string?` | 否 | 备份摘要 |

**返回:** `string` (备份文件路径)

### scheduler_has_supplement_content

检查用户补充是否有内容。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `content` | `string` | 是 | 用户补充内容 |

**返回:** `boolean`

### scheduler_needs_backup

检查文档是否需要备份。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `content` | `string` | 是 | 文档内容 |

**返回:** `boolean` (超过 800 行需要备份)

### scheduler_extract_user_content

提取用户补充内容。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `content` | `string` | 是 | 用户补充原文 |

**返回:** `string` (提取的用户内容)

---

## 内置协议模板

系统提供以下内置模板：

### dev-feature (功能开发)

用于持续开发新功能的任务模板。

- **分类**: development
- **默认触发**: 1小时间隔
- **参数**:
  - `mission` (必填): 任务目标

### protocol-assist (协议协助模式)

完整的协议任务模板，支持任务目标和用户补充内容。

- **分类**: development
- **默认触发**: 1小时间隔
- **参数**:
  - `mission` (必填): 任务目标

### review-code (代码审查)

用于定期审查代码质量的任务模板。

- **分类**: review
- **默认触发**: 6小时间隔
- **参数**:
  - `mission` (必填): 审查范围
- **默认超时**: 30 分钟

### news-search (新闻搜索)

用于搜索和总结新闻的任务模板。

- **分类**: news
- **默认触发**: 12小时间隔
- **参数**:
  - `keywords` (必填): 搜索关键词
  - `timeRange` (必填): 时间范围 (`1d` | `3d` | `1w` | `1m`)
  - `sources` (可选): 来源限制
- **默认超时**: 15 分钟

### monitor-service (服务监控)

用于监控服务状态的任务模板。

- **分类**: monitor
- **默认触发**: 5分钟间隔
- **参数**:
  - `service` (必填): 服务名称
  - `interval` (必填): 检查间隔 (`1m` | `5m` | `15m` | `30m`)
  - `threshold` (可选): 告警阈值
- **默认超时**: 5 分钟

---

## 错误处理

所有 API 调用失败时会抛出错误，错误类型为 `AppError`：

```typescript
interface AppError {
  kind: string;      // 错误类型
  message: string;   // 错误消息
}
```

常见错误类型：

- `ValidationError`: 参数验证失败
- `NotFoundError`: 资源不存在
- `IoError`: 文件操作失败
- `ProcessError`: 进程操作失败

---

## 使用示例

### 前端调用 (TypeScript)

```typescript
import { invoke } from '@tauri-apps/api/core';

// 创建简单任务
const task = await invoke('scheduler_create_task', {
  params: {
    name: '定时任务',
    triggerType: 'interval',
    triggerValue: '30m',
    engineId: 'claude-code',
    prompt: '执行定时检查',
  }
});

// 创建协议任务
const protocolTask = await invoke('scheduler_create_task', {
  params: {
    name: '开发任务',
    triggerType: 'interval',
    triggerValue: '1h',
    engineId: 'claude-code',
    prompt: '',
    mode: 'protocol',
    category: 'development',
    templateId: 'dev-feature',
    templateParams: { mission: '实现新功能' },
  }
});

// 读取协议文档
const docs = await invoke('scheduler_read_protocol_documents', {
  taskPath: '.polaris/tasks/abc123',
  workDir: '/path/to/workspace',
});
```

### Rust 调用

```rust
use crate::commands::scheduler::*;

// 创建任务
let task = scheduler_create_task(params, None, app).await?;

// 读取协议文档
let docs = scheduler_read_protocol_documents(task_path, work_dir).await?;
```
