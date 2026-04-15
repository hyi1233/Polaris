# install 命令分析

## 帮助原文

```
Usage: claude install [options] [target]

Install Claude Code native build. Use [target] to specify version (stable,
latest, or specific version)

Options:
  --force     Force installation even if already installed
  -h, --help  Display help for command
```

## 实测记录

### 帮助信息已充分说明功能

install 是一个轻量命令，仅两个选项 + 一个位置参数。

- `[target]`: 可选，指定版本目标
  - `stable` — 安装稳定版
  - `latest` — 安装最新版
  - 具体版本号 — 安装指定版本
  - 省略 — 默认安装策略（通常为 stable）

- `--force`: 强制重新安装，即使已存在同版本

## 参数详解

| 参数 | 类型 | 说明 |
|------|------|------|
| `[target]` | positional | 安装目标：stable / latest / 具体版本号 |
| `--force` | flag | 强制重新安装 |
| `-h, --help` | flag | 显示帮助 |

## 工具用途概述

安装 Claude Code 的原生构建版本（native build）。与 `npm install -g @anthropic-ai/claude-code` 不同，此命令安装的是针对当前平台优化的原生二进制文件，性能更好。

支持三种版本选择策略：
1. **stable** — 推荐生产使用
2. **latest** — 获取最新功能和修复
3. **指定版本** — 精确控制环境一致性

## 子命令结构

```
install [target]
  └── 无子命令，单层命令
```

## 输入/输出形式

- **输入**: 命令行参数
- **输出**: 终端进度输出（下载/安装进度）

## 典型使用场景

1. 首次安装：`claude install` 或 `claude install stable`
2. 升级到最新版：`claude install latest`
3. 回退版本：`claude install 1.0.2`
4. 强制重装：`claude install --force`
5. CI/CD 环境初始化：`claude install stable`

## 可视化可行性评估

- **是否需要可视化**: **低需求**。install 是一次性操作，过程简单。但版本选择和安装进度可视化可提升体验。
- **适合的可视化形式**:
  - 版本选择器：展示可用版本和稳定性标签
  - 安装进度条：下载/解压/验证的实时进度
  - 版本历史时间线：展示本地安装过的版本记录
