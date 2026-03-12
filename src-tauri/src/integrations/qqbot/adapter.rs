/**
 * QQ Bot 适配器
 *
 * 实现 PlatformIntegration Trait，提供 QQ Bot 的连接、消息收发功能。
 */

use async_trait::async_trait;
use futures_util::{SinkExt, StreamExt};
use tokio::sync::mpsc::Sender;
use tokio_tungstenite::{connect_async, tungstenite::Message as WsMessage};

use crate::error::{AppError, Result};
use crate::models::config::QQBotConfig;
use super::super::common::MessageDedup;
use super::super::traits::PlatformIntegration;
use super::super::types::*;

/// QQ Bot Intents
/// 参考: https://bot.q.qq.com/wiki/develop/api-v2/
const INTENTS_DEFAULT: u32 =
    (1 << 0) |   // GUILDS
    (1 << 1) |   // GUILD_MEMBERS
    (1 << 9) |   // GUILD_MESSAGES
    (1 << 12) |  // DIRECT_MESSAGE
    (1 << 25) |  // AT_MESSAGES
    (1 << 30);   // PUBLIC_GUILD_MESSAGES

/// QQ Bot 适配器
pub struct QQBotAdapter {
    /// 配置
    config: QQBotConfig,
    /// Access Token
    access_token: Option<String>,
    /// Token 过期时间
    token_expire_at: i64,
    /// 消息发送通道
    message_tx: Option<Sender<IntegrationMessage>>,
    /// 状态
    status: IntegrationStatus,
    /// 消息去重器
    dedup: MessageDedup,
    /// WebSocket 任务句柄
    ws_task: Option<tokio::task::JoinHandle<()>>,
    /// 关闭信号发送端
    shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
}

impl QQBotAdapter {
    /// 创建新的 QQ Bot 适配器
    pub fn new(config: QQBotConfig) -> Self {
        Self {
            config,
            access_token: None,
            token_expire_at: 0,
            message_tx: None,
            status: IntegrationStatus::new(Platform::QQBot),
            dedup: MessageDedup::default(),
            ws_task: None,
            shutdown_tx: None,
        }
    }

    /// 获取 API 基础 URL
    fn api_base(&self) -> &'static str {
        if self.config.sandbox {
            "https://sandbox.api.sgroup.qq.com"
        } else {
            "https://api.sgroup.qq.com"
        }
    }

    /// 获取 Access Token
    async fn get_access_token(&mut self) -> Result<()> {
        let client = reqwest::Client::new();

        let response = client
            .post("https://bots.qq.com/app/getAppAccessToken")
            .json(&serde_json::json!({
                "appId": self.config.app_id,
                "clientSecret": self.config.client_secret
            }))
            .send()
            .await
            .map_err(|e| AppError::NetworkError(e.to_string()))?;

        if !response.status().is_success() {
            let error = response.text().await.unwrap_or_default();
            return Err(AppError::AuthError(format!("获取 Access Token 失败: {}", error)));
        }

        let data: serde_json::Value = response
            .json()
            .await
            .map_err(|e| AppError::ParseError(e.to_string()))?;

        self.access_token = data
            .get("access_token")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let expires_in = data
            .get("expires_in")
            .and_then(|v| v.as_i64())
            .unwrap_or(7200);

        // 提前 5 分钟过期
        self.token_expire_at = chrono::Utc::now().timestamp() + expires_in - 300;

        tracing::info!("[QQBot] Access token obtained, expires in {}s", expires_in);

        if self.access_token.is_none() {
            return Err(AppError::AuthError("响应中没有 access_token".to_string()));
        }

        Ok(())
    }

    /// 检查 Token 是否过期
    fn is_token_expired(&self) -> bool {
        self.access_token.is_none() || chrono::Utc::now().timestamp() >= self.token_expire_at
    }

    /// 确保 Token 有效
    async fn ensure_valid_token(&mut self) -> Result<()> {
        if self.is_token_expired() {
            self.get_access_token().await?;
        }
        Ok(())
    }

    /// 获取 WebSocket Gateway URL
    async fn get_gateway_url(&self) -> Result<String> {
        let client = reqwest::Client::new();

        let response = client
            .get(format!("{}/gateway/bot", self.api_base()))
            .header(
                "Authorization",
                format!("QQBot {}", self.access_token.as_ref().unwrap()),
            )
            .header("User-Agent", "Polaris/1.0")
            .send()
            .await
            .map_err(|e| AppError::NetworkError(e.to_string()))?;

        if !response.status().is_success() {
            let error = response.text().await.unwrap_or_default();
            return Err(AppError::ApiError(format!("获取 Gateway URL 失败: {}", error)));
        }

        let data: serde_json::Value = response
            .json()
            .await
            .map_err(|e| AppError::ParseError(e.to_string()))?;

        data.get("url")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .ok_or_else(|| AppError::ApiError("响应中没有 gateway URL".to_string()))
    }

    /// 解析消息内容
    fn parse_content(raw: &serde_json::Value) -> MessageContent {
        let content = raw
            .get("content")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        // 检查附件
        if let Some(attachments) = raw.get("attachments").and_then(|v| v.as_array()) {
            if !attachments.is_empty() {
                let mut items = vec![MessageContent::text(content)];

                for att in attachments {
                    let content_type = att
                        .get("content_type")
                        .and_then(|v| v.as_str())
                        .unwrap_or("");

                    if content_type.starts_with("image/") {
                        items.push(MessageContent::Image {
                            url: att
                                .get("url")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            local_path: None,
                        });
                    } else if content_type.starts_with("audio/") {
                        items.push(MessageContent::Audio {
                            url: att
                                .get("url")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            transcript: None,
                        });
                    }
                }

                return MessageContent::Mixed { items };
            }
        }

        MessageContent::text(content)
    }

    /// 处理消息事件
    fn handle_message_event(
        event_type: &str,
        event_data: &serde_json::Value,
        dedup: &mut MessageDedup,
    ) -> Option<IntegrationMessage> {
        // 获取消息 ID
        let msg_id = event_data.get("id").and_then(|v| v.as_str())?;
        let msg_type = if event_type == "C2C_MESSAGE_CREATE" {
            "c2c"
        } else {
            "channel"
        };
        let message_id = format!("{}_{}", msg_type, msg_id);

        // 去重检查
        if dedup.is_processed(&message_id) {
            tracing::trace!("[QQBot] Duplicate message ignored: {}", message_id);
            return None;
        }

        // 获取会话 ID
        let conversation_id = if event_type == "C2C_MESSAGE_CREATE" {
            format!(
                "c2c_{}",
                event_data
                    .get("author")
                    .and_then(|a| a.get("user_openid"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
            )
        } else {
            event_data
                .get("channel_id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string()
        };

        // 获取发送者信息
        let author = event_data.get("author").cloned().unwrap_or_default();
        let sender_id = author
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let sender_name = author
            .get("username")
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown")
            .to_string();

        // 构造消息
        Some(
            IntegrationMessage::new(
                Platform::QQBot,
                conversation_id,
                sender_id,
                sender_name,
                Self::parse_content(event_data),
            )
            .with_raw(event_data.clone()),
        )
    }
}

#[async_trait]
impl PlatformIntegration for QQBotAdapter {
    fn platform(&self) -> Platform {
        Platform::QQBot
    }

    async fn connect(&mut self, message_tx: Sender<IntegrationMessage>) -> Result<()> {
        // 1. 确保 Token 有效
        self.ensure_valid_token().await?;

        // 2. 获取 Gateway URL
        let gateway_url = self.get_gateway_url().await?;
        tracing::info!(
            "[QQBot] Connecting to gateway: {}...",
            &gateway_url[..std::cmp::min(50, gateway_url.len())]
        );

        // 3. 创建关闭通道
        let (shutdown_tx, mut shutdown_rx) = tokio::sync::oneshot::channel();
        self.shutdown_tx = Some(shutdown_tx);

        // 4. 克隆必要的数据
        let access_token = self.access_token.clone().unwrap();
        let tx = message_tx.clone();

        // 5. 启动 WebSocket 任务
        let task = tokio::spawn(async move {
            match connect_async(&gateway_url).await {
                Ok((ws_stream, _)) => {
                    tracing::info!("[QQBot] WebSocket connected");

                    let (mut write, mut read) = ws_stream.split();

                    // 发送鉴权消息
                    let auth_payload = serde_json::json!({
                        "op": 2,
                        "d": {
                            "token": format!("QQBot {}", access_token),
                            "intents": INTENTS_DEFAULT,
                            "shard": [0, 1],
                            "properties": {
                                "$os": std::env::consts::OS,
                                "$browser": "polaris",
                                "$device": "desktop"
                            }
                        }
                    });

                    if let Err(e) = write
                        .send(WsMessage::Text(auth_payload.to_string()))
                        .await
                    {
                        tracing::error!("[QQBot] Failed to send auth: {}", e);
                        return;
                    }

                    tracing::debug!("[QQBot] Auth message sent");

                    // 心跳相关变量
                    let mut heartbeat_interval = 41250u64; // 默认心跳间隔
                    let mut last_heartbeat = std::time::Instant::now();
                    let mut seq: Option<u32> = None;
                    let mut dedup = MessageDedup::default();

                    loop {
                        tokio::select! {
                            // 检查关闭信号
                            _ = &mut shutdown_rx => {
                                tracing::info!("[QQBot] Shutdown signal received");
                                let _ = write.send(WsMessage::Close(None)).await;
                                break;
                            }

                            // 读取消息
                            msg = read.next() => {
                                match msg {
                                    Some(Ok(WsMessage::Text(text))) => {
                                        if let Ok(payload) = serde_json::from_str::<serde_json::Value>(&text) {
                                            let op = payload.get("op").and_then(|v| v.as_u64()).unwrap_or(0);

                                            match op {
                                                0 => { // DISPATCH - 事件消息
                                                    // 更新序列号
                                                    if let Some(s) = payload.get("s").and_then(|v| v.as_u64()) {
                                                        seq = Some(s as u32);
                                                    }

                                                    let event_type = payload
                                                        .get("t")
                                                        .and_then(|v| v.as_str())
                                                        .unwrap_or("");

                                                    let event_data = payload.get("d").cloned().unwrap_or_default();

                                                    // 处理 READY 事件
                                                    if event_type == "READY" {
                                                        tracing::info!("[QQBot] Ready! Session: {:?}",
                                                            event_data.get("session_id"));
                                                        continue;
                                                    }

                                                    // 处理消息事件
                                                    if event_type.ends_with("MESSAGE_CREATE") {
                                                        if let Some(msg) = Self::handle_message_event(
                                                            event_type,
                                                            &event_data,
                                                            &mut dedup,
                                                        ) {
                                                            if let Err(e) = tx.send(msg).await {
                                                                tracing::error!("[QQBot] Failed to send message: {}", e);
                                                            }
                                                        }
                                                    }
                                                }
                                                10 => { // HELLO
                                                    if let Some(interval) = payload
                                                        .get("d")
                                                        .and_then(|d| d.get("heartbeat_interval"))
                                                        .and_then(|v| v.as_u64())
                                                    {
                                                        heartbeat_interval = interval;
                                                        tracing::debug!("[QQBot] Heartbeat interval: {}ms", heartbeat_interval);
                                                    }
                                                }
                                                11 => { // HEARTBEAT_ACK
                                                    tracing::trace!("[QQBot] Heartbeat ACK");
                                                }
                                                7 => { // RECONNECT
                                                    tracing::warn!("[QQBot] Server requested reconnect");
                                                    break;
                                                }
                                                _ => {
                                                    tracing::trace!("[QQBot] Unhandled op: {}", op);
                                                }
                                            }
                                        }
                                    }
                                    Some(Ok(WsMessage::Ping(data))) => {
                                        let _ = write.send(WsMessage::Pong(data)).await;
                                    }
                                    Some(Ok(WsMessage::Close(frame))) => {
                                        tracing::warn!("[QQBot] Connection closed: {:?}", frame);
                                        break;
                                    }
                                    Some(Ok(WsMessage::Pong(_))) => {
                                        tracing::trace!("[QQBot] Pong received");
                                    }
                                    Some(Err(e)) => {
                                        tracing::error!("[QQBot] WebSocket error: {}", e);
                                        break;
                                    }
                                    None => {
                                        tracing::warn!("[QQBot] WebSocket stream ended");
                                        break;
                                    }
                                    _ => {}
                                }
                            }

                            // 发送心跳
                            _ = tokio::time::sleep(tokio::time::Duration::from_millis(heartbeat_interval)) => {
                                let now = std::time::Instant::now();
                                if now.duration_since(last_heartbeat).as_millis() as u64 >= heartbeat_interval - 1000 {
                                    let heartbeat = serde_json::json!({
                                        "op": 1,
                                        "d": seq
                                    });

                                    if let Err(e) = write.send(WsMessage::Text(heartbeat.to_string())).await {
                                        tracing::error!("[QQBot] Failed to send heartbeat: {}", e);
                                        break;
                                    }

                                    last_heartbeat = now;
                                    tracing::trace!("[QQBot] Heartbeat sent, seq: {:?}", seq);
                                }
                            }
                        }
                    }

                    tracing::info!("[QQBot] WebSocket loop ended");
                }
                Err(e) => {
                    tracing::error!("[QQBot] Failed to connect WebSocket: {}", e);
                }
            }
        });

        self.ws_task = Some(task);
        self.message_tx = Some(message_tx);
        self.status = IntegrationStatus::new(Platform::QQBot).connected();

        tracing::info!("[QQBot] Adapter connected");
        Ok(())
    }

    async fn disconnect(&mut self) -> Result<()> {
        // 发送关闭信号
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }

        // 等待任务结束
        if let Some(task) = self.ws_task.take() {
            task.abort();
        }

        self.status = self.status.clone().disconnected();
        self.message_tx = None;

        tracing::info!("[QQBot] Disconnected");
        Ok(())
    }

    async fn send(&self, target: SendTarget, content: MessageContent) -> Result<()> {
        let text = content.as_text().ok_or_else(|| {
            AppError::ValidationError("目前只支持发送文本消息".to_string())
        })?;

        let access_token = self.access_token.as_ref().ok_or_else(|| {
            AppError::AuthError("未认证".to_string())
        })?;

        let client = reqwest::Client::new();

        match target {
            SendTarget::User(openid) => {
                // C2C 私信
                let url = format!("{}/v2/users/{}/messages", self.api_base(), openid);

                let response = client
                    .post(&url)
                    .header("Authorization", format!("QQBot {}", access_token))
                    .header("Content-Type", "application/json")
                    .json(&serde_json::json!({ "content": text }))
                    .send()
                    .await
                    .map_err(|e| AppError::NetworkError(e.to_string()))?;

                if !response.status().is_success() {
                    let error = response.text().await.unwrap_or_default();
                    return Err(AppError::ApiError(format!("发送 C2C 消息失败: {}", error)));
                }

                tracing::debug!("[QQBot] C2C message sent to {}", openid);
            }
            SendTarget::Channel(channel_id) => {
                // 频道消息
                let url = format!("{}/channels/{}/messages", self.api_base(), channel_id);

                let response = client
                    .post(&url)
                    .header("Authorization", format!("QQBot {}", access_token))
                    .header("Content-Type", "application/json")
                    .json(&serde_json::json!({ "content": text }))
                    .send()
                    .await
                    .map_err(|e| AppError::NetworkError(e.to_string()))?;

                if !response.status().is_success() {
                    let error = response.text().await.unwrap_or_default();
                    return Err(AppError::ApiError(format!("发送频道消息失败: {}", error)));
                }

                tracing::debug!("[QQBot] Channel message sent to {}", channel_id);
            }
            SendTarget::Conversation(conv_id) => {
                // 自动判断类型
                if conv_id.starts_with("c2c_") {
                    let openid = conv_id.strip_prefix("c2c_").unwrap();
                    return self.send(SendTarget::User(openid.to_string()), content).await;
                } else {
                    return self.send(SendTarget::Channel(conv_id), content).await;
                }
            }
            SendTarget::Webhook(_) => {
                return Err(AppError::ValidationError("QQBot 不支持 Webhook 发送".to_string()));
            }
        }

        Ok(())
    }

    fn status(&self) -> IntegrationStatus {
        self.status.clone()
    }
}