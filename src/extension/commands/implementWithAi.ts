import * as vscode from 'vscode';
import { TaskStore } from '../../core/store/taskStore.js';
import { ConfigManager } from '../../core/config/configManager.js';
import { composeImplementationPrompt } from '../../core/ai/promptComposer.js';

type AiTool = 'auto' | 'cursor' | 'claude-code' | 'clipboard';

export function registerImplementWithAiCommand(
  context: vscode.ExtensionContext,
  taskStore: TaskStore,
  configManager: ConfigManager,
) {
  context.subscriptions.push(
    vscode.commands.registerCommand('taskplanner.implementWithAi', async (taskId?: string) => {
      if (typeof taskId !== 'string') {
        return;
      }

      const found = taskStore.findTask(taskId);
      if (!found) {
        vscode.window.showErrorMessage(`Task ${taskId} not found.`);
        return;
      }

      const config = configManager.get();
      const prompt = composeImplementationPrompt(found.task, found.stateName, config);

      const setting = vscode.workspace.getConfiguration('taskplanner').get<AiTool>('aiTool', 'auto');
      const tool = setting === 'auto' ? detectAiTool() : setting;

      await dispatch(tool, prompt);
    }),
  );
}

function detectAiTool(): Exclude<AiTool, 'auto'> {
  const appName = vscode.env.appName.toLowerCase();
  if (appName.includes('cursor')) {
    return 'cursor';
  }
  return 'claude-code';
}

async function dispatch(tool: Exclude<AiTool, 'auto'>, prompt: string): Promise<void> {
  switch (tool) {
    case 'cursor':
      await dispatchCursor(prompt);
      break;
    case 'claude-code':
      await dispatchClaudeCode(prompt);
      break;
    case 'clipboard':
      await copyToClipboard(prompt);
      break;
  }
}

async function dispatchCursor(prompt: string): Promise<void> {
  // Try known Cursor Composer commands
  const cursorCommands = [
    'composerMode.agent',
    'aipane.aichat.open',
  ];

  for (const cmd of cursorCommands) {
    try {
      await vscode.commands.executeCommand(cmd, prompt);
      return;
    } catch {
      // Command not available, try next
    }
  }

  // Fallback: copy to clipboard and notify
  await copyToClipboard(prompt, 'Cursor Composer command not available.');
}

// TODO: Open prompt directly in Claude Code sidebar once supported.
// https://github.com/anthropics/claude-code/issues/42000
async function dispatchClaudeCode(prompt: string): Promise<void> {
  const uri = vscode.Uri.parse(
    `vscode://anthropic.claude-code/open?prompt=${encodeURIComponent(prompt)}`,
  );
  await vscode.env.openExternal(uri);
  vscode.window.showInformationMessage(
    'Prompt pre-filled in Claude Code — press Enter to submit.',
  );
}

async function copyToClipboard(prompt: string, prefix?: string): Promise<void> {
  await vscode.env.clipboard.writeText(prompt);
  const msg = prefix
    ? `${prefix} Task prompt copied to clipboard — paste into your AI assistant.`
    : 'Task prompt copied to clipboard — paste into your AI assistant.';
  vscode.window.showInformationMessage(msg);
}
