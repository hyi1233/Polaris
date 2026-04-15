# auto-mode 命令分析

## 帮助原文

```
Usage: claude auto-mode [options] [command]

Inspect auto mode classifier configuration

Options:
  -h, --help          Display help for command

Commands:
  config              Print the effective auto mode config as JSON
  critique [options]  Get AI feedback on your custom auto mode rules
  defaults            Print the default auto mode environment, allow, and deny rules as JSON
  help [command]      display help for command
```

### auto-mode critique 帮助原文

```
Usage: claude auto-mode critique [options]

Get AI feedback on your custom auto mode rules

Options:
  -h, --help       Display help for command
  --model <model>  Override which model is used
```

## 实测记录

### auto-mode config

输出当前生效的自动模式分类器配置（JSON），包含三部分：

1. **allow** (8条规则): 允许自动执行的操作类别
   - Test Artifacts / Local Operations / Read-Only Operations / Declared Dependencies / Toolchain Bootstrap / Standard Credentials / Git Push to Working Branch / Memory Directory

2. **soft_deny** (27条规则): 默认拒绝但可被用户明确意图覆盖的操作类别
   - Git Destructive / Git Push to Default Branch / Code from External / Cloud Storage Mass Delete / Production Deploy / Remote Shell Writes / Production Reads / Blind Apply / Logging/Audit Tampering / Permission Grant / TLS/Auth Weaken / Security Weaken / Create Unsafe Agents / Interfere With Others / Modify Shared Resources / Irreversible Local Destruction / Create RCE Surface / Expose Local Services / Credential Leakage / Credential Exploration / Data Exfiltration / Exfil Scouting / Trusting Guessed External Services / Create Public Surface / Untrusted Code Integration / Unauthorized Persistence / Self-Modification / Memory Poisoning / External System Writes / Content Integrity / Impersonation / Real-World Transactions

3. **environment**: 当前环境的信任边界定义
   - Trusted repo / Source control / Trusted internal domains / Trusted cloud buckets / Key internal services

### auto-mode defaults

输出与 config 结构相同的默认规则集。当用户未自定义时，config 与 defaults 输出一致。

## 参数详解

| 子命令 | 参数 | 说明 |
|--------|------|------|
| config | 无 | 输出当前生效配置（含自定义覆盖） |
| defaults | 无 | 输出出厂默认配置 |
| critique | `--model <model>` | 指定用于评审的模型 |

## 子命令结构

```
auto-mode
├── config              # 查看当前生效的完整配置
├── defaults            # 查看默认配置
├── critique [--model]  # AI 评审自定义规则
└── help [command]      # 帮助
```

## 输入/输出形式

- **输入**: 无（读取内置配置和用户配置文件）
- **输出**: stdout JSON 格式，结构包含 `allow[]`, `soft_deny[]`, `environment[]`

## 典型使用场景

1. 安全审计：查看当前自动模式允许/拒绝了哪些操作
2. 自定义规则调试：对比 config 与 defaults 差异，确认自定义规则是否生效
3. 规则优化：使用 `critique` 让 AI 分析规则集的合理性和安全漏洞
4. 文档化：导出配置用于团队安全规范文档
5. CI/CD 策略配置：基于配置决定自动化流水线中的权限边界

## 可视化可行性评估

- **是否需要可视化**: **高需求**。auto-mode 规则集包含 35+ 条规则，文本阅读效率极低。可视化能直观展示安全边界、规则分类和覆盖范围。
- **适合的可视化形式**:
  - 安全规则矩阵图：按风险等级和类别分类展示所有规则
  - 信任边界雷达图：展示环境配置中的信任范围
  - 规则差异对比视图：config vs defaults 的高亮差异
  - 决策流程图：给定操作 → 判断 allow/deny 的流程
