import * as vscode from 'vscode';
import { TaskStore } from '../../core/store/taskStore.js';

export function registerDeleteTaskCommand(
  context: vscode.ExtensionContext,
  taskStore: TaskStore,
) {
  context.subscriptions.push(
    vscode.commands.registerCommand('taskplanner.deleteTask', async (item?: string) => {
      let taskId: string;

      if (typeof item === 'string') {
        taskId = item;
      } else {
        // Prompt user to pick a task
        const allTasks = taskStore.getAllTasks();
        const picks: vscode.QuickPickItem[] = [];
        for (const [stateName, tasks] of allTasks) {
          for (const task of tasks) {
            picks.push({
              label: `${task.id}: ${task.title}`,
              description: `[${task.priority}] in ${stateName}`,
            });
          }
        }
        if (picks.length === 0) {
          vscode.window.showInformationMessage('No tasks to delete.');
          return;
        }
        const picked = await vscode.window.showQuickPick(picks, {
          placeHolder: 'Select task to delete',
        });
        if (!picked) {
          return;
        }
        taskId = picked.label.split(':')[0].trim();
      }

      const found = taskStore.findTask(taskId);
      if (!found) {
        vscode.window.showErrorMessage(`Task ${taskId} not found.`);
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        `Delete ${taskId}: ${found.task.title}?`,
        { modal: true },
        'Delete',
      );

      if (confirm === 'Delete') {
        if (taskStore.deleteTask(taskId)) {
          vscode.window.showInformationMessage(`Deleted ${taskId}.`);
        } else {
          vscode.window.showErrorMessage(`Failed to delete ${taskId}.`);
        }
      }
    }),
  );
}
