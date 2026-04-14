# Auto-Mode 配置增强设计文档

> **Created:** 2026-04-14
> **Status:** Design Complete, Ready for Implementation

## 概述

增强 Auto-Mode 配置面板，从"只读查看"升级为"可视化编辑 + 高级 JSON 编辑"双模式，让用户能够自定义 Claude CLI 的安全规则。

## 背景

### 现状问题

1. AutoModeTab 只能查看 CLI 输出的规则，无法编辑
2. 用户需要手动编辑 `~/.claude/settings.json` 才能自定义规则
3. 不了解自定义规则与默认规则的合并逻辑

### 用户需求

- 在界面内添加/删除自定义规则
- 区分"我的规则"和"默认规则"
- 支持高级用户直接编辑 JSON

## 设计方案

### 1. 数据模型

#### settings.json 结构

```json
{
  "env": { ... },
  "model": "...",
  "enabledPlugins": { ... },
  "autoMode": {
    "allow": ["自定义允许规则1", "自定义允许规则2"],
    "softDeny": ["自定义需确认规则1"]
  }
}
```

#### CLI 输出合并逻辑

```
claude auto-mode config = 用户自定义 + 默认规则（合并）
claude auto-mode defaults = 仅默认规则
```

#### 前端数据结构

```typescript
// 规则来源区分
interface AutoModeRules {
  custom: {
    allow: string[];
    softDeny: string[];
  };
  defaults: {
    allow: string[];
    softDeny: string[];
    environment: string[];
  };
  merged: {
    allow: string[];
    softDeny: string[];
    environment: string[];
  };
}
```

### 2. UI 设计

#### 布局结构

```
┌─────────────────────────────────────────────────────────────┐
│  自动模式                                                    │
├─────────────────────────────────────────────────────────────┤
│  [📋 规则列表]  [⚙️ 高级编辑]                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  规则列表模式:                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ℹ️ 自动模式控制 Claude 在没有确认的情况下可以执行哪些操作  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─ 我的规则 (可编辑) ─────────────────────────────────────┐│
│  │ 允许规则 (0)           需确认规则 (0)                    ││
│  │                                                         ││
│  │ [+ 添加允许规则]  [+ 添加需确认规则]                     ││
│  │                                                         ││
│  │ 规则项: [名称: 描述] [删除]                              ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─ 默认规则 (参考) ───────────────────────────── [展开 ▼] ┐│
│  │ 内置规则，不可修改。展开查看完整列表。                    ││
│  │ 允许: 8 条 | 需确认: 31 条                               ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  高级编辑模式:                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 直接编辑 ~/.claude/settings.json                        ││
│  │ ┌─────────────────────────────────────────────────────┐ ││
│  │ │ {                                    │ ││
│  │ │   "autoMode": {                      │ ││
│  │ │     "allow": [...],                  │ ││
│  │ │     "softDeny": [...]                │ ││
│  │ │   }                                  │ ││
│  │ │ }                                    │ ││
│  │ └─────────────────────────────────────────────────────┘ ││
│  │ [保存] [重置为默认]                                      ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

#### 交互设计

| 操作 | 行为 |
|------|------|
| 添加规则 | 弹出对话框，输入规则名称和描述 |
| 删除规则 | 确认后从列表移除，保存到文件 |
| 展开默认规则 | 显示完整默认规则列表（只读） |
| 高级编辑保存 | 校验 JSON 格式，写入 settings.json |
| 切换模式 | 保持数据同步 |

### 3. 后端 API

#### 新增 Tauri 命令

```rust
// src-tauri/src/commands/claude_settings.rs

/// 读取 Claude settings.json
#[tauri::command]
pub async fn read_claude_settings() -> Result<ClaudeSettings>;

/// 写入 Claude settings.json
#[tauri::command]
pub async fn write_claude_settings(settings: ClaudeSettings) -> Result<()>;
```

#### 数据模型

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaudeSettings {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub env: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enabled_plugins: Option<HashMap<String, bool>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auto_mode: Option<AutoModeCustomRules>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoModeCustomRules {
    #[serde(default)]
    pub allow: Vec<String>,
    #[serde(default, rename = "softDeny")]
    pub soft_deny: Vec<String>,
}
```

#### 文件路径

```
全局: ~/.claude/settings.json
项目: ./.claude/settings.json (优先级更高，暂不支持)
```

### 4. 前端实现

#### Store 扩展

```typescript
// src/stores/autoModeStore.ts

interface AutoModeState {
  // 已有
  config: AutoModeConfig | null;
  defaults: AutoModeDefaults | null;
  loading: boolean;
  error: string | null;
  searchQuery: string;

  // 新增
  customRules: { allow: string[]; softDeny: string[] } | null;
  settingsJson: string | null;
  editMode: 'list' | 'advanced';

  // 已有 Actions
  fetchConfig: () => Promise<void>;
  fetchDefaults: () => Promise<void>;
  refreshAll: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  clearError: () => void;

  // 新增 Actions
  fetchCustomRules: () => Promise<void>;
  addCustomRule: (type: 'allow' | 'softDeny', rule: string) => Promise<void>;
  removeCustomRule: (type: 'allow' | 'softDeny', index: number) => Promise<void>;
  saveCustomRules: () => Promise<void>;
  setEditMode: (mode: 'list' | 'advanced') => void;
  updateSettingsJson: (json: string) => void;
  saveSettingsJson: () => Promise<void>;
}
```

#### 组件结构

```tsx
// src/components/Settings/tabs/AutoModeTab.tsx

export function AutoModeTab() {
  const { editMode, setEditMode, ... } = useAutoModeStore();

  return (
    <div className="space-y-4">
      {/* Tab 切换 */}
      <TabSwitcher active={editMode} onChange={setEditMode} />

      {editMode === 'list' ? (
        <RulesListMode />
      ) : (
        <AdvancedEditMode />
      )}
    </div>
  );
}

function RulesListMode() {
  return (
    <>
      <InfoCard />
      <CustomRulesSection />
      <DefaultRulesSection collapsible />
    </>
  );
}

function AdvancedEditMode() {
  return (
    <>
      <JsonEditor />
      <ActionButtons />
    </>
  );
}
```

### 5. 文件改动清单

#### 新建文件

| 文件 | 说明 |
|------|------|
| `src-tauri/src/commands/claude_settings.rs` | 读写 settings.json 命令 |
| `src/services/claudeSettingsService.ts` | 前端服务封装 |

#### 修改文件

| 文件 | 改动 |
|------|------|
| `src-tauri/src/lib.rs` | 注册新命令 |
| `src-tauri/src/commands/mod.rs` | 导出新模块 |
| `src/stores/autoModeStore.ts` | 扩展状态管理 |
| `src/components/Settings/tabs/AutoModeTab.tsx` | 重构 UI |
| `src/types/autoMode.ts` | 新增类型定义 |
| `src/locales/zh-CN/settings.json` | 中文国际化 |
| `src/locales/en-US/settings.json` | 英文国际化 |

### 6. 国际化

```json
{
  "autoMode": {
    "tabRulesList": "规则列表",
    "tabAdvancedEdit": "高级编辑",
    "myRules": "我的规则",
    "defaultRules": "默认规则",
    "defaultRulesHint": "内置规则，不可修改",
    "addAllowRule": "添加允许规则",
    "addSoftDenyRule": "添加需确认规则",
    "editJson": "直接编辑 settings.json",
    "save": "保存",
    "reset": "重置",
    "ruleName": "规则名称",
    "ruleDescription": "规则描述",
    "confirmDelete": "确定删除此规则？"
  }
}
```

### 7. 错误处理

| 场景 | 处理 |
|------|------|
| settings.json 不存在 | 创建新文件，只包含 autoMode 字段 |
| JSON 解析失败 | 提示错误，显示原始内容 |
| 写入失败 | Toast 提示，不更新 UI 状态 |
| CLI 命令失败 | 显示错误信息，提供重试按钮 |

### 8. 测试要点

- [ ] 读取空 settings.json
- [ ] 读取无 autoMode 字段的 settings.json
- [ ] 添加/删除规则后正确保存
- [ ] JSON 编辑模式保存成功
- [ ] 格式错误的 JSON 阻止保存
- [ ] 与 CLI config/defaults 输出一致性

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| settings.json 格式变化 | 读写失败 | 使用宽松解析，保留未知字段 |
| 并发写入冲突 | 数据丢失 | 写入前备份，失败时回滚 |
| 用户误操作 | 丢失配置 | 提供重置功能，显示确认对话框 |

## 后续扩展

1. **项目级配置** - 支持 `.claude/settings.json` 优先级
2. **规则模板** - 提供常用规则模板快速添加
3. **AI 规则审查** - 集成 `claude auto-mode critique` 命令
4. **配置同步** - 云端同步自定义规则
