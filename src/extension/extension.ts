import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigManager } from '../core/config/configManager.js';
import { FileStore } from '../core/store/fileStore.js';
import { TaskStore } from '../core/store/taskStore.js';
import { registerInitCommand } from './commands/initProject.js';
import { registerInitAiCommand } from './commands/initAi.js';
import { registerSetupCommand } from './commands/setup.js';
import { registerCreateTaskCommand } from './commands/createTask.js';
import { registerMoveTaskCommand } from './commands/moveTask.js';
import { registerDeleteTaskCommand } from './commands/deleteTask.js';
import { registerOpenTaskCommand } from './commands/openTask.js';
import { createFileWatcher } from './watchers/fileWatcher.js';
import { TaskListViewProvider } from './views/webview/taskListPanel.js';
import { KanbanPanel } from './views/webview/kanbanPanel.js';

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
  const isInitialized = fs.existsSync(tasksDir);
  vscode.commands.executeCommand('setContext', 'taskplanner:initialized', isInitialized);

  if (isInitialized) {
    configManager.load();
    taskStore.reload();
  }

  // Sidebar webview view
  const taskListProvider = new TaskListViewProvider(
    taskStore, configManager, () => fs.existsSync(tasksDir),
  );
  const viewProviderDisposable = vscode.window.registerWebviewViewProvider(
    TaskListViewProvider.viewType,
    taskListProvider,
  );

  // Commands
  registerInitCommand(context, configManager, fileStore, taskStore);
  registerInitAiCommand(context, configManager);
  registerSetupCommand(context, tasksDir, configManager);
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

  // Webview panel commands
  context.subscriptions.push(
    vscode.commands.registerCommand('taskplanner.openTaskList', () => {
      vscode.commands.executeCommand('taskplanner.taskView.focus');
    }),
    vscode.commands.registerCommand('taskplanner.openKanban', () => {
      KanbanPanel.createOrShow(taskStore, configManager);
    }),
  );

  // File watcher
  const watcher = createFileWatcher(workspaceFolder.uri.fsPath, taskDirName, configManager, taskStore);

  context.subscriptions.push(viewProviderDisposable, watcher);
}

export function deactivate() {
  // Cleanup handled by disposables
}
