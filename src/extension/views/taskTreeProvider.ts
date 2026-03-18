import * as vscode from 'vscode';
import { TaskStore } from '../../core/store/taskStore.js';
import { ConfigManager } from '../../core/config/configManager.js';
import { Task } from '../../core/model/task.js';
import { TaskState } from '../../core/model/state.js';
import { sortTasks } from '../../core/filter/taskFilter.js';

export class TaskTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private taskStore: TaskStore,
    private configManager: ConfigManager,
    private isInitialized: () => boolean,
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeNode): TreeNode[] {
    if (!element) {
      if (!this.isInitialized()) {
        return []; // Welcome view will show instead
      }
      // Root level: state nodes
      return this.configManager.get().states.map((state) => {
        const tasks = this.taskStore.getTasksByState(state.name);
        return new StateTreeItem(state, tasks.length);
      });
    }

    if (element instanceof StateTreeItem) {
      // Children of a state: task items
      const sortBy = this.configManager.get().sortBy ?? 'priority';
      const tasks = sortTasks(this.taskStore.getTasksByState(element.state.name), sortBy);
      return tasks.map((task) => new TaskTreeItem(task, element.state.name));
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
    const expanded = state.name === 'In Progress' || state.name === 'Next';
    super(state.name, expanded ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed);
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

const TREE_MIME_TYPE = 'application/vnd.code.tree.taskplannerTaskView';

export class TaskDragAndDropController implements vscode.TreeDragAndDropController<TreeNode> {
  readonly dropMimeTypes = [TREE_MIME_TYPE];
  readonly dragMimeTypes = [TREE_MIME_TYPE];

  constructor(private taskStore: TaskStore) {}

  handleDrag(source: readonly TreeNode[], dataTransfer: vscode.DataTransfer): void {
    const tasks = source.filter((n): n is TaskTreeItem => n instanceof TaskTreeItem);
    if (tasks.length === 0) return;
    dataTransfer.set(TREE_MIME_TYPE, new vscode.DataTransferItem(tasks.map((t) => t.task.id)));
  }

  handleDrop(target: TreeNode | undefined, dataTransfer: vscode.DataTransfer): void {
    const item = dataTransfer.get(TREE_MIME_TYPE);
    if (!item || !target) return;

    const taskIds = item.value as string[];
    let targetStateName: string;

    if (target instanceof StateTreeItem) {
      targetStateName = target.state.name;
    } else if (target instanceof TaskTreeItem) {
      targetStateName = target.stateName;
    } else {
      return;
    }

    for (const taskId of taskIds) {
      this.taskStore.moveTask(taskId, targetStateName);
    }
  }
}
