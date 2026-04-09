import * as vscode from 'vscode';
import { ConfigManager } from '../../core/config/configManager.js';
import { FileStore } from '../../core/store/fileStore.js';
import { TaskStore } from '../../core/store/taskStore.js';

export function registerInitCommand(
  context: vscode.ExtensionContext,
  configManager: ConfigManager,
  fileStore: FileStore,
  taskStore: TaskStore,
) {
  context.subscriptions.push(
    vscode.commands.registerCommand('taskplanner.init', async () => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open.');
        return;
      }

      try {
        // Initialize config
        configManager.load();
        configManager.save();

        // Create state files
        fileStore.initializeStateFiles(configManager.get());

        // Reload task store
        await taskStore.reloadAsync();

        const autoInitAi = vscode.workspace
          .getConfiguration('taskplanner')
          .get<boolean>('autoInitAiFiles', true);

        if (autoInitAi) {
          await vscode.commands.executeCommand('taskplanner.initAi');
        }

        vscode.commands.executeCommand('setContext', 'taskplanner:initialized', true);
        vscode.window.showInformationMessage('TaskPlanner initialized! Check .tasks/ directory.');
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to initialize TaskPlanner: ${err}`);
      }
    }),
  );
}
