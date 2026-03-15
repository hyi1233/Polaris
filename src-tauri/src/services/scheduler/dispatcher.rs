/**
 * 调度执行器
 *
 * 负责检查待执行任务并调用 AI 引擎执行
 */

use crate::error::Result;
use crate::models::scheduler::{ScheduledTask, TaskStatus, RunTaskResult};
use crate::ai::{EngineRegistry, EngineId, SessionOptions};
use crate::models::AIEvent;
use super::store::{TaskStoreService, LogStoreService};

use std::sync::Arc;
use tokio::sync::Mutex as AsyncMutex;
use std::collections::HashMap;
use tokio_util::sync::CancellationToken;
use std::sync::atomic::{AtomicBool, Ordering};

/// 调度执行器
#[derive(Clone)]
pub struct SchedulerDispatcher {
    task_store: Arc<AsyncMutex<TaskStoreService>>,
    log_store: Arc<AsyncMutex<LogStoreService>>,
    engine_registry: Arc<AsyncMutex<EngineRegistry>>,
    /// 正在执行的任务
    running_tasks: Arc<AsyncMutex<HashMap<String, tokio::task::JoinHandle<()>>>>,
    /// 调度循环取消令牌
    cancel_token: Arc<AsyncMutex<Option<CancellationToken>>>,
}

impl SchedulerDispatcher {
    /// 创建新的调度执行器
    pub fn new(
        task_store: Arc<AsyncMutex<TaskStoreService>>,
        log_store: Arc<AsyncMutex<LogStoreService>>,
        engine_registry: Arc<AsyncMutex<EngineRegistry>>,
    ) -> Self {
        Self {
            task_store,
            log_store,
            engine_registry,
            running_tasks: Arc::new(AsyncMutex::new(HashMap::new())),
            cancel_token: Arc::new(AsyncMutex::new(None)),
        }
    }

    /// 启动调度循环
    pub fn start(&self) {
        // 检查是否已经在运行
        if let Ok(token) = self.cancel_token.try_lock() {
            if token.is_some() {
                tracing::warn!("[Scheduler] 调度器已在运行中");
                return;
            }
        }

        let cancel_token = CancellationToken::new();
        let token_clone = cancel_token.clone();

        // 保存取消令牌
        if let Ok(mut token) = self.cancel_token.try_lock() {
            *token = Some(cancel_token);
        }

        let dispatcher = self.clone();
        tauri::async_runtime::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(10));

            loop {
                tokio::select! {
                    _ = token_clone.cancelled() => {
                        tracing::info!("[Scheduler] 调度器已停止");
                        break;
                    }
                    _ = interval.tick() => {
                        // 检查并执行待执行任务
                        if let Err(e) = dispatcher.check_and_execute().await {
                            tracing::error!("[Scheduler] 调度检查失败: {:?}", e);
                        }
                    }
                }
            }
        });

        tracing::info!("[Scheduler] 调度器已启动");
    }

    /// 停止调度循环
    pub fn stop(&self) {
        if let Ok(mut token) = self.cancel_token.try_lock() {
            if let Some(token) = token.take() {
                token.cancel();
                tracing::info!("[Scheduler] 调度器停止信号已发送");
            }
        }
    }

    /// 检查调度器是否在运行
    pub fn is_running(&self) -> bool {
        if let Ok(token) = self.cancel_token.try_lock() {
            token.is_some()
        } else {
            true // 如果无法获取锁，假设正在运行
        }
    }

    /// 检查并执行待执行任务
    async fn check_and_execute(&self) -> Result<()> {
        let pending_tasks: Vec<ScheduledTask> = {
            let store = self.task_store.lock().await;
            store.get_pending_tasks()
                .into_iter()
                .cloned()
                .collect()
        };

        for task in pending_tasks {
            // 检查是否已经在执行
            let is_running = {
                let running = self.running_tasks.lock().await;
                running.contains_key(&task.id)
            };

            if is_running {
                continue;
            }

            // 执行任务（忽略错误，已记录日志）
            if let Err(e) = self.execute_task(task).await {
                tracing::error!("[Scheduler] 执行任务失败: {:?}", e);
            }
        }

        Ok(())
    }

    /// 执行单个任务，返回日志 ID
    async fn execute_task(&self, task: ScheduledTask) -> Result<String> {
        let task_id = task.id.clone();
        let task_id_for_map = task.id.clone();
        let task_name = task.name.clone();
        let prompt = task.prompt.clone();
        let engine_id = task.engine_id.clone();
        let work_dir = task.work_dir.clone();

        let task_store = self.task_store.clone();
        let log_store = self.log_store.clone();
        let engine_registry = self.engine_registry.clone();
        let running_tasks = self.running_tasks.clone();

        // 创建日志记录（状态为 Running）
        let log_id = {
            let mut store = self.log_store.lock().await;
            let log = store.create(&task_id, &task_name, &prompt, &engine_id)?;
            tracing::info!("[Scheduler] 创建日志: {} for task: {}", log.id, task_name);
            log.id
        };

        // 标记任务开始执行
        {
            let mut store = self.task_store.lock().await;
            store.update_run_status(&task_id, TaskStatus::Running)?;
        }

        let log_id_clone = log_id.clone();
        let handle = tokio::spawn(async move {
            tracing::info!("[Scheduler] 开始执行任务: {} ({})", task_name, task_id);

            // 解析引擎 ID
            let engine_id_parsed = EngineId::from_str(&engine_id)
                .unwrap_or(EngineId::ClaudeCode);

            // 收集输出、思考过程、工具调用、session_id
            let output = Arc::new(AsyncMutex::new(String::new()));
            let thinking = Arc::new(AsyncMutex::new(String::new()));
            let session_id = Arc::new(AsyncMutex::new(None::<String>));
            let session_id_for_update = session_id.clone();
            let tool_call_count = Arc::new(AsyncMutex::new(0u32));

            // 用于标记是否已更新完成状态
            let completed = Arc::new(AtomicBool::new(false));
            let completed_clone = completed.clone();

            let output_clone = output.clone();
            let thinking_clone = thinking.clone();
            let session_id_clone = session_id.clone();
            let tool_call_count_clone = tool_call_count.clone();

            // 完成回调的闭包所需变量
            let log_id_for_complete = log_id_clone.clone();
            let task_id_for_complete = task_id.clone();
            let task_name_for_complete = task_name.clone();
            let task_store_for_complete = task_store.clone();
            let log_store_for_complete = log_store.clone();
            let output_for_complete = output.clone();
            let thinking_for_complete = thinking.clone();
            let session_id_for_complete = session_id.clone();
            let tool_call_count_for_complete = tool_call_count.clone();
            let running_tasks_for_complete = running_tasks.clone();

            // 创建会话选项
            let options = SessionOptions::new(move |event: AIEvent| {
                match &event {
                    AIEvent::AssistantMessage(msg) => {
                        if let Ok(mut o) = output_clone.try_lock() {
                            o.push_str(&msg.content);
                        }
                    }
                    AIEvent::Thinking(t) => {
                        if let Ok(mut th) = thinking_clone.try_lock() {
                            th.push_str(&t.content);
                            th.push('\n');
                        }
                    }
                    AIEvent::ToolCallStart(_) => {
                        if let Ok(mut count) = tool_call_count_clone.try_lock() {
                            *count += 1;
                        }
                    }
                    AIEvent::SessionStart(s) => {
                        if let Ok(mut sid) = session_id_clone.try_lock() {
                            *sid = Some(s.session_id.clone());
                        }
                    }
                    _ => {}
                }
            })
            .with_work_dir(work_dir.unwrap_or_else(|| ".".to_string()))
            .with_on_session_id_update(move |sid: String| {
                if let Ok(mut s) = session_id_for_update.try_lock() {
                    *s = Some(sid);
                }
            })
            .with_on_complete(move |exit_code: i32| {
                // 防止重复调用
                if completed_clone.swap(true, Ordering::SeqCst) {
                    return;
                }

                tracing::info!("[Scheduler] 会话完成，exit_code: {}", exit_code);

                // 在新的 tokio 任务中处理完成逻辑（因为回调在非异步上下文中）
                let log_id = log_id_for_complete.clone();
                let task_id = task_id_for_complete.clone();
                let task_name = task_name_for_complete.clone();
                let task_store = task_store_for_complete.clone();
                let log_store = log_store_for_complete.clone();
                let output = output_for_complete.clone();
                let thinking = thinking_for_complete.clone();
                let session_id = session_id_for_complete.clone();
                let tool_call_count = tool_call_count_for_complete.clone();
                let running_tasks = running_tasks_for_complete.clone();

                tauri::async_runtime::spawn(async move {
                    let final_output = output.lock().await.clone();
                    let final_thinking = thinking.lock().await.clone();
                    let final_session_id = session_id.lock().await.clone();
                    let final_tool_count = *tool_call_count.lock().await;

                    // 判断是否成功
                    let is_success = exit_code == 0;

                    {
                        let mut log_store = log_store.lock().await;
                        let mut task_store = task_store.lock().await;

                        if is_success {
                            if let Err(e) = log_store.update_complete(
                                &log_id,
                                final_session_id,
                                Some(final_output),
                                None,
                                if final_thinking.is_empty() { None } else { Some(final_thinking) },
                                final_tool_count,
                                None,
                            ) {
                                tracing::error!("[Scheduler] 更新日志失败: {:?}", e);
                            }

                            if let Err(e) = task_store.update_run_status(&task_id, TaskStatus::Success) {
                                tracing::error!("[Scheduler] 更新任务状态失败: {:?}", e);
                            }

                            tracing::info!("[Scheduler] 任务执行成功: {}", task_name);
                        } else {
                            let error_msg = format!("进程退出码: {}", exit_code);
                            if let Err(e) = log_store.update_complete(
                                &log_id,
                                final_session_id,
                                Some(final_output),
                                Some(error_msg.clone()),
                                if final_thinking.is_empty() { None } else { Some(final_thinking) },
                                final_tool_count,
                                None,
                            ) {
                                tracing::error!("[Scheduler] 更新日志失败: {:?}", e);
                            }

                            if let Err(e) = task_store.update_run_status(&task_id, TaskStatus::Failed) {
                                tracing::error!("[Scheduler] 更新任务状态失败: {:?}", e);
                            }

                            tracing::error!("[Scheduler] 任务执行失败: {} - {}", task_name, error_msg);
                        }
                    }

                    // 从运行列表中移除
                    {
                        let mut running = running_tasks.lock().await;
                        running.remove(&task_id);
                    }
                });
            });

            // 执行
            let result = {
                let mut registry = engine_registry.lock().await;
                registry.start_session(Some(engine_id_parsed), &prompt, options)
            };

            match result {
                Ok(session_id) => {
                    tracing::info!("[Scheduler] 会话已启动: {} (session: {})", task_name, session_id);
                }
                Err(e) => {
                    tracing::error!("[Scheduler] 启动会话失败: {} - {:?}", task_name, e);

                    // 启动失败，更新状态
                    let mut log_store = log_store.lock().await;
                    let mut task_store = task_store.lock().await;

                    if let Err(update_err) = log_store.update_complete(
                        &log_id_clone,
                        None,
                        None,
                        Some(e.to_string()),
                        None,
                        0,
                        None,
                    ) {
                        tracing::error!("[Scheduler] 更新日志失败: {:?}", update_err);
                    }

                    if let Err(update_err) = task_store.update_run_status(&task_id, TaskStatus::Failed) {
                        tracing::error!("[Scheduler] 更新任务状态失败: {:?}", update_err);
                    }

                    // 从运行列表中移除
                    {
                        let mut running = running_tasks.lock().await;
                        running.remove(&task_id);
                    }
                }
            }
        });

        // 添加到运行列表
        {
            let mut running = self.running_tasks.lock().await;
            running.insert(task_id_for_map, handle);
        }

        Ok(log_id)
    }

    /// 手动执行任务（返回日志 ID）
    pub async fn run_now(&self, task_id: &str) -> Result<RunTaskResult> {
        let task = {
            let store = self.task_store.lock().await;
            store.get(task_id)
                .cloned()
                .ok_or_else(|| crate::error::AppError::ValidationError(format!("任务不存在: {}", task_id)))?
        };

        // execute_task 内部会创建日志并返回 log_id
        let log_id = self.execute_task(task).await?;

        Ok(RunTaskResult {
            log_id,
            message: "任务已启动".to_string(),
        })
    }
}
