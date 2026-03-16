import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigManager } from '../core/config/configManager.js';
import { FileStore } from '../core/store/fileStore.js';
import { TaskStore } from '../core/store/taskStore.js';
import { TaskTreeProvider } from './views/taskTreeProvider.js';
import { registerInitCommand } from './commands/initProject.js';
import { registerCreateTaskCommand } from './commands/createTask.js';
import { registerMoveTaskCommand } from './commands/moveTask.js';
import { registerDeleteTaskCommand } from './commands/deleteTask.js';
import { registerOpenTaskCommand } from './commands/openTask.js';
import { createFileWatcher } from './watchers/fileWatcher.js';

export function activate(context: vscode.ExtensionContext) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return;
  }

  const config = vscode.workspace.getConfiguration('taskplanner');
  const taskDirName = config.get<string>('taskDirectory', '.tasks');
  const tasksDir = path.join(workspaceFolder.uri.fsPath, taskDirName);

  const configManager = new ConfigManager(tasksDir);
  const fileStore = new FileStore(tasksDir);
  const taskStore = new TaskStore(configManager, fileStore);

  // Load config and tasks if .tasks/ exists
  const fs = require('fs');
  if (fs.existsSync(tasksDir)) {
    configManager.load();
    taskStore.reload();
  }

  // Tree view
  const treeProvider = new TaskTreeProvider(taskStore, configManager);
  const treeView = vscode.window.createTreeView('taskplanner.taskView', {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });

  // Listen for task store changes to refresh tree
  const storeDisposable = taskStore.onDidChange(() => {
    treeProvider.refresh();
  });

  // Commands
  registerInitCommand(context, configManager, fileStore, taskStore);
  registerCreateTaskCommand(context, taskStore, configManager);
  registerMoveTaskCommand(context, taskStore, configManager);
  registerDeleteTaskCommand(context, taskStore);
  registerOpenTaskCommand(context, taskStore, fileStore, configManager);

  // Refresh command
  context.subscriptions.push(
    vscode.commands.registerCommand('taskplanner.refresh', () => {
      configManager.load();
      taskStore.reload();
    }),
  );

  // File watcher
  const watcher = createFileWatcher(workspaceFolder.uri.fsPath, taskDirName, configManager, taskStore);

  context.subscriptions.push(treeView, storeDisposable, watcher);
}

export function deactivate() {
  // Cleanup handled by disposables
}
