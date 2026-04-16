# `--fork-session` / `--from-pr` 高级会话管理可视化方案

> **文档版本**: v1.0
> **分析日期**: 2026-04-16
> **状态**: 分析完成
> **关联文档**: `01-会话时间线系统设计.md`, `02-原型设计.md`

---

## 一、命令功能深度分析

### 1.1 `--fork-session` 命令

#### 官方定义

```
--fork-session    When resuming, create a new session ID instead of reusing the original
                  (use with --resume or --continue)
```

#### 核心功能

`--fork-session` 是一个会话分叉功能，允许用户从现有会话创建一个**独立的分支会话**：

```
原始会话 (session-A)
    │
    ├── 消息 1: 用户提问
    ├── 消息 2: AI 回复
    ├── 消息 3: 用户追问
    ├── 消息 4: AI 回复
    │
    └── [fork] ──→ 分支会话 (session-B，新 UUID)
                       │
                       ├── 继承消息 1-4 的上下文
                       ├── 消息 5: 新用户提问 (在分支中)
                       └── 消息 6: AI 回复 (在分支中)
```

#### 使用场景

| 场景 | 描述 | 价值 |
|------|------|------|
| 方案对比 | 从同一决策点尝试不同方案 | ⭐⭐⭐⭐⭐ |
| 安全探索 | 在不污染原会话的情况下测试想法 | ⭐⭐⭐⭐ |
| 分支开发 | 从某个检查点开始新的工作流 | ⭐⭐⭐⭐ |
| 错误恢复 | 从之前的正确状态重新开始 | ⭐⭐⭐ |

#### CLI 使用方式

```bash
# 方式 1: 从指定会话 fork
claude -r <session-id> --fork-session

# 方式 2: 从最近会话 fork
claude -c --fork-session

# 方式 3: 带初始提示 fork
claude -r <session-id> --fork-session "尝试另一个方案"
```

#### 数据结构分析

**会话文件存储位置**:
```
~/.claude/projects/{project-hash}/
├── {session-id-1}.jsonl        # 原始会话
├── {session-id-2}.jsonl        # fork 后的新会话（新 UUID）
└── ...
```

**JSONL 记录结构** (无显式 parentSession 字段):
```json
{
  "type": "user",
  "sessionId": "new-forked-session-id",
  "parentUuid": "...",
  "message": {...},
  "timestamp": "...",
  "cwd": "D:\\space\\base\\Polaris",
  "version": "2.1.109",
  "gitBranch": "test/6.0.0"
}
```

**关键发现**:
- fork 后的会话使用**新的 UUID**
- fork 会话的 JSONL 文件是**独立的**，不与原会话共享
- fork 会话**继承原会话的消息历史**作为上下文
- 目前**没有显式的 `parentSessionId` 字段**记录 fork 关系

---

### 1.2 `--from-pr` 命令

#### 官方定义

```
--from-pr [value]    Resume a session linked to a PR by PR number/URL,
                     or open interactive picker with optional search term
```

#### 核心功能

`--from-pr` 实现 PR 与会话的关联，支持从 PR 快速恢复工作上下文：

```
PR #123 (修复登录 Bug)
    │
    ├── 关联的会话记录
    │   ├── 会话 A: 初次调试
    │   ├── 会话 B: 方案验证
    │   └── 会话 C: 最终修复
    │
    └── 恢复入口 ──→ claude --from-pr 123
```

#### 使用场景

| 场景 | 描述 | 价值 |
|------|------|------|
| PR 继续 | 继续处理未完成的 PR 工作 | ⭐⭐⭐⭐⭐ |
| 上下文恢复 | 快速获取 PR 相关的开发上下文 | ⭐⭐⭐⭐⭐ |
| 代码审查 | 查看 PR 背后的讨论和决策过程 | ⭐⭐⭐⭐ |
| 团队协作 | 了解他人 PR 的实现细节 | ⭐⭐⭐⭐ |

#### CLI 使用方式

```bash
# 方式 1: 按 PR 号恢复
claude --from-pr 123

# 方式 2: 按 PR URL 恢复
claude --from-pr https://github.com/owner/repo/pull/123

# 方式 3: 交互式选择
claude --from-pr

# 方式 4: 带搜索词
claude --from-pr "login bug"
```

#### 技术实现推测

```
┌─────────────────────────────────────────────────────────────────┐
│                    --from-pr 实现流程                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. 解析 PR 标识                                                 │
│     ├── PR 号: 直接使用                                          │
│     ├── PR URL: 提取 owner/repo/number                          │
│     └── 搜索词: 调用 GitHub API 搜索                             │
│                                                                  │
│  2. 查找关联会话                                                 │
│     ├── 读取 git branch 信息                                     │
│     ├── 匹配会话的 gitBranch 字段                                │
│     └── 或查找 PR 相关的提交哈希                                 │
│                                                                  │
│  3. 恢复会话                                                     │
│     ├── 找到关联会话 → 恢复                                      │
│     └── 未找到 → 创建新会话并关联 PR 分支                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、现有系统分析

### 2.1 Polaris 现有架构

#### 会话存储结构

```typescript
// src/services/claudeCodeHistoryService.ts

interface ClaudeCodeSessionMeta {
  sessionId: string
  projectPath: string       // 真实工作区路径
  claudeProjectName: string // Claude Code 目录名
  firstPrompt?: string
  messageCount: number
  created?: string
  modified?: string
  filePath: string
  fileSize: number
}
```

**缺失**:
- ❌ 无 fork 关系追踪 (`parentSessionId`)
- ❌ 无 PR 关联信息 (`linkedPR`)
- ❌ 无会话分支可视化

#### 后端 Rust 实现

```rust
// src-tauri/src/commands/chat.rs

pub async fn list_claude_code_sessions() -> Result<Vec<ClaudeSessionMeta>> {
    // 遍历 ~/.claude/projects/{project}/
    // 读取所有 .jsonl 文件
    // 返回会话元数据列表
}

pub async fn get_claude_code_session_history(session_id: String) -> Result<Vec<ClaudeHistoryMessage>> {
    // 读取指定 session 的 JSONL 文件
    // 解析消息记录
}
```

**缺失**:
- ❌ 无 fork 会话识别
- ❌ 无 PR 关联查询
- ❌ 无会话关系图构建

### 2.2 用户痛点分析

| 痛点 | 当前状态 | 影响程度 |
|------|----------|----------|
| 无法知道哪些会话是 fork 来的 | ❌ 无标识 | ⭐⭐⭐⭐ |
| 无法追溯会话的"父会话" | ❌ 无关联 | ⭐⭐⭐⭐⭐ |
| 无法快速找到 PR 相关会话 | ❌ 无关联 | ⭐⭐⭐⭐ |
| 会话历史是扁平列表 | ❌ 无树形结构 | ⭐⭐⭐⭐ |

---

## 三、可视化方案设计

### 3.1 会话树形视图

```
┌─────────────────────────────────────────────────────────────────┐
│ 📋 会话历史                                    [🔍] [⚙️] [🔄]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📁 Polaris 项目                                                 │
│  │                                                               │
│  ├── 🟢 2026-04-16 19:00  会话: PR #123 修复                     │
│  │   │   └─ 🔗 PR #123: Fix login bug                           │
│  │   │                                                          │
│  │   ├── 📌 2026-04-16 18:30  分支: 尝试方案 A                   │
│  │   │   └─ 💬 "使用 JWT 替代 session..."                       │
│  │   │                                                          │
│  │   └── 📌 2026-04-16 18:45  分支: 最终方案                     │
│  │       └─ 💬 "方案 B 更安全..."                                │
│  │                                                              │
│  ├── 🔵 2026-04-15 14:00  会话: 新功能开发                       │
│  │   │                                                          │
│  │   └── 📌 2026-04-15 15:00  分支: 测试实现                     │
│  │       └─ 💬 "先写个 demo..."                                  │
│  │                                                              │
│  └── ⚫ 2026-04-10 10:00  会话: 项目初始化                        │
│      └─ 💬 "创建项目结构..."                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**图例说明**:
- 🟢 活跃会话（最近有活动）
- 🔵 普通会话
- ⚫ 已归档会话
- 📌 Fork 分支会话
- 🔗 PR 关联标识

### 3.2 会话详情面板

```
┌─────────────────────────────────────────────────────────────────┐
│ 📋 会话详情                                        [×] 关闭      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  会话 ID: 31baa6c5-e31b-44f6-8a0d-d41fd9cffef5                  │
│  创建时间: 2026-04-16 19:00:34                                   │
│  最后活动: 2026-04-16 19:12:45                                   │
│  消息数量: 42                                                    │
│                                                                  │
│  ┌─── 关联信息 ───────────────────────────────────────────────┐ │
│  │  🔗 PR: #123 Fix login bug                                  │ │
│  │  🌿 分支: test/6.0.0                                        │ │
│  │  📂 从会话分叉: a1b2c3d4-... (点击跳转)                      │ │
│  │  📌 子会话: 2 个 (点击展开)                                  │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─── 操作 ─────────────────────────────────────────────────────┐ │
│  │  [▶️ 恢复会话]  [🔀 分叉新会话]  [📤 导出]  [🗑️ 删除]        │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─── 消息预览 ─────────────────────────────────────────────────┐ │
│  │  用户: 分析 --fork-session 命令...                          │ │
│  │  助手: 我来帮你分析这个命令...                               │ │
│  │  ...                                                        │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 PR 关联视图

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔗 PR 关联会话                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PR #123: Fix login bug                                         │
│  状态: 🟢 Open  │  作者: developer  │  分支: fix/login          │
│                                                                  │
│  ┌─── 关联会话时间线 ──────────────────────────────────────────┐ │
│  │                                                              │ │
│  │  2026-04-15 10:00  🟢 初次调试                               │ │
│  │       └─ 💬 "登录 bug 复现..."                               │ │
│  │                         │                                    │ │
│  │  2026-04-15 14:00  📌 方案验证 (fork)                        │ │
│  │       └─ 💬 "尝试 JWT 方案..."                               │ │
│  │                         │                                    │ │
│  │  2026-04-16 09:00  🟢 最终修复                               │ │
│  │       └─ 💬 "方案确认，合并..."                              │ │
│  │                                                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [▶️ 恢复最新会话]  [📋 查看所有]                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 四、技术实现方案

### 4.1 数据模型扩展

```typescript
// 扩展会话元数据
interface EnhancedSessionMeta extends ClaudeCodeSessionMeta {
  // Fork 关系
  parentSessionId?: string      // 父会话 ID（fork 来源）
  childSessionIds?: string[]    // 子会话 ID 列表
  forkDepth?: number            // fork 深度（0 = 原始会话）

  // PR 关联
  linkedPR?: {
    number: number
    url: string
    title: string
    state: 'open' | 'merged' | 'closed'
  }

  // Git 信息
  gitBranch?: string
  gitCommit?: string

  // 会话标签
  tags?: string[]
  isPinned?: boolean
}
```

### 4.2 Fork 关系推断算法

由于 Claude CLI 不显式记录 fork 关系，需要通过以下方式推断：

```typescript
interface SessionFingerprint {
  sessionId: string
  firstMessages: string[]      // 前 N 条消息的内容哈希
  createdAt: number
  gitBranch?: string
}

function inferForkRelationship(sessions: SessionMeta[]): ForkTree {
  // 1. 按时间排序
  sessions.sort((a, b) => a.created - b.created)

  // 2. 构建消息指纹
  const fingerprints = sessions.map(s => computeFingerprint(s.firstMessages))

  // 3. 找到相同前缀的会话
  for (let i = 1; i < sessions.length; i++) {
    for (let j = 0; j < i; j++) {
      if (hasCommonPrefix(fingerprints[i], fingerprints[j])) {
        // i 是 j 的 fork
        sessions[i].parentSessionId = sessions[j].sessionId
      }
    }
  }

  return buildTree(sessions)
}

function computeFingerprint(messages: Message[]): SessionFingerprint {
  // 取前 5 条消息的内容生成指纹
  const contentHashes = messages.slice(0, 5).map(m =>
    hashMessage(m.content)
  )
  return {
    sessionId: messages[0].sessionId,
    firstMessages: contentHashes,
    createdAt: new Date(messages[0].timestamp).getTime()
  }
}

function hasCommonPrefix(fp1: SessionFingerprint, fp2: SessionFingerprint): boolean {
  // 检查是否有共同的消息前缀
  const minLength = Math.min(fp1.firstMessages.length, fp2.firstMessages.length)
  if (minLength < 2) return false

  let matchCount = 0
  for (let i = 0; i < minLength; i++) {
    if (fp1.firstMessages[i] === fp2.firstMessages[i]) {
      matchCount++
    }
  }

  // 至少 80% 的前缀匹配
  return matchCount / minLength >= 0.8
}
```

### 4.3 PR 关联实现

```typescript
// 通过 git branch 关联 PR
async function linkSessionToPR(
  session: SessionMeta,
  githubClient: GitHubClient
): Promise<PRInfo | null> {
  if (!session.gitBranch) return null

  // 1. 解析 branch 名称
  const prNumber = extractPRFromBranch(session.gitBranch)
  // e.g., "fix/pr-123" → 123
  // e.g., "feature/123-some-feature" → 123

  // 2. 调用 GitHub API
  if (prNumber) {
    try {
      const pr = await githubClient.getPR(prNumber)
      return {
        number: pr.number,
        url: pr.html_url,
        title: pr.title,
        state: pr.state
      }
    } catch (e) {
      console.warn('Failed to fetch PR info:', e)
      return null
    }
  }

  return null
}

// 分支名称解析规则
function extractPRFromBranch(branchName: string): number | null {
  // 规则 1: pr-123 或 pr/123
  const prPattern = /pr[-\/](\d+)/i
  const prMatch = branchName.match(prPattern)
  if (prMatch) return parseInt(prMatch[1])

  // 规则 2: 123-feature-description
  const numberPrefix = /^(\d+)-/
  const numMatch = branchName.match(numberPrefix)
  if (numMatch) return parseInt(numMatch[1])

  return null
}
```

### 4.4 组件架构

```
src/components/SessionTimeline/
├── index.ts                    # 导出
├── SessionTimeline.tsx         # 主容器组件
├── SessionTree/
│   ├── SessionTree.tsx         # 会话树主组件
│   ├── SessionNode.tsx         # 会话节点
│   ├── BranchNode.tsx          # 分支节点
│   ├── TimeGroup.tsx           # 时间分组
│   └── PRBadge.tsx             # PR 标识
├── SessionDetail/
│   ├── SessionDetail.tsx       # 详情面板
│   ├── ForkIndicator.tsx       # Fork 关系指示
│   ├── PRLinkView.tsx          # PR 关联视图
│   └── MessagePreview.tsx      # 消息预览
├── hooks/
│   ├── useSessionTree.ts       # 会话树数据
│   ├── useForkDetection.ts     # fork 检测
│   └── usePRLinking.ts         # PR 关联
└── types.ts                    # 类型定义
```

---

## 五、实施计划

### Phase 1: 数据层 (1 周)

| 任务 | 描述 | 优先级 |
|------|------|--------|
| 扩展 SessionMeta | 添加 parentSessionId, linkedPR 等字段 | P0 |
| 实现 fork 检测 | 基于消息指纹推断 fork 关系 | P0 |
| 实现 PR 关联 | 通过 git branch 关联 PR | P1 |
| 缓存优化 | 会话树数据缓存 | P1 |

### Phase 2: UI 层 (1.5 周)

| 任务 | 描述 | 优先级 |
|------|------|--------|
| SessionTree 组件 | 树形会话列表 | P0 |
| ForkIndicator 组件 | fork 标识和连线 | P0 |
| SessionDetail 组件 | 会话详情面板 | P0 |
| PRLinkView 组件 | PR 关联视图 | P1 |

### Phase 3: 集成 (0.5 周)

| 任务 | 描述 | 优先级 |
|------|------|--------|
| 接入现有 SessionHistoryPanel | 替换/增强现有组件 | P0 |
| 添加 fork 操作入口 | 在会话详情中添加 fork 按钮 | P0 |
| PR 快捷入口 | 从 GitPanel 快速跳转到关联会话 | P1 |

---

## 六、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| fork 关系推断不准确 | 中 | 允许用户手动标记 fork 关系 |
| GitHub API 限流 | 低 | 缓存 PR 信息，减少调用 |
| 大量会话性能问题 | 中 | 虚拟滚动 + 分页加载 |
| 跨项目会话关联 | 低 | 暂不支持，后续扩展 |

---

## 七、与现有设计的融合

本方案与 `01-会话时间线系统设计.md` 高度互补：

| 设计文档 | 本方案补充 |
|----------|-----------|
| 会话时间线 | 增加 fork 分支可视化 |
| 回放功能 | 增加 PR 关联上下文 |
| 会话对比 | 增加 fork 会话对比 |

建议将本方案作为 Phase 2 功能纳入会话时间线系统整体规划。

---

*文档更新时间: 2026-04-16*
