/**
 * IFlow Engine 导出
 *
 * IFlow CLI 的 AIEngine 实现。
 * 后端已统一处理事件转换，前端直接使用 AIEvent。
 */

export { IFlowEngine, createIFlowEngine, defaultIFlowEngine } from './engine'
export type { IFlowEngineConfig, IFlowConfig } from './engine'

// 从基类重新导出 Session 类型（向后兼容）
export { BaseCLISession as IFlowSession } from '../../ai-runtime/base'