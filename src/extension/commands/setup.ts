import * as vscode from 'vscode';
import * as fs from 'fs';
import { ConfigManager } from '../../core/config/configManager.js';

export function registerSetupCommand(
  context: vscode.ExtensionContext,
  tasksDir: string,
  configManager: ConfigManager,
) {
  context.subscriptions.push(
    vscode.commands.registerCommand('taskplanner.setup', async () => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open.');
        return;
      }

      const isInitialized = fs.existsSync(tasksDir);
      const config = configManager.get();

      interface SetupItem extends vscode.QuickPickItem {
        action: string;
      }

      const items: SetupItem[] = [];

      if (!isInitialized) {
        items.push({
          label: '$(folder-opened) Initialize Project',
          description: 'Create .tasks/ folder with task board files',
          action: 'init',
        });
      }

      items.push({
        label: '$(hubot) Initialize AI Instructions',
        description: 'Create/update CLAUDE.md and .cursorrules',
        action: 'initAi',
      });

      items.push({
        label: config.aiPlanRequired
          ? '$(check) AI Planning: Enabled'
          : '$(circle-outline) AI Planning: Disabled',
        description: config.aiPlanRequired
          ? 'AI agents must write a plan before coding (click to disable)'
          : 'AI agents skip the planning step (click to enable)',
        action: 'togglePlan',
      });

      items.push({
        label: '$(gear) Open Settings',
        description: 'Configure TaskPlanner extension settings',
        action: 'settings',
      });

      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: 'TaskPlanner Setup',
      });

      if (!picked) return;

      switch (picked.action) {
        case 'init':
          await vscode.commands.executeCommand('taskplanner.init');
          break;
        case 'initAi':
          await vscode.commands.executeCommand('taskplanner.initAi');
          break;
        case 'togglePlan':
          configManager.update({ aiPlanRequired: !config.aiPlanRequired });
          configManager.save();
          vscode.window.showInformationMessage(
            `AI Planning ${!config.aiPlanRequired ? 'enabled' : 'disabled'}. Run "Initialize AI Instructions" to update AI files.`,
          );
          break;
        case 'settings':
          await vscode.commands.executeCommand(
            'workbench.action.openSettings',
            'taskplanner',
          );
          break;
      }
    }),
  );
}
