# Instance Default Workdir Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 QQ 和飞书机器人实例配置添加 `work_dir` 字段，新会话自动关联工作区。

**Architecture:** 在 Rust 配置结构体中新增 `work_dir: Option<String>`，通过 `instance_registry` 在消息处理入口注入默认值到 `ConversationState`。前端设置 UI 新增工作区输入控件。

**Tech Stack:** Rust (Tauri backend), TypeScript/React (frontend), serde (serialization)

---

### Task 1: Rust 数据模型 — 添加 work_dir 字段

**Files:**
- Modify: `src-tauri/src/models/config.rs`

- [ ] **Step 1: 给 QQBotInstanceConfig 添加 work_dir 字段**

在 `src-tauri/src/models/config.rs` 的 `QQBotInstanceConfig` 结构体中，在 `last_active` 字段之后（约第 146 行后）添加：

```rust
    /// 默认工作目录（新会话自动使用）
    #[serde(default)]
    pub work_dir: Option<String>,
```

- [ ] **Step 2: 给 QQBotInstanceConfig Default impl 添加 work_dir**

在 `QQBotInstanceConfig` 的 `Default` impl 中（约第 164 行 `last_active: None,` 之后）添加：

```rust
            work_dir: None,
```

- [ ] **Step 3: 给 QQBotRuntimeConfig 添加 work_dir 字段**

在 `QQBotRuntimeConfig` 结构体中，在 `auto_connect` 字段之后（约第 190 行后）添加：

```rust
    /// 默认工作目录
    #[serde(default)]
    pub work_dir: Option<String>,
```

- [ ] **Step 4: 给 QQBotRuntimeConfig Default impl 添加 work_dir**

在 `QQBotRuntimeConfig` 的 `Default` impl 中（约第 201 行 `auto_connect: true,` 之后）添加：

```rust
            work_dir: None,
```

- [ ] **Step 5: 更新 QQBotRuntimeConfig 的 From 实现**

在 `From<&QQBotInstanceConfig> for QQBotRuntimeConfig` 实现中（约第 213 行 `auto_connect: instance.auto_connect,` 之后）添加：

```rust
            work_dir: instance.work_dir.clone(),
```

- [ ] **Step 6: 给 FeishuInstanceConfig 添加 work_dir 字段**

在 `FeishuInstanceConfig` 结构体中，在 `last_active` 字段之后（约第 293 行后）添加：

```rust
    /// 默认工作目录（新会话自动使用）
    #[serde(default)]
    pub work_dir: Option<String>,
```

- [ ] **Step 7: 给 FeishuInstanceConfig Default impl 添加 work_dir**

在 `FeishuInstanceConfig` 的 `Default` impl 中（约第 310 行 `last_active: None,` 之后）添加：

```rust
            work_dir: None,
```

- [ ] **Step 8: 给 FeishuRuntimeConfig 添加 work_dir 字段**

在 `FeishuRuntimeConfig` 结构体中，在 `auto_connect` 字段之后（约第 338 行后）添加：

```rust
    /// 默认工作目录
    #[serde(default)]
    pub work_dir: Option<String>,
```

- [ ] **Step 9: 给 FeishuRuntimeConfig Default impl 添加 work_dir**

在 `FeishuRuntimeConfig` 的 `Default` impl 中（约第 350 行 `auto_connect: true,` 之后）添加：

```rust
            work_dir: None,
```

- [ ] **Step 10: 更新 FeishuRuntimeConfig 的 From 实现**

在 `From<&FeishuInstanceConfig> for FeishuRuntimeConfig` 实现中（约第 364 行 `auto_connect: instance.auto_connect,` 之后）添加：

```rust
            work_dir: instance.work_dir.clone(),
```

- [ ] **Step 11: 编译验证**

Run: `cd D:/space/base/Polaris/src-tauri && cargo check 2>&1 | head -30`
Expected: 编译成功，无错误

- [ ] **Step 12: Commit**

```bash
git add src-tauri/src/models/config.rs
git commit -m "feat: 给 QQ/飞书实例配置添加 work_dir 字段"
```

---

### Task 2: 后端注入逻辑 — 消息处理入口注入默认工作区

**Files:**
- Modify: `src-tauri/src/integrations/manager.rs`

- [ ] **Step 1: 给 handle_message 添加 instance_registry 参数**

在 `manager.rs` 中找到 `handle_message` 方法签名（约第 243-251 行），在参数列表末尾添加：

将：
```rust
    async fn handle_message(
        msg: IntegrationMessage,
        app_handle: AppHandle,
        platform: Platform,
        adapters: Arc<Mutex<HashMap<Platform, Box<dyn PlatformIntegration>>>>,
        engine_registry: Option<Arc<Mutex<EngineRegistry>>>,
        conversation_states: Arc<Mutex<ConversationStore>>,
        active_sessions: Arc<Mutex<HashMap<String, tokio::task::JoinHandle<()>>>>,
    ) {
```

改为：
```rust
    async fn handle_message(
        msg: IntegrationMessage,
        app_handle: AppHandle,
        platform: Platform,
        adapters: Arc<Mutex<HashMap<Platform, Box<dyn PlatformIntegration>>>>,
        engine_registry: Option<Arc<Mutex<EngineRegistry>>>,
        conversation_states: Arc<Mutex<ConversationStore>>,
        active_sessions: Arc<Mutex<HashMap<String, tokio::task::JoinHandle<()>>>>,
        instance_registry: Arc<Mutex<InstanceRegistry>>,
    ) {
```

需要在文件顶部确认 `InstanceRegistry` 已导入（已有 `use super::instance_registry::InstanceRegistry;` 或等效 import，如无则添加）。

- [ ] **Step 2: 在 handle_message 中注入默认工作区**

在 `handle_message` 方法体内，找到 `let conversation_id = msg.conversation_id.clone();`（约第 261 行），在其之后、命令解析 `if let Some(cmd) = CommandParser::parse(text)` 之前，插入注入逻辑：

```rust
        // 注入默认工作区（从当前激活实例配置中读取）
        {
            let mut states = conversation_states.lock().await;
            let state = states.get_or_create(&conversation_id);
            if state.work_dir.is_none() {
                if let Some(work_dir) = Self::get_instance_work_dir(&instance_registry, platform).await {
                    tracing::info!("[IntegrationManager] 📂 注入默认工作区: conversation={}, work_dir={}", conversation_id, work_dir);
                    state.work_dir = Some(work_dir);
                }
            }
        }
```

- [ ] **Step 3: 添加 get_instance_work_dir 辅助方法**

在 `IntegrationManager` 的 `impl` 块中（建议放在 `handle_message` 方法之后），添加：

```rust
    /// 获取当前平台激活实例的默认工作目录
    async fn get_instance_work_dir(
        instance_registry: &Arc<Mutex<InstanceRegistry>>,
        platform: Platform,
    ) -> Option<String> {
        let registry = instance_registry.lock().await;
        registry.get_active(platform)
            .and_then(|inst| match &inst.config {
                InstanceConfig::QQBot(cfg) => cfg.work_dir.clone(),
                InstanceConfig::Feishu(cfg) => cfg.work_dir.clone(),
            })
            .filter(|dir| !dir.is_empty())
    }
```

需要在文件顶部确认 `InstanceConfig` 已导入（查找 `use super::instance_registry::InstanceConfig;`，如无则添加）。

- [ ] **Step 4: 在 start_message_processing_task 中传递 instance_registry**

在 `start_message_processing_task` 方法中（约第 1496 行），找到 clone 引用的位置（约第 1502-1508 行），在 `let conversation_queues = self.conversation_queues.clone();` 之后添加：

```rust
        let instance_registry = self.instance_registry.clone();
```

然后在 spawned task 内部（约第 1542-1548 行 clone Arc 的位置），在 `let task_conversation_queues = conversation_queues.clone();` 之后添加：

```rust
                    let task_instance_registry = instance_registry.clone();
```

在调用 `Self::handle_message` 的位置（约第 1555-1563 行），在 `task_active_sessions,` 之后添加参数：

```rust
                            task_instance_registry,
```

- [ ] **Step 5: 编译验证**

Run: `cd D:/space/base/Polaris/src-tauri && cargo check 2>&1 | head -30`
Expected: 编译成功

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/integrations/manager.rs
git commit -m "feat: 消息处理入口自动注入实例默认工作区"
```

---

### Task 3: 前端类型定义

**Files:**
- Modify: `src/types/config.ts`
- Modify: `src/types/integration.ts`

- [ ] **Step 1: 更新 config.ts 中的 QQBotInstanceConfig**

在 `src/types/config.ts` 中找到 `QQBotInstanceConfig` 接口（约第 37-58 行），在 `lastActive` 字段之后添加：

```typescript
  /** 默认工作目录（新会话自动使用） */
  workDir?: string;
```

- [ ] **Step 2: 更新 config.ts 中的 FeishuInstanceConfig**

在同一文件中找到 `FeishuInstanceConfig` 接口（约第 71-94 行），在 `lastActive` 字段之后添加：

```typescript
  /** 默认工作目录（新会话自动使用） */
  workDir?: string;
```

- [ ] **Step 3: 更新 integration.ts 中的 InstanceConfig**

在 `src/types/integration.ts` 中找到 `InstanceConfig` 接口（约第 64-80 行），在 `autoConnect` 字段之后添加：

```typescript
  /** 默认工作目录 */
  workDir?: string;
```

- [ ] **Step 4: Commit**

```bash
git add src/types/config.ts src/types/integration.ts
git commit -m "feat: 前端类型添加 workDir 字段"
```

---

### Task 4: QQ Bot 设置 UI

**Files:**
- Modify: `src/components/Settings/tabs/QQBotTab.tsx`

- [ ] **Step 1: 更新 createEmptyInstance 添加 workDir**

在 `QQBotTab.tsx` 中找到 `createEmptyInstance()` 函数（约第 38-58 行），在 `config` 对象的 `autoConnect: false,` 之后添加：

```typescript
      workDir: '',
```

- [ ] **Step 2: 在实例配置编辑区域添加默认工作区输入**

在 JSX 中找到 Client Secret 输入区块的结束 `</div>` 标签（约第 435 行），在其之后、操作按钮 `{/* 操作按钮 */}` 注释之前，插入：

```tsx
                {/* 默认工作区 */}
                <div>
                  <label className="block text-xs text-text-secondary mb-2">默认工作区</label>
                  <input
                    type="text"
                    value={editingInstance.config.workDir || ''}
                    onChange={(e) => updateEditingConfig({ workDir: e.target.value })}
                    placeholder="新会话自动使用此目录（可选，留空则使用应用默认目录）"
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={loading}
                  />
                </div>
```

- [ ] **Step 3: 在 handleConnect 中透传 workDir**

在 `handleConnect` 函数中找到构建 `qqbotConfig` 的位置（约第 214-229 行），在 `autoConnect: editingInstance.config.autoConnect,` 之后添加：

```typescript
          workDir: editingInstance.config.workDir || undefined,
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Settings/tabs/QQBotTab.tsx
git commit -m "feat: QQ Bot 设置页面添加默认工作区配置"
```

---

### Task 5: 飞书设置 UI

**Files:**
- Modify: `src/components/Settings/tabs/FeishuTab.tsx`

- [ ] **Step 1: 更新 createEmptyInstance 添加 workDir**

在 `FeishuTab.tsx` 中找到 `createEmptyInstance()` 函数（约第 38-58 行），在 `config` 对象的 `autoConnect: false,` 之后添加：

```typescript
      workDir: '',
```

- [ ] **Step 2: 在实例配置编辑区域添加默认工作区输入**

在 JSX 中找到 App Secret 输入区块的结束 `</div>` 标签（约第 414 行），在其之后、操作按钮 `{/* 操作按钮 */}` 注释之前，插入：

```tsx
                {/* 默认工作区 */}
                <div>
                  <label className="block text-xs text-text-secondary mb-2">默认工作区</label>
                  <input
                    type="text"
                    value={editingInstance.config.workDir || ''}
                    onChange={(e) => updateEditingConfig({ workDir: e.target.value })}
                    placeholder="新会话自动使用此目录（可选，留空则使用应用默认目录）"
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={loading}
                  />
                </div>
```

- [ ] **Step 3: 在 handleConnect 中透传 workDir**

在 `handleConnect` 函数中找到构建 `fConfig` 的位置（约第 191-207 行），在 `autoConnect: editingInstance.config.autoConnect,` 之后添加：

```typescript
          workDir: editingInstance.config.workDir || undefined,
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Settings/tabs/FeishuTab.tsx
git commit -m "feat: 飞书设置页面添加默认工作区配置"
```

---

### Task 6: 全量编译验证

**Files:**
- No new files

- [ ] **Step 1: Rust 编译检查**

Run: `cd D:/space/base/Polaris/src-tauri && cargo check 2>&1 | tail -10`
Expected: 编译成功

- [ ] **Step 2: 前端编译检查**

Run: `cd D:/space/base/Polaris && npx tsc --noEmit 2>&1 | tail -20`
Expected: 无类型错误

- [ ] **Step 3: 确认所有文件变更**

Run: `git diff --stat HEAD~5`
Expected: 7 个文件修改，与计划中的文件清单一致
