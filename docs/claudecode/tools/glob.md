# Glob 工具渲染

> 状态: ✅ 已处理

## 工具信息

| 属性 | 值 |
|---|---|
| 工具名 | `Glob` |
| 分类 | `read` |
| Badge | `G` (蓝色) |
| 图标 | `FileSearch` |
| i18n key | `names.searchFiles` / `labels.searchFiles` |
| 配置 | `src/utils/toolConfig.ts` |

## 输入格式

```ts
{
  pattern: string,    // glob 模式，如 "**/*.ts"
  path?: string,      // 搜索根目录（可选）
}
```

## 数据流

```
tool_call_start → appendToolCallBlock(name="Glob", input={pattern, path})
                    ↓
tool_call_end     → updateToolCallBlock(status, output)
                    ↓
渲染阶段          → ToolCallBlockRenderer (通用)
                    ├─ 折叠态: generateCollapsedSummary → "N files" badge
                    └─ 展开态: <pre> 纯文本输出
```

## 渲染方式

### 折叠态

单行条显示:
- `G` 蓝色 badge → "搜索文件" → pattern → `N 文件` badge → 耗时 → 状态图标

折叠摘要由 `generateCollapsedSummary` 生成（`toolSummary.ts:278-286`），通过 `output.split('\n').length` 计算文件数。

target 取值: `input?.pattern || query || toolName`（此处合理，优先展示 pattern）。

### 展开态

无专用渲染器，使用通用 `ToolCallBlockRenderer`：
1. Input 参数: 以 `<pre>` 格式展示原始 JSON
2. Output: 以 `<pre>` 纯文本展示文件路径列表，>1000 字符截断，可展开但上限 `max-h-96`

**无文件列表格式化、无可点击路径。**

## 已知问题

### Bug 1: `Glob` 缺失于 `generateToolSummary` switch-case

**位置**: `src/utils/toolSummary.ts:83-152`

`generateToolSummary` 的 switch-case 没有 `Glob` 分支。当 Claude API 发送 `name: "Glob"` 的工具调用时，落入 `default` 分支。

由于 Glob 的 `input` 通常为 `{ pattern: "**/*.ts", path?: "src" }`：
- `extractFilePath(input)` 会匹配到 `path` 键（因为 `PATH_KEYS` 包含 `'path'`），返回 `"src"`（截断为目录名）
- 最终输出类似 `"Executing 搜索文件: src"`，而非预期的 `"Searching **/*.ts"`

**修复**: 在 `generateToolSummary` 的 switch 中添加 `case 'Glob':` 分支，提取 `input.pattern` 显示。

### Bug 2: `extractToolKeyInfo` 对 Glob 提取了错误信息

**位置**: `src/utils/toolConfig.ts:407-411`

Glob 的分类为 `read`，`extractToolKeyInfo` 对 `read` 分类调用 `extractFilePath(input)`。但 Glob 的 `input.path` 是搜索根目录，`input.pattern` 才是主要信息。

结果：折叠态 keyInfo 显示 `"src"`（目录名），而非 `"**/*.ts"`（glob 模式）。

**修复**: 在 `extractToolKeyInfo` 的 `read` 分支中，对 Glob 工具特殊处理，优先提取 `input.pattern`。

### Bug 3: Claude Code 原生历史恢复丢失 output

**位置**: `src/services/claudeCodeHistoryService.ts:352-359`

`parseAssistantBlocks` 构建 `ToolCallBlock` 时未填充 `output` 字段。`tool_result` 消息被 `isToolResultMessage` 跳过，从未被读取。

**影响**:
- `generateCollapsedSummary` 收到 `output=undefined`，计算 `files=0`，显示 `"0 文件"`
- `generateOutputSummary` 同样无法生成摘要

| 恢复来源 | `block.output` 保留? | 折叠摘要正确? |
|---|---|---|
| localStorage 历史 | 是 | 是 |
| Claude Code 原生历史 | 否 | 否（显示 "0 文件"） |

**修复**: 在 `parseAssistantBlocks` 中查找匹配的 `tool_result` 消息，提取结果写入 `block.output`。

**注**: 此 bug 影响**所有工具**，不仅限于 Glob，但 Glob 因为折叠摘要依赖 output 计数，表现最为明显。

## 缺失功能（非 bug，后续优化）

| 缺失 | 说明 |
|---|---|
| 文件列表格式化 | output 是纯文本路径列表，无结构化渲染 |
| 路径可点击 | 文件路径无法点击打开编辑器/导航 |
| 目录高亮 | 路径中的匹配部分（pattern 命中的文件名段）无高亮 |

## 排查检查清单

```
[x] generateToolSummary switch-case 是否包含所有别名
    → 未包含 Glob，落入 default 分支 (Bug 1)
[x] generateCollapsedSummary 分支是否正确
    → 已正确处理，通过 includes('glob') 匹配
[x] generateOutputSummary 是否正确匹配
    → 已正确处理，通过 includes('glob') 匹配
[x] 折叠态 keyInfo 提取是否合理
    → 不合理，显示目录名而非 pattern (Bug 2)
[x] 展开态是否有专用渲染器
    → 无，使用通用 ToolCallBlockRenderer
[x] eventHandler 是否需要特殊处理
    → 不需要，无特殊逻辑
[x] 历史消息恢复是否完整
    → 原生历史恢复丢失 output (Bug 3)
```

## 相关文件

| 文件 | 职责 |
|---|---|
| `src/utils/toolSummary.ts:83` | `generateToolSummary` 缺 `Glob` case |
| `src/utils/toolSummary.ts:278` | `generateCollapsedSummary` Glob 分支 |
| `src/utils/toolSummary.ts:482` | `parseGlobOutput` 输出解析 |
| `src/utils/toolSummary.ts:663` | `generateOutputSummary` Glob 分支 |
| `src/utils/toolConfig.ts:231` | `TOOL_CATEGORY['Glob']='read'` |
| `src/utils/toolConfig.ts:370` | `extractToolKeyInfo` 对 read 分类提取文件名 |
| `src/utils/toolInputExtractor.ts` | `extractFilePath` 匹配 `path` 键导致误提取 |
| `src/services/claudeCodeHistoryService.ts:352` | 历史恢复丢失 output |
| `src/components/Chat/EnhancedChatMessages.tsx:644` | 通用 ToolCallBlockRenderer |
