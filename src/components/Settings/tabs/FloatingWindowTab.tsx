/**
 * 悬浮窗配置 Tab
 */

import { useTranslation } from 'react-i18next';
import type { Config, FloatingWindowMode } from '../../../types';

interface FloatingWindowTabProps {
  config: Config;
  onConfigChange: (config: Config) => void;
  loading: boolean;
}

const FLOATING_MODE_OPTIONS: { id: FloatingWindowMode; nameKey: string; descKey: string }[] = [
  { id: 'auto', nameKey: 'floatingWindow.modes.auto', descKey: 'floatingWindow.modes.autoDesc' },
  { id: 'manual', nameKey: 'floatingWindow.modes.manual', descKey: 'floatingWindow.modes.manualDesc' },
];

export function FloatingWindowTab({ config, onConfigChange, loading }: FloatingWindowTabProps) {
  const { t } = useTranslation('settings');

  const handleEnabledChange = (enabled: boolean) => {
    onConfigChange({
      ...config,
      floatingWindow: { ...config.floatingWindow, enabled }
    });
  };

  const handleModeChange = (mode: FloatingWindowMode) => {
    onConfigChange({
      ...config,
      floatingWindow: { ...config.floatingWindow, mode }
    });
  };

  const handleExpandOnHoverChange = (expandOnHover: boolean) => {
    onConfigChange({
      ...config,
      floatingWindow: { ...config.floatingWindow, expandOnHover }
    });
  };

  const handleCollapseDelayChange = (collapseDelay: number) => {
    onConfigChange({
      ...config,
      floatingWindow: { ...config.floatingWindow, collapseDelay }
    });
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-surface rounded-lg border border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-medium text-text-primary">启用悬浮窗</div>
            <div className="text-xs text-text-secondary">在窗口失焦时显示迷你悬浮窗</div>
          </div>
          <button
            type="button"
            onClick={() => handleEnabledChange(!config.floatingWindow?.enabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              config.floatingWindow?.enabled ? 'bg-primary' : 'bg-border'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                config.floatingWindow?.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {config.floatingWindow?.enabled && (
          <>
            {/* 模式选择 */}
            <div className="mb-4">
              <label className="block text-xs text-text-secondary mb-2">
                触发模式
              </label>
              <div className="space-y-2">
                {FLOATING_MODE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleModeChange(option.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      config.floatingWindow?.mode === option.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-background hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-text-primary">{t(option.nameKey)}</div>
                        <div className="text-xs text-text-secondary">{t(option.descKey)}</div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        config.floatingWindow?.mode === option.id
                          ? 'border-primary bg-primary'
                          : 'border-border'
                      }`}>
                        {config.floatingWindow?.mode === option.id && (
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 展开设置 */}
            <div className="mb-4">
              <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.floatingWindow?.expandOnHover ?? false}
                  onChange={(e) => handleExpandOnHoverChange(e.target.checked)}
                  className="w-4 h-4"
                />
                鼠标悬停时展开
              </label>
            </div>

            {/* 收起延迟 */}
            <div className="mb-4">
              <label className="block text-xs text-text-secondary mb-2">
                收起延迟 (毫秒)
              </label>
              <input
                type="number"
                min="100"
                max="5000"
                step="100"
                value={config.floatingWindow?.collapseDelay || 500}
                onChange={(e) => handleCollapseDelayChange(parseInt(e.target.value) || 500)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-text-tertiary">
                窗口失焦后延迟多久切换到悬浮窗
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
