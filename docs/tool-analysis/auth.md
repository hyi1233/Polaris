# auth 命令分析

## 帮助原文

```
Usage: claude auth [options] [command]

Manage authentication

Options:
  -h, --help        Display help for command

Commands:
  help [command]    display help for command
  login [options]   Sign in to your Anthropic account
  logout            Log out from your Anthropic account
  status [options]  Show authentication status
```

### auth login 帮助原文

```
Usage: claude auth login [options]

Sign in to your Anthropic account

Options:
  --claudeai       Use Claude subscription (default)
  --console        Use Anthropic Console (API usage billing) instead of Claude subscription
  --email <email>  Pre-populate email address on the login page
  -h, --help       Display help for command
  --sso            Force SSO login flow
```

### auth status 帮助原文

```
Usage: claude auth status [options]

Show authentication status

Options:
  -h, --help  Display help for command
  --json      Output as JSON (default)
  --text      Output as human-readable text
```

## 实测记录

### auth status --text

```bash
$ claude auth status --text
Auth token: ANTHROPIC_AUTH_TOKEN
Anthropic base URL: https://ruoli.dev
```

### auth status --json

```bash
$ claude auth status --json
{
  "loggedIn": true,
  "authMethod": "oauth_token",
  "apiProvider": "firstParty"
}
```

## 参数详解

### 主命令

| 参数 | 类型 | 说明 |
|------|------|------|
| `-h, --help` | flag | 显示帮助 |

### auth login

| 参数 | 类型 | 说明 |
|------|------|------|
| `--claudeai` | flag | 使用 Claude 订阅认证（默认） |
| `--console` | flag | 使用 Anthropic Console（API 计费） |
| `--email <email>` | string | 预填登录邮箱 |
| `--sso` | flag | 强制 SSO 登录流程 |

### auth status

| 参数 | 类型 | 说明 |
|------|------|------|
| `--json` | flag | JSON 格式输出（默认） |
| `--text` | flag | 人类可读文本格式输出 |

### auth logout

无额外参数，直接执行登出。

## 工具用途概述

管理 Claude Code 的身份认证生命周期：
- **login**: 通过 OAuth 或 API Key 方式登录，支持 Claude 订阅和 Console 两种计费方式
- **logout**: 清除本地认证信息
- **status**: 查看当前认证状态，支持 JSON（可编程解析）和文本两种输出格式

## 子命令结构

```
auth
├── login [--claudeai|--console] [--email <email>] [--sso]
├── logout
└── status [--json|--text]
```

## 输入/输出形式

- **输入**: 交互式 OAuth 流程（login）/ 无参数（logout, status）
- **输出**: 
  - login: 交互式浏览器 OAuth 或终端提示
  - logout: 无输出或确认信息
  - status: JSON 或纯文本到 stdout

## 典型使用场景

1. 首次使用时登录 (`claude auth login`)
2. CI/CD 环境检查认证状态 (`claude auth status --json`)
3. 切换账户 (`claude auth logout && claude auth login --console`)
4. 企业 SSO 登录 (`claude auth login --sso --email user@company.com`)
5. 脚本中检查是否已认证 (`claude auth status --json | jq .loggedIn`)

## 可视化可行性评估

- **是否需要可视化**: 中低需求。认证状态是简单的二态/三态信息，但可视化为仪表盘可提供更直观的账号健康状态监控。
- **适合的可视化形式**:
  - 认证状态卡片：登录状态、认证方式、API 提供商
  - 认证生命周期时间线：登录/登出/刷新 Token 的事件流
  - 多账户管理面板（如切换 Console / Claude 订阅）
