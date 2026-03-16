import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigManager } from '../../core/config/configManager.js';
import { TaskStore } from '../../core/store/taskStore.js';

export function createFileWatcher(
  workspacePath: string,
  taskDirName: string,
  configManager: ConfigManager,
  taskStore: TaskStore,
): vscode.Disposable {
  const pattern = new vscode.RelativePattern(workspacePath, `${taskDirName}/*.md`);
  const watcher = vscode.workspace.createFileSystemWatcher(pattern);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleReload() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      try {
        const config = configManager.get();
        // Find which state file changed and reload just that state
        // For simplicity, reload all states
        taskStore.reload();
      } catch {
        // Ignore parse errors from in-progress edits
      }
    }, 300);
  }

  const changeDisposable = watcher.onDidChange(scheduleReload);
  const createDisposable = watcher.onDidCreate(scheduleReload);
  const deleteDisposable = watcher.onDidDelete(scheduleReload);

  return {
    dispose() {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      changeDisposable.dispose();
      createDisposable.dispose();
      deleteDisposable.dispose();
      watcher.dispose();
    },
  };
}
