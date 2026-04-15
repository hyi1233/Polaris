# Claude CLI 工具分析 - 总进度表

> 最后更新: 2026-04-15

## 子命令 (Commands) 分析进度

| 工具名 | 分析状态 | 可视化建议 | 工具分析文档 | 可视化设计文档 |
|--------|----------|------------|-------------|---------------|
| agents | ✅ 完成 | 拓扑图 / 模型分配看板 | [agents.md](tool-analysis/agents.md) | [agents-prototype.md](visualization-design/agents-prototype.md) |
| auth | ✅ 完成 | 状态卡片 / 生命周期时间线 | [auth.md](tool-analysis/auth.md) | [auth-prototype.md](visualization-design/auth-prototype.md) |
| auto-mode | ✅ 完成 | 安全规则矩阵 / 信任边界雷达图 | [auto-mode.md](tool-analysis/auto-mode.md) | [auto-mode-prototype.md](visualization-design/auto-mode-prototype.md) |
| doctor | ✅ 完成 | 健康检查仪表盘 / 趋势图 | [doctor.md](tool-analysis/doctor.md) | [doctor-prototype.md](visualization-design/doctor-prototype.md) |
| install | ✅ 完成 | 版本选择器 / 安装进度条 | [install.md](tool-analysis/install.md) | [install-prototype.md](visualization-design/install-prototype.md) |
| mcp | ✅ 完成 | 服务器拓扑图 / 能力矩阵 | [mcp.md](tool-analysis/mcp.md) | [mcp-prototype.md](visualization-design/mcp-prototype.md) |
| plugin/plugins | ✅ 完成 | 插件生态面板 / Marketplace 浏览器 | [plugin.md](tool-analysis/plugin.md) | [plugin-prototype.md](visualization-design/plugin-prototype.md) |
| setup-token | ✅ 完成 | Token 配置向导 | [setup-token.md](tool-analysis/setup-token.md) | [setup-token-prototype.md](visualization-design/setup-token-prototype.md) |
| update/upgrade | ✅ 完成 | 版本状态通知 / 更新日志 | [update.md](tool-analysis/update.md) | [update-prototype.md](visualization-design/update-prototype.md) |

## CLI 选项分析进度

| 分类 | 分析状态 | 核心选项数 | 备注 |
|------|----------|-----------|------|
| 会话控制选项 | ✅ 完成 | 10 | -p, -c, -r, --session-id, --fork-session 等 |
| 模型与代理选项 | ✅ 完成 | 5 | --model, --agent, --agents, --effort, --fallback-model |
| 权限与安全选项 | ✅ 完成 | 5 | --permission-mode, --dangerously-skip-permissions, --allowedTools 等 |
| 输入输出选项 | ✅ 完成 | 8 | --input-format, --output-format, --json-schema, --max-budget-usd 等 |
| 调试与开发选项 | ✅ 完成 | 7 | --debug, --verbose, --bare, --settings 等 |
| 集成与扩展选项 | ✅ 完成 | 16 | --mcp-config, --chrome, --tools, --worktree, --plugin-dir 等 |

## 文档统计

| 类型 | 数量 |
|------|------|
| 工具分析文档 | 10 个（9 子命令 + 1 CLI 选项汇总） |
| 可视化设计文档 | 10 个 |
| 总 Mermaid 图表 | 20+ 个 |
| 总 ASCII 示意图 | 30+ 个 |
