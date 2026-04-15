# update/upgrade 命令分析

## 帮助原文

```
Usage: claude update|upgrade [options]

Check for updates and install if available

Options:
  -h, --help  Display help for command
```

## 实测记录

### 基本执行

```bash
$ claude update
Current version: 2.1.109
Checking for updates to latest version...
Claude Code is up to date (2.1.109)
```

### 行为分析

- 首先显示当前版本号
- 然后检查最新版本
- 如果已是最新 → 显示 "is up to date"
- 如果有更新 → 自动下载安装（交互式进度）

## 参数详解

| 参数 | 类型 | 说明 |
|------|------|------|
| `-h, --help` | flag | 显示帮助 |

无其他参数。与 `install` 不同，update 不接受版本目标参数，始终更新到最新版。

## 工具用途概述

一键检查并安装 Claude Code 的最新版本。支持两个别名：`update` 和 `upgrade`。

与 `install latest` 的区别：
- `update` — 检查更新，仅在非最新时安装
- `install latest` — 无条件安装最新版（即使已是最新）

## 子命令结构

```
update|upgrade    # 无子命令，单层命令
```

## 输入/输出形式

- **输入**: 无参数
- **输出**: stdout 纯文本（版本号、检查结果、安装进度）

## 典型使用场景

1. 日常更新: `claude update`
2. CI/CD 环境初始化: 确保使用最新版本
3. 问题排查: 更新到最新版后重试
4. 定时任务: 每日自动检查更新

## 可视化可行性评估

- **是否需要可视化**: **低需求**。update 操作简单，结果一目了然。
- **适合的可视化形式**:
  - 版本状态通知: 当前版本 + 是否最新的徽章
  - 更新日志展示: 展示新版本的变更内容
  - 与 install 可视化合并为"版本管理"模块
