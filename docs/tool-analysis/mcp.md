# mcp 命令分析

## 帮助原文

```
Usage: claude mcp [options] [command]

Configure and manage MCP servers

Options:
  -h, --help  Display help for command

Commands:
  add [options] <name> <commandOrUrl> [args...]  Add an MCP server
  add-from-claude-desktop [options]              Import MCP servers from Claude Desktop
  add-json [options] <name> <json>               Add an MCP server with JSON string
  get <name>                                     Get details about an MCP server
  help [command]                                 Display help for command
  list                                           List configured MCP servers
  remove [options] <name>                        Remove an MCP server
  reset-project-choices                          Reset approved/rejected project MCP servers
  serve [options]                                Start the Claude Code MCP server
```

## 实测记录

### mcp list

```bash
$ claude mcp list
Checking MCP server health…

plugin:figma:figma: https://mcp.figma.com/mcp (HTTP) - ! Needs authentication
plugin:playwright:playwright: npx @playwright/mcp@latest - ✓ Connected
plugin:supabase:supabase: https://mcp.supabase.com/mcp (HTTP) - ! Needs authentication
chrome-devtools: cmd /c npx chrome-devtools-mcp@latest - ✓ Connected
```

### mcp get

```bash
$ claude mcp get chrome-devtools
chrome-devtools:
  Scope: User config (available in all your projects)
  Status: ✓ Connected
  Type: stdio
  Command: cmd
  Args: /c npx chrome-devtools-mcp@latest
  Environment:

To remove this server, run: claude mcp remove "chrome-devtools" -s user
```

## 参数详解

### mcp add

| 参数 | 类型 | 说明 |
|------|------|------|
| `<name>` | positional | 服务器名称 |
| `<commandOrUrl>` | positional | 启动命令或 HTTP URL |
| `[args...]` | positional | 传递给服务器的参数（`--` 后） |
| `-t, --transport` | enum | 传输类型: stdio / sse / http（默认 stdio） |
| `-s, --scope` | enum | 配置范围: local / user / project（默认 local） |
| `-e, --env` | key=value | 环境变量 |
| `-H, --header` | string | WebSocket 请求头 |
| `--client-id` | string | OAuth 客户端 ID |
| `--client-secret` | flag | 提示输入 OAuth 客户端密钥 |
| `--callback-port` | number | OAuth 回调端口 |

### mcp add-json

| 参数 | 类型 | 说明 |
|------|------|------|
| `<name>` | positional | 服务器名称 |
| `<json>` | positional | JSON 配置字符串 |
| `-s, --scope` | enum | 配置范围（默认 local） |

### mcp remove

| 参数 | 类型 | 说明 |
|------|------|------|
| `<name>` | positional | 服务器名称 |
| `-s, --scope` | enum | 指定移除范围（不指定则从所有范围查找） |

### mcp get

| 参数 | 类型 | 说明 |
|------|------|------|
| `<name>` | positional | 服务器名称 |

### mcp serve

| 参数 | 类型 | 说明 |
|------|------|------|
| `-d, --debug` | flag | 启用调试模式 |
| `--verbose` | flag | 详细输出 |

### mcp add-from-claude-desktop

| 参数 | 类型 | 说明 |
|------|------|------|
| `-s, --scope` | enum | 配置范围（默认 local） |

## 子命令结构

```
mcp
├── add <name> <cmd|url> [args...]  # 添加服务器（多种传输方式）
├── add-json <name> <json>          # 以 JSON 配置添加
├── add-from-claude-desktop         # 从桌面版导入
├── get <name>                      # 查看单个服务器详情
├── list                            # 列出所有服务器及健康状态
├── remove <name>                   # 移除服务器
├── reset-project-choices           # 重置项目级服务器审批
└── serve                           # 启动 Claude Code 自身作为 MCP 服务器
```

## 输入/输出形式

- **输入**: 命令行参数、JSON 字符串、Claude Desktop 配置文件
- **输出**: stdout 纯文本（list/get）或交互式 OAuth 流程（add）

## 典型使用场景

1. 添加远程 MCP 服务: `claude mcp add --transport http sentry https://mcp.sentry.dev/mcp`
2. 添加本地 stdio 服务: `claude mcp add my-server -- npx my-mcp-server`
3. 查看所有服务器状态: `claude mcp list`
4. 诊断连接问题: `claude mcp get <name>`
5. 从桌面版迁移: `claude mcp add-from-claude-desktop`
6. 将 Claude Code 自身暴露为 MCP 服务: `claude mcp serve`
7. 移除服务器: `claude mcp remove <name> -s user`

## 可视化可行性评估

- **是否需要可视化**: **高需求**。MCP 服务器管理是 Claude Code 的核心扩展机制，涉及多种传输类型、认证状态、健康检查、配置范围等多维度信息，非常适合可视化。
- **适合的可视化形式**:
  - 服务器拓扑图：展示 Claude Code 与各 MCP 服务器的连接关系和状态
  - 健康状态仪表盘：实时显示各服务器连接/认证状态
  - 配置范围层级图：local/user/project 三级配置的可视化
  - 服务器能力矩阵：展示每个服务器提供的工具和能力
