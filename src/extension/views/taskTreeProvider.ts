import * as vscode from 'vscode';
import { TaskStore } from '../../core/store/taskStore.js';
import { ConfigManager } from '../../core/config/configManager.js';
import { Task } from '../../core/model/task.js';
import { TaskState } from '../../core/model/state.js';

export class TaskTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private taskStore: TaskStore,
    private configManager: ConfigManager,
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeNode): TreeNode[] {
    if (!element) {
      // Root level: state nodes
      return this.configManager.get().states.map((state) => {
        const tasks = this.taskStore.getTasksByState(state.name);
        return new StateTreeItem(state, tasks.length);
      });
    }

    if (element instanceof StateTreeItem) {
      // Children of a state: task items
      return this.taskStore
        .getTasksByState(element.state.name)
        .map((task) => new TaskTreeItem(task, element.state.name));
    }

    return [];
  }
}

export type TreeNode = StateTreeItem | TaskTreeItem;

export class StateTreeItem extends vscode.TreeItem {
  constructor(
    public readonly state: TaskState,
    taskCount: number,
  ) {
    super(state.name, vscode.TreeItemCollapsibleState.Expanded);
    this.description = `(${taskCount})`;
    this.contextValue = 'state';
    this.iconPath = new vscode.ThemeIcon('list-unordered');
  }
}

export class TaskTreeItem extends vscode.TreeItem {
  constructor(
    public readonly task: Task,
    public readonly stateName: string,
  ) {
    super(`[${task.priority}] ${task.id}: ${task.title}`, vscode.TreeItemCollapsibleState.None);

    this.contextValue = 'task';
    this.tooltip = this.buildTooltip();
    this.description = task.tags.length > 0 ? task.tags.join(', ') : undefined;

    this.iconPath = this.getPriorityIcon();

    this.command = {
      command: 'taskplanner.openTask',
      title: 'Open Task',
      arguments: [task.id],
    };
  }

  private buildTooltip(): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**${this.task.id}: ${this.task.title}**\n\n`);
    md.appendMarkdown(`Priority: ${this.task.priority}\n\n`);
    if (this.task.tags.length > 0) {
      md.appendMarkdown(`Tags: ${this.task.tags.join(', ')}\n\n`);
    }
    if (this.task.epic) {
      md.appendMarkdown(`Epic: ${this.task.epic}\n\n`);
    }
    if (this.task.description) {
      md.appendMarkdown(`---\n\n${this.task.description}`);
    }
    return md;
  }

  private getPriorityIcon(): vscode.ThemeIcon {
    switch (this.task.priority) {
      case 'P1':
        return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.red'));
      case 'P2':
        return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.orange'));
      case 'P3':
        return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.blue'));
      case 'P4':
        return new vscode.ThemeIcon('circle-outline');
      default:
        return new vscode.ThemeIcon('circle-outline');
    }
  }
}
