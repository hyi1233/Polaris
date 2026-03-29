# Todo MCP 存储架构改造总结

## 1. 改造背景

### 1.1 原有问题

原有 Todo MCP 采用「全局 + 工作区」双存储模式：

- 全局待办：`{config_dir}/todo/todos.json`
- 工作区待办：`{workspace}/.polaris/todos.json`

问题：
1. 数据分散，管理复杂
2. 需要维护两套仓库逻辑
3. 查询时需遍历多个位置
4. 工作区删除后数据丢失

### 1.2 改造目标

统一为单存储架构：
- 所有待办存储在全局配置目录
- 通过 `workspacePath` 字段关联工作区
- 简化代码，降低维护成本

## 2. 架构对比

### 2.1 改造前

```
存储层：
├── GlobalTodoRepository     → {config_dir}/todo/todos.json
└── WorkspaceTodoRepository  → {workspace}/.polaris/todos.json

查询流程：
list_todos(scope=all):
  1. 读取全局待办
  2. 遍历所有已注册工作区
  3. 读取各工作区待办
  4. 合并返回
```

### 2.2 改造后

```
存储层：
└── UnifiedTodoRepository    → {config_dir}/todo/todos.json

查询流程：
list_todos(scope=workspace):
  1. 读取全局文件
  2. 按 workspacePath 筛选

list_todos(scope=all):
  1. 读取全局文件
  2. 直接返回
```

## 3. 代码变更

### 3.1 删除文件

| 文件 | 原因 |
|------|------|
| `src-tauri/src/services/todo_repository.rs` | 工作区仓库，不再需要 |

### 3.2 主要修改

| 文件 | 变更说明 |
|------|----------|
| `unified_todo_repository.rs` | 重写为单仓库，移除工作区遍历逻辑 |
| `todo_mcp_server.rs` | 移除 `isGlobal` 参数 |
| `commands/todo.rs` | 移除 `is_global` 参数 |
| `models/todo.rs` | 移除 `TodoCreateParams.is_global` |
| `simpleTodoService.ts` | 移除 `isGlobal` 参数 |
| `TodoForm.tsx` | 移除全局待办复选框 |
| `SimpleTodoPanel.tsx` | 移除 `isGlobal` 传递 |
| `types/todo.ts` | 移除 `TodoCreateParams.isGlobal` |

### 3.3 代码量变化

```
10 files changed, 152 insertions(+), 1097 deletions(-)
```

净减少约 945 行代码。

## 4. 数据结构

### 4.1 存储位置

```
{config_dir}/todo/
├── todos.json         # 所有待办
└── workspaces.json    # 已注册工作区列表（保留，用于显示）
```

### 4.2 TodoItem 字段

```typescript
interface TodoItem {
  id: string
  content: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  description?: string
  tags?: string[]
  relatedFiles?: string[]
  dueDate?: string
  estimatedHours?: number
  spentHours?: number
  subtasks?: TodoSubtask[]
  createdAt: string
  updatedAt: string
  completedAt?: string
  lastProgress?: string
  lastError?: string

  // 工作区关联字段
  workspacePath?: string | null   // 所属工作区路径
  workspaceName?: string | null   // 所属工作区名称（用于显示）
}
```

### 4.3 示例数据

```json
{
  "version": "1.0.0",
  "updated_at": "2026-03-29T04:19:07.285Z",
  "todos": [
    {
      "id": "ebc662ce-9e99-46b0-bb96-ccb261881de0",
      "content": "测试待办事项",
      "status": "pending",
      "priority": "normal",
      "createdAt": "2026-03-29T03:32:39.134Z",
      "updatedAt": "2026-03-29T03:32:39.134Z",
      "workspacePath": null,
      "workspaceName": null
    },
    {
      "id": "98d653be-ec98-4613-930c-3f41e1a40ba1",
      "content": "项目待办",
      "status": "pending",
      "priority": "high",
      "createdAt": "2026-03-29T04:18:05.629Z",
      "updatedAt": "2026-03-29T04:18:05.629Z",
      "workspacePath": "D:\\projects\\myapp",
      "workspaceName": "myapp"
    }
  ]
}
```

## 5. API 变化

### 5.1 MCP 工具

| 工具 | 变化 |
|------|------|
| `create_todo` | 移除 `isGlobal` 参数，自动关联当前工作区 |
| `list_todos` | 无变化（scope 参数保留） |
| 其他工具 | 无变化 |

### 5.2 Tauri 命令

| 命令 | 变化 |
|------|------|
| `create_todo` | 移除 `is_global` 参数 |

## 6. 查询范围说明

| Scope | 行为 |
|-------|------|
| `workspace` | 筛选 `workspacePath === currentWorkspace.path` 的待办 |
| `all` | 返回所有待办 |

## 7. 迁移说明

### 7.1 旧数据位置

```
{workspace}/.polaris/todos.json  →  待迁移
{config_dir}/.polaris/todos.json →  旧版全局位置，待迁移
```

### 7.2 迁移脚本（建议）

```bash
# 合并旧数据到新位置
# 1. 读取各工作区的 .polaris/todos.json
# 2. 为每条待办添加 workspacePath/workspaceName
# 3. 追加到 {config_dir}/todo/todos.json
```

## 8. 后续优化建议

1. **数据迁移工具**：提供自动迁移旧数据的功能
2. **工作区管理 UI**：查看/注销已注册工作区
3. **性能优化**：大量待办时的分页加载
4. **i18n 完善**：补充新增 UI 文案的翻译

## 9. 提交记录

```
b84e6ba docs(todo): update documentation for single storage architecture
9c00140 refactor(todo): simplify to single global storage
```
