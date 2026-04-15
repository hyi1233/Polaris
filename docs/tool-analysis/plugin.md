# plugin/plugins 命令分析

## 帮助原文

```
Usage: claude plugin|plugins [options] [command]

Manage Claude Code plugins

Options:
  -h, --help  Display help for command

Commands:
  disable [options] [plugin]           Disable an enabled plugin
  enable [options] <plugin>            Enable a disabled plugin
  help [command]                       display help for command
  install|i [options] <plugin>         Install a plugin from available marketplaces
  list [options]                       List installed plugins
  marketplace                          Manage Claude Code marketplaces
  uninstall|remove [options] <plugin>  Uninstall an installed plugin
  update [options] <plugin>            Update a plugin to the latest version
  validate [options] <path>            Validate a plugin or marketplace manifest
```

## 实测记录

### plugin list

```bash
$ claude plugin list
Installed plugins:

  ❯ agent-sdk-dev@claude-plugins-official      Version: 52e95f6756e5   Scope: local   Status: ✘ disabled
  ❯ code-review@claude-plugins-official        Version: 52e95f6756e5   Scope: local   Status: ✘ disabled
  ❯ context7@claude-plugins-official           Version: 52e95f6756e5   Scope: local   Status: ✘ disabled
  ❯ figma@claude-plugins-official              Version: 2.0.7          Scope: user    Status: ✔ enabled
  ❯ frontend-design@claude-plugins-official    Version: 52e95f6756e5   Scope: user    Status: ✔ enabled
  ❯ github@claude-plugins-official             Version: 52e95f6756e5   Scope: local   Status: ✘ disabled
  ❯ gitlab@claude-plugins-official             Version: 52e95f6756e5   Scope: user    Status: ✘ disabled
  ❯ playwright@claude-plugins-official         Version: 52e95f6756e5   Scope: user    Status: ✔ enabled
  ❯ rust-analyzer-lsp@claude-plugins-official  Version: 1.0.0          Scope: user    Status: ✔ enabled
  ❯ supabase@claude-plugins-official           Version: 52e95f6756e5   Scope: user    Status: ✔ enabled
  ❯ superpowers@claude-plugins-official        Version: 5.0.7          Scope: user    Status: ✔ enabled
  ❯ typescript-lsp@claude-plugins-official     Version: 1.0.0          Scope: user    Status: ✔ enabled
```

共 12 个已安装插件，6 个启用，6 个禁用。

## 参数详解

### plugin install

| 参数 | 类型 | 说明 |
|------|------|------|
| `<plugin>` | positional | 插件名，支持 `plugin@marketplace` 格式 |
| `-s, --scope` | enum | 安装范围: user / project / local（默认 user） |

### plugin enable / disable

| 参数 | 类型 | 说明 |
|------|------|------|
| `<plugin>` | positional | 插件名 |
| `-s, --scope` | enum | 作用范围（默认自动检测） |

### plugin uninstall / remove

| 参数 | 类型 | 说明 |
|------|------|------|
| `<plugin>` | positional | 插件名 |
| `-s, --scope` | enum | 作用范围 |

### plugin update

| 参数 | 类型 | 说明 |
|------|------|------|
| `<plugin>` | positional | 插件名 |

### plugin validate

| 参数 | 类型 | 说明 |
|------|------|------|
| `<path>` | positional | 插件或 marketplace manifest 路径 |

### plugin marketplace 子命令

| 子命令 | 说明 |
|--------|------|
| `add <source>` | 从 URL/GitHub 仓库添加 marketplace |
| `list` | 列出所有配置的 marketplace |
| `remove <name>` | 移除 marketplace |
| `update [name]` | 更新 marketplace（不指定则全部更新） |

## 子命令结构

```
plugin
├── install <plugin> [-s scope]              # 安装插件
├── enable <plugin> [-s scope]               # 启用插件
├── disable [plugin] [-s scope]              # 禁用插件
├── uninstall|remove <plugin> [-s scope]     # 卸载插件
├── update <plugin>                          # 更新插件
├── list                                     # 列出所有插件
├── validate <path>                          # 验证插件/manifest
└── marketplace
    ├── add <source>                         # 添加 marketplace
    ├── list                                 # 列出 marketplace
    ├── remove <name>                        # 移除 marketplace
    └── update [name]                        # 更新 marketplace
```

## 输入/输出形式

- **输入**: 命令行参数（插件名、marketplace URL）
- **输出**: stdout 纯文本列表，交互式选择器

## 典型使用场景

1. 安装插件: `claude plugin install figma`
2. 启用/禁用插件: `claude plugin enable figma` / `claude plugin disable github`
3. 查看已安装插件: `claude plugin list`
4. 更新插件: `claude plugin update superpowers`
5. 卸载插件: `claude plugin uninstall context7`
6. 添加私有 marketplace: `claude plugin marketplace add https://my-company.com/plugins`
7. 验证自研插件: `claude plugin validate ./my-plugin`

## 可视化可行性评估

- **是否需要可视化**: **高需求**。插件管理是功能丰富的子系统，涉及安装/启用/更新/来源等多维信息，列表视图难以直观展示全局状态。
- **适合的可视化形式**:
  - 插件生态面板：类似 VS Code Extensions 的管理界面
  - 状态矩阵图：启用/禁用/版本/来源的汇总视图
  - Marketplace 浏览器：可搜索、分类的插件市场
  - 插件依赖关系图：展示插件间的依赖和工具提供关系
