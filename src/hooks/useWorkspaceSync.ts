/**
 * 工作区路径同步 Hook
 *
 * 负责将当前工作区路径同步到后端配置
 */

import { useEffect } from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import * as tauri from '../services/tauri';

export function useWorkspaceSync(isAppInitialized: boolean) {
  const currentWorkspacePath = useWorkspaceStore(state => state.getCurrentWorkspace()?.path);

  useEffect(() => {
    if (!currentWorkspacePath || !isAppInitialized) return;

    const syncWorkspace = async () => {
      try {
        await tauri.setWorkDir(currentWorkspacePath);
        console.log('[App] 工作区路径已同步:', currentWorkspacePath);
      } catch (error) {
        console.error('[App] 同步工作区路径失败:', error);
      }
    };

    syncWorkspace();
  }, [currentWorkspacePath, isAppInitialized]);
}
