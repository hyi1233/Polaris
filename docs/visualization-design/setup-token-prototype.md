# setup-token 可视化设计方案

## 可视化方向建议

### 方向一：Token 配置向导

引导用户完成 Token 设置的步骤式 UI。

```
┌────────────────────────────────────┐
│  🔑 Token Setup Wizard             │
│                                     │
│  Step 1/3: Enter Token              │
│  ┌────────────────────────────────┐│
│  │ sk-ant-••••••••••••••••        ││
│  └────────────────────────────────┘│
│                                     │
│  Step 2/3: Validate                 │
│  ○ Checking token validity...       │
│                                     │
│  Step 3/3: Confirm                  │
│  ○ Waiting...                       │
│                                     │
│  [Cancel]            [Next →]       │
└────────────────────────────────────┘
```

### 方向二：Token 管理面板

展示当前 Token 的状态概览。

```
┌──────────────────────────────────────┐
│  🔑 Authentication Tokens            │
│                                       │
│  OAuth Token                          │
│  Status: ✅ Active                    │
│  Method: oauth_token                  │
│  Provider: first-party               │
│                                       │
│  Long-lived Token                     │
│  Status: ❌ Not configured            │
│  Action: [Setup Token]               │
│                                       │
│  ⚠️ Long-lived tokens are recommended│
│     for CI/CD and automation.         │
└──────────────────────────────────────┘
```

## 用户交互流程

1. 用户打开 Token 管理面板 → 查看当前认证状态
2. 点击 "Setup Token" → 进入配置向导
3. 输入 Token → 自动验证 → 确认保存

## 数据流设计

```
claude setup-token (交互式)
       │
       ▼
  [Token 输入] → 验证 → 保存
       │
       ▼
  claude auth status --json
       │
       ▼
  [状态展示] → 管理面板
```

## 技术建议

- 可视化优先级低，可集成到 auth 可视化面板中作为子功能
- 建议在 auth 状态卡片中增加"配置长期 Token"入口
- Token 输入需安全处理（密码框、不回显）
