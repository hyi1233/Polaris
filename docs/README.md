# Claude CLI 工具分析与可视化规划

> 完整分析报告 · 2026-04-15

## 项目概述

本目录包含对 Claude Code CLI (`claude --help`) 输出的所有工具（子命令 + CLI 选项）的系统性分析与可视化规划文档。

## 文档结构

```
docs/
├── README.md                           ← 你在这里
├── SUMMARY.md                          ← 总进度表（实时更新）
├── RECOMMENDATIONS.md                  ← 可视化优先级推荐
├── tool-analysis/                      ← 工具分析文档
│   ├── agents.md                       ← agents 命令分析
│   ├── auth.md                         ← auth 命令分析
│   ├── auto-mode.md                    ← auto-mode 命令分析
│   ├── doctor.md                       ← doctor 命令分析
│   ├── install.md                      ← install 命令分析
│   ├── mcp.md                          ← mcp 命令分析
│   ├── plugin.md                       ← plugin/plugins 命令分析
│   ├── setup-token.md                  ← setup-token 命令分析
│   ├── update.md                       ← update/upgrade 命令分析
│   └── cli-options.md                  ← CLI 选项全量分析（50+ 选项）
└── visualization-design/               ← 可视化设计文档
    ├── agents-prototype.md             ← Agent 拓扑图 / 模型看板
    ├── auth-prototype.md               ← 认证状态卡片 / 生命周期
    ├── auto-mode-prototype.md          ← 安全规则矩阵 / 信任边界
    ├── doctor-prototype.md             ← 健康检查仪表盘
    ├── install-prototype.md            ← 版本选择器 / 进度条
    ├── mcp-prototype.md                ← MCP 拓扑图 / 能力矩阵
    ├── plugin-prototype.md             ← 插件生态面板
    ├── setup-token-prototype.md        ← Token 配置向导
    ├── update-prototype.md             ← 版本状态通知
    └── cli-options-prototype.md        ← 会话管理 / 权限矩阵 / 模型选择器
```

## 分析范围

### 子命令（9 个）

| 命令 | 用途 | 可视化优先级 |
|------|------|-------------|
| `agents` | 列出已配置的 agent | ⭐⭐ |
| `auth` | 管理身份认证 | ⭐⭐ |
| `auto-mode` | 查看自动模式分类器配置 | ⭐⭐⭐⭐⭐ |
| `doctor` | 健康检查 | ⭐⭐⭐ |
| `install` | 安装原生构建 | ⭐ |
| `mcp` | 管理 MCP 服务器 | ⭐⭐⭐⭐⭐ |
| `plugin` | 管理插件 | ⭐⭐⭐⭐ |
| `setup-token` | 配置长期 Token | ⭐ |
| `update` | 检查并安装更新 | ⭐ |

### CLI 选项（50+ 个，6 大类）

| 分类 | 选项数 | 可视化优先级 |
|------|--------|-------------|
| 会话控制 | 10 | ⭐⭐⭐⭐ |
| 模型与代理 | 5 | ⭐⭐⭐ |
| 权限与安全 | 5 | ⭐⭐⭐⭐ |
| 输入输出 | 8 | ⭐⭐ |
| 调试与开发 | 7 | ⭐⭐ |
| 集成与扩展 | 16 | ⭐⭐⭐⭐ |

## 快速导航

- **查看分析进度** → [SUMMARY.md](SUMMARY.md)
- **查看可视化推荐** → [RECOMMENDATIONS.md](RECOMMENDATIONS.md)
- **深入某个工具** → `tool-analysis/<工具名>.md`
- **查看可视化设计** → `visualization-design/<工具名>-prototype.md`

## 文档规范

每份工具分析文档包含以下结构：

1. **帮助原文** — 完整命令帮助输出
2. **实测记录** — 实际运行结果
3. **参数详解** — 每个参数的类型和说明
4. **子命令结构** — 命令树形图
5. **输入/输出形式** — 数据流描述
6. **典型使用场景** — 5 个真实用例
7. **可视化可行性评估** — 需求分析和建议形式

每份可视化设计文档包含：

1. **2-3 个可视化方向** — 含 ASCII 示意图和 Mermaid 代码
2. **用户交互流程** — 操作步骤
3. **数据流设计** — 从命令输出到可视化渲染的完整流程
4. **技术建议** — 实现建议和注意事项
