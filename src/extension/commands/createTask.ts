import * as vscode from 'vscode';
import { TaskStore } from '../../core/store/taskStore.js';
import { ConfigManager } from '../../core/config/configManager.js';
import { Priority, isPriority } from '../../core/model/task.js';

export function registerCreateTaskCommand(
  context: vscode.ExtensionContext,
  taskStore: TaskStore,
  configManager: ConfigManager,
) {
  context.subscriptions.push(
    vscode.commands.registerCommand('taskplanner.createTask', async () => {
      const config = configManager.get();

      // Title
      const title = await vscode.window.showInputBox({
        prompt: 'Task title',
        placeHolder: 'e.g., Implement user authentication',
        validateInput: (value) => (value.trim() ? null : 'Title is required'),
      });
      if (!title) {
        return;
      }

      // Priority
      const priorityPick = await vscode.window.showQuickPick(
        config.priorities.map((p) => ({
          label: p,
          description: getPriorityDescription(p),
        })),
        { placeHolder: 'Select priority' },
      );
      if (!priorityPick) {
        return;
      }
      const priority = isPriority(priorityPick.label) ? priorityPick.label : Priority.P4;

      // Tags (optional)
      const tagsInput = await vscode.window.showInputBox({
        prompt: 'Tags (comma-separated, optional)',
        placeHolder: 'e.g., auth, backend',
      });
      const tags = tagsInput
        ? tagsInput
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      // State
      const statePick = await vscode.window.showQuickPick(
        config.states.map((s) => ({ label: s.name })),
        { placeHolder: 'Select initial state (default: Backlog)' },
      );
      const stateName = statePick?.label ?? 'Backlog';

      // Description (optional)
      const description = await vscode.window.showInputBox({
        prompt: 'Description (optional)',
        placeHolder: 'Brief description of the task',
      });

      try {
        const task = taskStore.createTask(
          {
            title: title.trim(),
            priority,
            tags,
            description: description?.trim() ?? '',
          },
          stateName,
        );

        vscode.window.showInformationMessage(`Created ${task.id}: ${task.title}`);
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to create task: ${err}`);
      }
    }),
  );
}

function getPriorityDescription(priority: string): string {
  switch (priority) {
    case 'P1':
      return 'Critical';
    case 'P2':
      return 'High';
    case 'P3':
      return 'Medium';
    case 'P4':
      return 'Low';
    default:
      return '';
  }
}
