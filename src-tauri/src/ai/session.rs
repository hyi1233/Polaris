/**
 * 会话管理
 *
 * 管理引擎的活动会话，追踪进程 PID 以支持中断等操作。
 */

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use crate::error::{AppError, Result};

/// 会话信息
#[derive(Debug, Clone)]
pub struct SessionInfo {
    /// 会话 ID
    pub id: String,
    /// 进程 PID
    pub pid: u32,
    /// 引擎 ID
    pub engine_id: String,
    /// 创建时间
    pub created_at: i64,
}

/// 会话管理器
pub struct SessionManager {
    /// 会话映射: session_id -> SessionInfo
    sessions: Arc<Mutex<HashMap<String, SessionInfo>>>,
}

impl SessionManager {
    /// 创建新的会话管理器
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// 注册会话
    pub fn register(&self, session_id: String, pid: u32, engine_id: String) -> Result<()> {
        let info = SessionInfo {
            id: session_id.clone(),
            pid,
            engine_id,
            created_at: chrono::Utc::now().timestamp(),
        };

        let mut sessions = self.sessions.lock()
            .map_err(|e| AppError::Unknown(format!("锁获取失败: {}", e)))?;
        sessions.insert(session_id, info);

        Ok(())
    }

    /// 更新会话 ID（当引擎返回真实 session_id 时）
    pub fn update_session_id(&self, old_id: &str, new_id: &str) -> Result<()> {
        let mut sessions = self.sessions.lock()
            .map_err(|e| AppError::Unknown(format!("锁获取失败: {}", e)))?;

        if let Some(info) = sessions.remove(old_id) {
            let updated = SessionInfo {
                id: new_id.to_string(),
                ..info
            };
            sessions.insert(new_id.to_string(), updated);
        }

        Ok(())
    }

    /// 获取会话信息
    pub fn get(&self, session_id: &str) -> Option<SessionInfo> {
        let sessions = self.sessions.lock().ok()?;
        sessions.get(session_id).cloned()
    }

    /// 获取会话 PID
    pub fn get_pid(&self, session_id: &str) -> Option<u32> {
        let sessions = self.sessions.lock().ok()?;
        sessions.get(session_id).map(|info| info.pid)
    }

    /// 移除会话
    pub fn remove(&self, session_id: &str) -> Option<SessionInfo> {
        let mut sessions = self.sessions.lock().ok()?;
        sessions.remove(session_id)
    }

    /// 获取活动会话数量
    pub fn count(&self) -> usize {
        let sessions = self.sessions.lock().ok();
        sessions.map(|s| s.len()).unwrap_or(0)
    }

    /// 获取会话管理器的共享引用
    pub fn shared(&self) -> Arc<Mutex<HashMap<String, SessionInfo>>> {
        Arc::clone(&self.sessions)
    }

    /// 通过共享引用更新 session_id（用于后台线程）
    pub fn update_session_id_shared(
        sessions: &Arc<Mutex<HashMap<String, SessionInfo>>>,
        old_id: &str,
        new_id: &str,
        pid: u32,
        engine_id: &str,
    ) {
        if let Ok(mut s) = sessions.lock() {
            s.remove(old_id);
            let info = SessionInfo {
                id: new_id.to_string(),
                pid,
                engine_id: engine_id.to_string(),
                created_at: chrono::Utc::now().timestamp(),
            };
            s.insert(new_id.to_string(), info);
        }
    }

    /// 终止进程
    pub fn kill_process(&self, session_id: &str) -> Result<bool> {
        let pid = self.get_pid(session_id);

        if let Some(pid) = pid {
            #[cfg(windows)]
            {
                let output = std::process::Command::new("taskkill")
                    .args(["/PID", &pid.to_string(), "/F"])
                    .output();

                match output {
                    Ok(o) if o.status.success() => {
                        self.remove(session_id);
                        return Ok(true);
                    }
                    _ => return Ok(false),
                }
            }

            #[cfg(not(windows))]
            {
                use std::process::Command;
                let output = Command::new("kill")
                    .arg(pid.to_string())
                    .output();

                match output {
                    Ok(o) if o.status.success() => {
                        self.remove(session_id);
                        return Ok(true);
                    }
                    _ => return Ok(false),
                }
            }
        }

        Ok(false)
    }
}

impl Default for SessionManager {
    fn default() -> Self {
        Self::new()
    }
}
