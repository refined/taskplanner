import * as vscode from 'vscode';
import { TaskStore } from '../../core/store/taskStore.js';
import { FileStore } from '../../core/store/fileStore.js';
import { ConfigManager } from '../../core/config/configManager.js';
import { findTaskLineNumber } from '../../core/parser/taskParser.js';
import { TaskTreeItem } from '../views/taskTreeProvider.js';

export function registerOpenTaskCommand(
  context: vscode.ExtensionContext,
  taskStore: TaskStore,
  fileStore: FileStore,
  configManager: ConfigManager,
) {
  context.subscriptions.push(
    vscode.commands.registerCommand('taskplanner.openTask', async (item?: TaskTreeItem | string) => {
      let taskId: string;

      if (item instanceof TaskTreeItem) {
        taskId = item.task.id;
      } else if (typeof item === 'string') {
        taskId = item;
      } else {
        return;
      }

      const found = taskStore.findTask(taskId);
      if (!found) {
        vscode.window.showErrorMessage(`Task ${taskId} not found.`);
        return;
      }

      const state = configManager.get().states.find((s) => s.name === found.stateName);
      if (!state) {
        return;
      }

      const filePath = fileStore.getStateFilePath(state);
      const content = fileStore.readRawContent(state);
      const lineNumber = findTaskLineNumber(content, taskId);

      const doc = await vscode.workspace.openTextDocument(filePath);
      const editor = await vscode.window.showTextDocument(doc);

      const position = new vscode.Position(lineNumber - 1, 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(
        new vscode.Range(position, position),
        vscode.TextEditorRevealType.InCenter,
      );
    }),
  );
}
