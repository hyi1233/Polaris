/**
 * 高级配置 Tab
 */

import type { Config } from '../../../types';

interface AdvancedTabProps {
  config: Config;
  onConfigChange: (config: Config) => void;
  loading: boolean;
}

export function AdvancedTab({ config, onConfigChange, loading }: AdvancedTabProps) {
  const handleGitBinPathChange = (gitBinPath: string) => {
    onConfigChange({
      ...config,
      gitBinPath: gitBinPath || undefined
    });
  };

  const handleSessionDirChange = (sessionDir: string) => {
    onConfigChange({
      ...config,
      sessionDir: sessionDir || undefined
    });
  };

  return (
    <div className="space-y-6">
      {/* Git 配置 */}
      <div className="p-4 bg-surface rounded-lg border border-border">
        <h3 className="text-sm font-medium text-text-primary mb-3">Git 配置</h3>

        <div className="mb-4">
          <label className="block text-xs text-text-secondary mb-2">
            Git 可执行文件路径
          </label>
          <input
            type="text"
            value={config.gitBinPath || ''}
            onChange={(e) => handleGitBinPathChange(e.target.value)}
            placeholder="留空使用系统默认 git"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={loading}
          />
          <p className="mt-1 text-xs text-text-tertiary">
            指定 Git 可执行文件的完整路径，留空则使用系统 PATH 中的 git
          </p>
        </div>
      </div>

      {/* 会话配置 */}
      <div className="p-4 bg-surface rounded-lg border border-border">
        <h3 className="text-sm font-medium text-text-primary mb-3">会话配置</h3>

        <div className="mb-4">
          <label className="block text-xs text-text-secondary mb-2">
            会话存储目录
          </label>
          <input
            type="text"
            value={config.sessionDir || ''}
            onChange={(e) => handleSessionDirChange(e.target.value)}
            placeholder="留空使用默认目录"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={loading}
          />
          <p className="mt-1 text-xs text-text-tertiary">
            AI 会话历史的存储位置，留空则使用系统默认目录
          </p>
        </div>
      </div>

      {/* 调试信息 */}
      <div className="p-4 bg-surface rounded-lg border border-border">
        <h3 className="text-sm font-medium text-text-primary mb-3">调试信息</h3>

        <div className="text-xs text-text-tertiary space-y-1">
          <p><span className="text-text-secondary">配置文件：</span>~/.config/claude-code-pro/config.json</p>
          <p><span className="text-text-secondary">日志目录：</span>~/.local/share/claude-code-pro/logs</p>
          <p><span className="text-text-secondary">当前引擎：</span>{config.defaultEngine}</p>
        </div>
      </div>
    </div>
  );
}
