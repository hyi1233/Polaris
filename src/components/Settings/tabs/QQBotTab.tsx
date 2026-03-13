/**
 * QQ Bot 集成配置 Tab
 */

import { useIntegrationStore, useIntegrationStatus } from '../../../stores';
import type { Config, IntegrationDisplayMode } from '../../../types';

interface QQBotTabProps {
  config: Config;
  onConfigChange: (config: Config) => void;
  loading: boolean;
}

export function QQBotTab({ config, onConfigChange, loading }: QQBotTabProps) {
  const qqbotStatus = useIntegrationStatus('qqbot');
  const { startPlatform, stopPlatform, loading: integrationLoading } = useIntegrationStore();
  const isConnected = qqbotStatus?.connected ?? false;

  const handleEnabledChange = (enabled: boolean) => {
    onConfigChange({
      ...config,
      qqbot: { ...config.qqbot, enabled }
    });
  };

  const handleAppIdChange = (appId: string) => {
    onConfigChange({
      ...config,
      qqbot: { ...config.qqbot, appId }
    });
  };

  const handleClientSecretChange = (clientSecret: string) => {
    onConfigChange({
      ...config,
      qqbot: { ...config.qqbot, clientSecret }
    });
  };

  const handleSandboxChange = (sandbox: boolean) => {
    onConfigChange({
      ...config,
      qqbot: { ...config.qqbot, sandbox }
    });
  };

  const handleDisplayModeChange = (displayMode: IntegrationDisplayMode) => {
    onConfigChange({
      ...config,
      qqbot: { ...config.qqbot, displayMode }
    });
  };

  const handleAutoConnectChange = (autoConnect: boolean) => {
    onConfigChange({
      ...config,
      qqbot: { ...config.qqbot, autoConnect }
    });
  };

  const handleConnect = async () => {
    if (!config.qqbot) return;
    try {
      await startPlatform('qqbot', config.qqbot);
    } catch (error) {
      console.error('Failed to connect QQ Bot:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await stopPlatform('qqbot');
    } catch (error) {
      console.error('Failed to disconnect QQ Bot:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-surface rounded-lg border border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-medium text-text-primary">启用 QQ Bot 集成</div>
            <div className="text-xs text-text-secondary">通过 QQ 机器人接收和发送消息</div>
          </div>
          <button
            type="button"
            onClick={() => handleEnabledChange(!config.qqbot?.enabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              config.qqbot?.enabled ? 'bg-primary' : 'bg-border'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                config.qqbot?.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {config.qqbot?.enabled && (
          <>
            <div className="mb-4">
              <label className="block text-xs text-text-secondary mb-2">
                App ID
              </label>
              <input
                type="text"
                value={config.qqbot?.appId || ''}
                onChange={(e) => handleAppIdChange(e.target.value)}
                placeholder="QQ 开放平台应用的 App ID"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs text-text-secondary mb-2">
                Client Secret
              </label>
              <input
                type="password"
                value={config.qqbot?.clientSecret || ''}
                onChange={(e) => handleClientSecretChange(e.target.value)}
                placeholder="QQ 开放平台应用的 Client Secret"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.qqbot?.sandbox ?? true}
                    onChange={(e) => handleSandboxChange(e.target.checked)}
                    className="w-4 h-4"
                  />
                  沙箱环境
                </label>
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.qqbot?.autoConnect ?? false}
                    onChange={(e) => handleAutoConnectChange(e.target.checked)}
                    className="w-4 h-4"
                  />
                  自动连接
                </label>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-text-secondary mb-2">
                显示模式
              </label>
              <select
                value={config.qqbot?.displayMode || 'compact'}
                onChange={(e) => handleDisplayModeChange(e.target.value as IntegrationDisplayMode)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={loading}
              >
                <option value="compact">紧凑模式</option>
                <option value="full">完整模式</option>
              </select>
            </div>

            {/* 连接状态和控制 */}
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-text-tertiary'}`} />
              <span className="text-sm text-text-secondary">
                {isConnected ? '已连接' : '未连接'}
              </span>
              <div className="flex-1" />
              {isConnected ? (
                <button
                  onClick={handleDisconnect}
                  disabled={integrationLoading}
                  className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-danger/10 hover:border-danger text-text-secondary hover:text-danger transition-colors"
                >
                  断开
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={integrationLoading || !config.qqbot?.appId || !config.qqbot?.clientSecret}
                  className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  连接
                </button>
              )}
            </div>

            <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs text-text-primary">
                    <span className="font-medium">配置说明：</span>
                  </p>
                  <ul className="text-xs text-text-tertiary mt-1 space-y-1 list-disc list-inside">
                    <li>访问 QQ 开放平台创建机器人应用</li>
                    <li>获取 App ID 和 Client Secret</li>
                    <li>配置机器人权限和事件订阅</li>
                    <li>沙箱环境用于测试，生产环境需审核</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
