# CLI 选项全量分析

> 基于 `claude --help` 输出的所有非子命令选项

## 分类总览

根据功能属性将 50+ 个 CLI 选项分为 6 大类：

| 分类 | 选项数量 | 核心用途 |
|------|---------|---------|
| 会话控制 | 10 | 启动/恢复/命名会话 |
| 模型与代理 | 5 | 选择模型和 agent |
| 权限与安全 | 5 | 控制操作权限 |
| 输入输出 | 8 | 格式化和流控制 |
| 调试与开发 | 6 | 调试和开发模式 |
| 集成与扩展 | 16 | MCP/插件/工具/Chrome 集成 |

---

## 一、会话控制选项

| 选项 | 简写 | 类型 | 说明 |
|------|------|------|------|
| `--continue` | `-c` | flag | 继续当前目录最近的对话 |
| `--resume [value]` | `-r` | flag+arg | 按 session ID 恢复对话，或打开交互式选择器 |
| `--from-pr [value]` | | flag+arg | 恢复与 PR 关联的会话 |
| `--session-id <uuid>` | | string | 使用指定 UUID 作为会话 ID |
| `--fork-session` | | flag | 恢复时创建新会话（不覆盖原会话） |
| `--name <name>` | `-n` | string | 设置会话显示名称 |
| `--no-session-persistence` | | flag | 禁用会话持久化（仅 --print 模式） |
| `--print` | `-p` | flag | 非交互模式，输出后退出 |
| `--add-dir <dirs...>` | | string[] | 添加额外允许访问的目录 |
| `--file <specs...>` | | string[] | 启动时下载文件资源（file_id:relative_path） |

### 典型组合

```bash
# 非交互式执行
claude -p "explain this code"

# 恢复上次对话
claude -c

# 恢复指定会话
claude -r abc123-def456

# 分叉恢复（不修改原会话）
claude -c --fork-session

# 从 PR 恢复
claude --from-pr 123

# 非交互 + JSON 输出 + 预算限制
claude -p --output-format json --max-budget-usd 1.0 "analyze this"
```

---

## 二、模型与代理选项

| 选项 | 类型 | 说明 |
|------|------|------|
| `--model <model>` | string | 指定模型（别名如 'sonnet'/'opus' 或全名） |
| `--agent <agent>` | string | 指定当前会话的 agent |
| `--agents <json>` | json | 自定义 agent 定义（JSON 对象） |
| `--effort <level>` | enum | 投入程度: low / medium / high / max |
| `--fallback-model <model>` | string | 默认模型过载时的备用模型（仅 --print） |

### 典型组合

```bash
# 使用 Opus 模型
claude --model opus

# 使用指定 agent
claude --agent Explore

# 自定义 agent
claude --agents '{"reviewer": {"description": "Reviews code", "prompt": "You are a code reviewer"}}'

# 低投入模式（快速响应）
claude --effort low -p "what does this file do"

# 带备用模型
claude -p --model opus --fallback-model sonnet "complex analysis"
```

---

## 三、权限与安全选项

| 选项 | 类型 | 说明 |
|------|------|------|
| `--permission-mode <mode>` | enum | 权限模式: acceptEdits / auto / bypassPermissions / default / dontAsk / plan |
| `--dangerously-skip-permissions` | flag | 跳过所有权限检查（仅限沙箱环境） |
| `--allow-dangerously-skip-permissions` | flag | 允许跳过权限检查（不默认启用） |
| `--allowedTools <tools...>` | string[] | 允许的工具白名单 |
| `--disallowedTools <tools...>` | string[] | 禁止的工具黑名单 |

### 典型组合

```bash
# 自动接受编辑
claude --permission-mode acceptEdits

# 沙箱环境完全跳过权限
claude --dangerously-skip-permissions

# 只允许特定工具
claude --allowedTools "Bash(git *)" "Read" "Grep"

# 禁止危险工具
claude --disallowedTools "Bash(rm *)" "Write"
```

---

## 四、输入输出选项

| 选项 | 类型 | 说明 |
|------|------|------|
| `--input-format <format>` | enum | 输入格式: text / stream-json（仅 --print） |
| `--output-format <format>` | enum | 输出格式: text / json / stream-json（仅 --print） |
| `--json-schema <schema>` | json | 结构化输出 JSON Schema 验证 |
| `--max-budget-usd <amount>` | number | 最大 API 调用费用（美元，仅 --print） |
| `--include-partial-messages` | flag | 包含部分消息块（stream-json 模式） |
| `--include-hook-events` | flag | 包含 hook 生命周期事件（stream-json 模式） |
| `--brief` | flag | 启用 agent 到用户的 SendUserMessage 工具 |
| `--replay-user-messages` | flag | 回显 stdin 用户消息到 stdout（stream-json 双向） |

### 典型组合

```bash
# JSON 输出
claude -p --output-format json "list files"

# 流式 JSON
claude -p --output-format stream-json "explain this"

# 结构化输出
claude -p --json-schema '{"type":"object","properties":{"name":{"type":"string"}}}' "extract name"

# 流式双向通信
claude -p --input-format stream-json --output-format stream-json --replay-user-messages

# 预算限制
claude -p --max-budget-usd 0.5 "quick analysis"
```

---

## 五、调试与开发选项

| 选项 | 简写 | 类型 | 说明 |
|------|------|------|------|
| `--debug [filter]` | `-d` | flag+arg | 调试模式，可选分类过滤（"api,hooks" 或 "!1p,!file"） |
| `--debug-file <path>` | | string | 调试日志写入文件（自动启用调试模式） |
| `--verbose` | | flag | 覆盖配置中的 verbose 模式 |
| `--bare` | | flag | 极简模式：跳过 hooks/LSP/插件同步/自动记忆等 |
| `--exclude-dynamic-system-prompt-sections` | | flag | 将动态系统提示部分移到首条用户消息中 |
| `--setting-sources <sources>` | | string | 配置来源: user, project, local（逗号分隔） |
| `--settings <file-or-json>` | | string | 额外配置文件路径或 JSON 字符串 |

### 典型组合

```bash
# 调试 API 调用
claude -d api

# 调试写入文件
claude --debug-file ./debug.log

# 极简模式（纯对话）
claude --bare

# 排除动态提示（提升缓存命中率）
claude --exclude-dynamic-system-prompt-sections

# 只加载用户级配置
claude --setting-sources user
```

---

## 六、集成与扩展选项

| 选项 | 类型 | 说明 |
|------|------|------|
| `--mcp-config <configs...>` | string[] | MCP 服务器配置文件路径或 JSON 字符串 |
| `--strict-mcp-config` | flag | 仅使用 --mcp-config 指定的 MCP，忽略其他配置 |
| `--tools <tools...>` | string[] | 可用工具列表（"" 禁用全部，"default" 全部启用） |
| `--chrome` | flag | 启用 Chrome 集成 |
| `--no-chrome` | flag | 禁用 Chrome 集成 |
| `--ide` | flag | 自动连接 IDE |
| `--worktree [name]` | `-w` | 创建 git worktree 隔离会话 |
| `--tmux` | flag | 为 worktree 创建 tmux 会话 |
| `--plugin-dir <path>` | string[] | 加载指定目录的插件 |
| `--disable-slash-commands` | flag | 禁用所有 skills（slash commands） |
| `--system-prompt <prompt>` | string | 自定义系统提示 |
| `--append-system-prompt <prompt>` | string | 追加到默认系统提示末尾 |
| `--betas <betas...>` | string[] | 启用 beta 功能（API key 用户） |
| `--remote-control-session-name-prefix` | string | 远程控制会话名前缀 |
| `--chrome` | flag | Chrome 集成 |
| `--no-chrome` | flag | 禁用 Chrome |

### 典型组合

```bash
# 指定 MCP 配置
claude --mcp-config ./mcp-servers.json

# 严格 MCP 模式
claude --strict-mcp-config --mcp-config ./prod-mcp.json

# 禁用所有工具后启用指定工具
claude --tools "Bash" "Read" "Grep" "Edit"

# Worktree 隔离开发
claude -w feature-branch

# Worktree + tmux
claude -w feature-branch --tmux

# 自定义系统提示
claude --system-prompt "You are a security auditor"

# 追加系统提示
claude --append-system-prompt "Always respond in Chinese"

# 加载本地插件
claude --plugin-dir ./my-plugins

# 连接 IDE
claude --ide
```

---

## 可视化可行性评估

### 高价值可视化方向

1. **会话管理可视化**：会话列表、恢复、分叉的时间线视图
2. **工具权限矩阵**：allowedTools/disallowedTools 的可视化编辑器
3. **MCP/插件配置面板**：可视化配置 MCP 服务器和插件
4. **模型选择器**：模型对比和 effort 级别的可视化选择

### 中等价值可视化方向

5. **调试日志查看器**：结构化展示 debug 输出
6. **系统提示编辑器**：可视化编辑 system-prompt 和 append-system-prompt
7. **配置来源层级图**：user/project/local 三级配置的可视化

### 低价值可视化方向

8. **预算消耗仪表盘**：max-budget-usd 的实时消耗追踪
9. **输入输出格式切换器**：简单的格式选择 UI
