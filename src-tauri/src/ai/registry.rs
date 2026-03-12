/**
 * 引擎注册表
 *
 * 管理所有注册的 AI 引擎，提供统一的访问接口。
 */

use std::collections::HashMap;
use crate::error::{AppError, Result};
use super::traits::{AIEngine, EngineId, SessionOptions};
use super::types::EngineStatus;

/// 引擎注册表
pub struct EngineRegistry {
    /// 注册的引擎
    engines: HashMap<EngineId, Box<dyn AIEngine>>,
    /// 默认引擎
    default_engine: EngineId,
}

impl EngineRegistry {
    /// 创建新的引擎注册表
    pub fn new() -> Self {
        Self {
            engines: HashMap::new(),
            default_engine: EngineId::ClaudeCode,
        }
    }

    /// 注册引擎
    pub fn register<E: AIEngine + 'static>(&mut self, engine: E) {
        let id = engine.id();
        self.engines.insert(id, Box::new(engine));
    }

    /// 注册引擎（Box 版本）
    pub fn register_boxed(&mut self, engine: Box<dyn AIEngine>) {
        let id = engine.id();
        self.engines.insert(id, engine);
    }

    /// 设置默认引擎
    pub fn set_default(&mut self, id: EngineId) -> Result<()> {
        if self.engines.contains_key(&id) {
            self.default_engine = id;
            Ok(())
        } else {
            Err(AppError::ValidationError(format!("引擎 {} 未注册", id)))
        }
    }

    /// 获取默认引擎 ID
    pub fn default_engine_id(&self) -> EngineId {
        self.default_engine
    }

    /// 获取引擎
    pub fn get(&self, id: EngineId) -> Option<&(dyn AIEngine + '_)> {
        self.engines.get(&id).map(|e| e.as_ref())
    }

    /// 获取可变引擎
    pub fn get_mut(&mut self, id: EngineId) -> Option<&mut (dyn AIEngine + '_)> {
        let engine = self.engines.get_mut(&id)?;
        Some(engine.as_mut())
    }

    /// 检查引擎是否存在
    pub fn contains(&self, id: EngineId) -> bool {
        self.engines.contains_key(&id)
    }

    /// 检查引擎是否可用
    pub fn is_available(&self, id: EngineId) -> bool {
        self.engines.get(&id).map(|e| e.is_available()).unwrap_or(false)
    }

    /// 列出所有可用引擎
    pub fn list_available(&self) -> Vec<EngineId> {
        self.engines
            .iter()
            .filter(|(_, e)| e.is_available())
            .map(|(id, _)| *id)
            .collect()
    }

    /// 获取所有引擎状态
    pub fn get_all_status(&self) -> Vec<EngineStatus> {
        self.engines
            .values()
            .map(|e| EngineStatus::from_engine(e.as_ref()))
            .collect()
    }

    /// 启动会话
    pub fn start_session(
        &mut self,
        engine_id: Option<EngineId>,
        message: &str,
        options: SessionOptions,
    ) -> Result<String> {
        let id = engine_id.unwrap_or(self.default_engine);

        let engine = self.engines.get_mut(&id)
            .ok_or_else(|| AppError::ValidationError(format!("引擎 {} 未注册", id)))?;

        if !engine.is_available() {
            let reason = engine.unavailable_reason()
                .unwrap_or_else(|| "引擎不可用".to_string());
            return Err(AppError::ValidationError(reason));
        }

        engine.start_session(message, options)
    }

    /// 继续会话
    pub fn continue_session(
        &mut self,
        engine_id: EngineId,
        session_id: &str,
        message: &str,
        options: SessionOptions,
    ) -> Result<()> {
        let engine = self.engines.get_mut(&engine_id)
            .ok_or_else(|| AppError::ValidationError(format!("引擎 {} 未注册", engine_id)))?;

        engine.continue_session(session_id, message, options)
    }

    /// 中断会话
    pub fn interrupt(&mut self, engine_id: EngineId, session_id: &str) -> Result<()> {
        let engine = self.engines.get_mut(&engine_id)
            .ok_or_else(|| AppError::ValidationError(format!("引擎 {} 未注册", engine_id)))?;

        engine.interrupt(session_id)
    }
}

impl Default for EngineRegistry {
    fn default() -> Self {
        Self::new()
    }
}
