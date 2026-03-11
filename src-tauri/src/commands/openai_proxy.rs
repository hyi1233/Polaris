/// OpenAI Proxy Commands
///
/// 提供 OpenAI 兼容 API 的后端代理命令。

use crate::error::Result;
use crate::services::openai_proxy::{ChatMessage, OpenAIProviderConfig, OpenAIProxyService};
use tauri::{Window, State};
use serde::Deserialize;

/// OpenAI Chat 启动参数
#[derive(Debug, Clone, Deserialize)]
pub struct OpenAIChatParams {
    /// Provider 配置
    pub config: OpenAIProviderConfig,
    /// 消息历史
    pub messages: Vec<ChatMessage>,
    /// 上下文 ID
    pub context_id: Option<String>,
}

/// 启动 OpenAI 流式聊天会话
#[tauri::command]
pub async fn start_openai_chat(
    params: OpenAIChatParams,
    window: Window,
) -> Result<String> {
    tracing::info!(
        "[start_openai_chat] 启动 OpenAI 会话，provider: {}, model: {}",
        params.config.provider_name,
        params.config.model
    );

    OpenAIProxyService::start_chat(
        params.config,
        params.messages,
        window,
        params.context_id,
    ).await
}
