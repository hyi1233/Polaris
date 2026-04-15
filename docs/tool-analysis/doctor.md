# doctor 命令分析

## 帮助原文

```
Usage: claude doctor [options]

Check the health of your Claude Code auto-updater. Note: The workspace trust
dialog is skipped and stdio servers from .mcp.json are spawned for health
checks. Only use this command in directories you trust.

Options:
  -h, --help  Display help for command
```

## 实测记录

### 基本执行

```bash
$ claude doctor
ERROR  Raw mode is not supported on the current process.stdin, which Ink uses as input stream by default.
```

> 注: 在非交互式 TTY 环境（子进程管道）中运行时，Ink（React 终端 UI 框架）无法启用 raw mode。这说明 doctor 依赖交互式终端渲染。

### 正常行为推断

基于帮助文本和错误信息推断：
- doctor 执行健康检查，验证 auto-updater 功能是否正常
- 会尝试加载并启动 `.mcp.json` 中配置的 stdio MCP 服务器
- 使用 Ink 框架渲染交互式终端 UI（类似 `npm doctor`）
- 需要在真实终端环境中运行

## 参数详解

| 参数 | 类型 | 说明 |
|------|------|------|
| `-h, --help` | flag | 显示帮助 |

无其他参数。doctor 是一个零配置诊断工具。

## 工具用途概述

Claude Code 自带的健康诊断工具，主要检查：
1. **Auto-updater 状态** — 自动更新机制是否正常
2. **MCP 服务器** — `.mcp.json` 中配置的 stdio 服务器是否能正常启动
3. **工作区信任** — 跳过信任对话框直接执行检查

安全提示明确说明：此命令会在当前目录下执行健康检查，包括启动 MCP 服务器，因此只应在信任的目录中运行。

## 输入/输出形式

- **输入**: 无参数，依赖当前工作目录
- **输出**: 交互式终端 UI（Ink 框架渲染）

## 典型使用场景

1. Claude Code 更新失败后排查问题
2. MCP 服务器连接异常时诊断
3. 新环境安装后的健康验证
4. CI/CD 中验证 Claude Code 环境就绪

## 可视化可行性评估

- **是否需要可视化**: **中高需求**。doctor 本身使用终端 UI，但将其结果持久化并可视化，可以提供历史健康趋势追踪和团队环境监控。
- **适合的可视化形式**:
  - 健康检查仪表盘：各检查项通过/失败的卡片式展示
  - 历史趋势图：记录每次 doctor 运行结果，追踪环境稳定性
  - 团队环境对比：多人开发中对比各成员环境健康状态
