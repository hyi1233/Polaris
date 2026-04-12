# 机器人实例默认工作区配置

## 目标

给 QQ 机器人和飞书机器人的实例配置添加 `work_dir` 字段，实现新会话自动关联工作区，免去用户每次手动 `/path` 的操作。

## 背景

当前 IM 机器人收到消息后，`ConversationState.work_dir` 初始为 `None`。用户必须在聊天中发送 `/path <目录>` 才能设置工作区。这对机器人使用场景体验很差——每次新对话都要手动指定。

## 设计

### 数据模型

在以下 4 个结构体中各新增 `work_dir: Option<String>` 字段：

- `QQBotInstanceConfig`（持久化配置）
- `QQBotRuntimeConfig`（运行时配置）
- `FeishuInstanceConfig`（持久化配置）
- `FeishuRuntimeConfig`（运行时配置）

`From` 实现透传 `work_dir`。`Default` 实现中为 `None`。使用 `#[serde(default)]` 保证旧配置文件向后兼容。

### 注入逻辑

在 `IntegrationManager::handle_message()` 入口处，命令解析之前：

1. 获取 `ConversationState`
2. 如果 `work_dir` 为 `None`，从 `InstanceRegistry` 查询当前平台激活实例的 `work_dir`
3. 若实例配置了非空 `work_dir`，注入到会话状态

触发条件是 `work_dir == None`（而非仅新会话），这样 `/restart` 清除后也能自动重新注入。

### 数据流

```
消息 → handle_message
       ├─ 检查 state.work_dir == None
       ├─ 从 instance_registry 获取激活实例的 work_dir
       └─ 注入 state.work_dir = instance_work_dir
       → 命令解析 / AI 处理（使用已有的 work_dir）
```

### 参数传递

`handle_message` 当前是 static 方法，不持有 `instance_registry` 引用。需要：

1. `start_message_processing_task` 中 clone `instance_registry` 的 Arc
2. 传入 spawned task
3. `handle_message` 签名增加 `instance_registry: Arc<Mutex<InstanceRegistry>>` 参数

### 前端

`InstanceConfig` TS 类型新增 `workDir?: string`。

`QQBotTab.tsx` 和 `FeishuTab.tsx` 各新增：
- 文本输入框（显示路径）
- 文件夹选择按钮（调用 Tauri dialog API）
- 说明文字

`createEmptyInstance()` 中 `workDir: ''`。`handleConnect` 构建配置时透传 `workDir`。

### 行为规则

| 场景 | 行为 |
|------|------|
| 实例未配置 work_dir | 保持原有行为，work_dir 为 None |
| 实例配置了 work_dir | 新会话自动注入 |
| 用户发送 `/path` | 覆盖默认值 |
| 用户发送 `/restart` | 清除 work_dir，下条消息重新注入默认值 |
| 用户发送 `/clear` | 保留 work_dir（已有行为不变） |

## 改动文件

| 文件 | 改动 |
|------|------|
| `src-tauri/src/models/config.rs` | 4 个结构体 + 2 个 From + 4 个 Default |
| `src-tauri/src/integrations/manager.rs` | handle_message 签名 + 注入逻辑 + 辅助方法 + task 传参 |
| `src-tauri/src/integrations/common/conversation_store.rs` | 可选：新增 `contains` 方法 |
| `src/types/config.ts` | QQBotInstanceConfig + FeishuInstanceConfig |
| `src/types/integration.ts` | InstanceConfig |
| `src/components/Settings/tabs/QQBotTab.tsx` | UI 控件 + 数据透传 |
| `src/components/Settings/tabs/FeishuTab.tsx` | UI 控件 + 数据透传 |
