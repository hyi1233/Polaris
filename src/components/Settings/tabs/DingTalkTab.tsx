/**
 * 钉钉集成配置 Tab
 */

import type { Config } from '../../../types';

interface DingTalkTabProps {
  config: Config;
  onConfigChange: (config: Config) => void;
  loading: boolean;
}

export function DingTalkTab({ config, onConfigChange, loading }: DingTalkTabProps) {
  const handleEnabledChange = (enabled: boolean) => {
    onConfigChange({
      ...config,
      dingtalk: { ...config.dingtalk, enabled }
    });
  };

  const handleAppKeyChange = (appKey: string) => {
    onConfigChange({
      ...config,
      dingtalk: { ...config.dingtalk, appKey }
    });
  };

  const handleAppSecretChange = (appSecret: string) => {
    onConfigChange({
      ...config,
      dingtalk: { ...config.dingtalk, appSecret }
    });
  };

  const handleTestConversationIdChange = (testConversationId: string) => {
    onConfigChange({
      ...config,
      dingtalk: { ...config.dingtalk, testConversationId }
    });
  };

  const handleWebhookPortChange = (webhookPort: number) => {
    onConfigChange({
      ...config,
      dingtalk: { ...config.dingtalk, webhookPort }
    });
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-surface rounded-lg border border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-medium text-text-primary">启用钉钉集成</div>
            <div className="text-xs text-text-secondary">接收和发送钉钉消息</div>
          </div>
          <button
            type="button"
            onClick={() => handleEnabledChange(!config.dingtalk?.enabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              config.dingtalk?.enabled ? 'bg-primary' : 'bg-border'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                config.dingtalk?.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {config.dingtalk?.enabled && (
          <>
            <div className="mb-4">
              <label className="block text-xs text-text-secondary mb-2">
                App Key
              </label>
              <input
                type="text"
                value={config.dingtalk?.appKey || ''}
                onChange={(e) => handleAppKeyChange(e.target.value)}
                placeholder="钉钉应用的 AppKey"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs text-text-secondary mb-2">
                App Secret
              </label>
              <input
                type="password"
                value={config.dingtalk?.appSecret || ''}
                onChange={(e) => handleAppSecretChange(e.target.value)}
                placeholder="钉钉应用的 AppSecret"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs text-text-secondary mb-2">
                测试群会话 ID
              </label>
              <input
                type="text"
                value={config.dingtalk?.testConversationId || ''}
                onChange={(e) => handleTestConversationIdChange(e.target.value)}
                placeholder="用于测试连接的会话 ID"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs text-text-secondary mb-2">
                Webhook 端口
              </label>
              <input
                type="number"
                value={config.dingtalk?.webhookPort || 3456}
                onChange={(e) => handleWebhookPortChange(parseInt(e.target.value) || 3456)}
                placeholder="3456"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs text-text-primary">
                    <span className="font-medium">配置说明：</span>
                  </p>
                  <ul className="text-xs text-text-tertiary mt-1 space-y-1 list-disc list-inside">
                    <li>在钉钉开放平台创建企业内部应用</li>
                    <li>获取 App Key 和 App Secret</li>
                    <li>配置机器人权限和消息接收地址</li>
                    <li>会话 ID 可以在群设置或单聊中查看</li>
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
