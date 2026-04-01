import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { contentHasTaskPlannerMarkers } from '../core/ai/aiInstructions.js';

const WORKSPACE_STATE_KEY = 'suppressAiInstructionSyncPrompt';

/**
 * If the workspace has TaskPlanner config but neither CLAUDE.md nor .cursorrules contains the
 * TaskPlanner marker block, offer to run Initialize AI Instructions (Phase 1 onboarding).
 */
export function scheduleAiInstructionSyncPrompt(
  context: vscode.ExtensionContext,
  workspaceRoot: string,
  tasksDir: string,
): void {
  const configPath = path.join(tasksDir, 'config.json');
  if (!fs.existsSync(configPath)) {
    return;
  }

  if (context.workspaceState.get<boolean>(WORKSPACE_STATE_KEY)) {
    return;
  }

  const claudePath = path.join(workspaceRoot, 'CLAUDE.md');
  const cursorPath = path.join(workspaceRoot, '.cursorrules');

  const claudeOk =
    fs.existsSync(claudePath) && contentHasTaskPlannerMarkers(fs.readFileSync(claudePath, 'utf-8'));
  const cursorOk =
    fs.existsSync(cursorPath) && contentHasTaskPlannerMarkers(fs.readFileSync(cursorPath, 'utf-8'));

  if (claudeOk || cursorOk) {
    return;
  }

  void vscode.window
    .showInformationMessage(
      'TaskPlanner: This workspace has tasks but no synced AI instructions in CLAUDE.md or .cursorrules. Sync so Cursor and Claude follow the In Progress → Done workflow.',
      'Sync AI Instructions',
      "Don't show again",
      'Later',
    )
    .then((choice) => {
      if (choice === 'Sync AI Instructions') {
        void vscode.commands.executeCommand('taskplanner.initAi');
      } else if (choice === "Don't show again") {
        void context.workspaceState.update(WORKSPACE_STATE_KEY, true);
      }
    });
}
