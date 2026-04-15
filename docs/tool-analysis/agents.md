# agents 命令分析

## 帮助原文

```
Usage: claude agents [options]

List configured agents

Options:
  -h, --help                   Display help for command
  --setting-sources <sources>  Comma-separated list of setting sources to load
                               (user, project, local).
```

## 实测记录

### 基本执行

```bash
$ claude agents
5 active agents

Plugin agents:
  superpowers:code-reviewer · inherit

Built-in agents:
  Explore · haiku
  general-purpose · inherit
  Plan · inherit
  statusline-setup · sonnet
```

### 选项测试

- `--setting-sources`: 可控制从哪些来源加载 agent 配置（user/project/local），默认全部加载
- 无其他子命令或复杂参数

## 参数详解

| 参数 | 类型 | 说明 |
|------|------|------|
| `--setting-sources` | string (逗号分隔) | 指定配置加载来源，可选值: user, project, local |
| `-h, --help` | flag | 显示帮助信息 |

## 工具用途概述

列出当前环境中所有已配置的 agent。agent 是 Claude Code 中的子代理系统，可以在主会话中被调度执行特定任务。

输出分为两类：
1. **Plugin agents** — 来自已安装插件的 agent
2. **Built-in agents** — Claude Code 内置的 agent

每个 agent 显示名称和模型配置（如 `inherit` 继承主会话模型，或指定模型如 `haiku`/`sonnet`）。

## 输入/输出形式

- **输入**: 无（仅读取配置）
- **输出**: stdout 纯文本，结构化的 agent 列表

## 典型使用场景

1. 开发者查看当前有哪些 agent 可用
2. 调试 agent 配置是否正确加载
3. CI/CD 脚本中检查 agent 环境
4. 插件开发者验证自定义 agent 是否注册成功

## 可视化可行性评估

- **是否需要可视化**: 中等需求。agent 列表本身简单，但在复杂项目中 agent 间的调用关系、模型分配、能力边界等信息需要可视化才能直观理解。
- **适合的可视化形式**:
  - Agent 拓扑图：展示 agent 层级关系和调用链
  - 模型分配仪表盘：显示各 agent 使用的模型及成本估算
  - Agent 能力矩阵图：展示每个 agent 的工具权限、能力范围
