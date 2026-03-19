import * as vscode from 'vscode';
import { TaskStore } from '../../../core/store/taskStore.js';
import { ConfigManager } from '../../../core/config/configManager.js';
import { groupTasks } from '../../../core/filter/taskFilter.js';
import { TaskFilter, GroupViewData, TaskViewItem } from '../../../core/model/messages.js';
import { getWebviewHtml } from './webviewHelper.js';

export class TaskListViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'taskplanner.taskView';

  private view?: vscode.WebviewView;
  private filter: TaskFilter = { groupBy: 'status' };
  private showAllForGroup: Set<string> = new Set();
  private expandedGroups: Set<string> = new Set();
  private storeDisposable?: { dispose: () => void };

  constructor(
    private taskStore: TaskStore,
    private configManager: ConfigManager,
    private isInitialized: () => boolean,
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.onDidReceiveMessage((msg) => this.handleMessage(msg));
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.update();
      }
    });
    webviewView.onDidDispose(() => {
      this.storeDisposable?.dispose();
      this.storeDisposable = undefined;
      this.view = undefined;
    });

    this.storeDisposable = this.taskStore.onDidChange(() => {
      if (this.view?.visible) {
        this.update();
      }
    });

    this.update();
  }

  public refresh(): void {
    this.update();
  }

  private handleMessage(msg: { type: string; [key: string]: unknown }): void {
    switch (msg.type) {
      case 'ready':
        this.update();
        break;
      case 'applyFilter':
        this.filter = (msg.filter as TaskFilter) ?? { groupBy: 'status' };
        this.showAllForGroup.clear();
        this.update();
        break;
      case 'showAll':
        if (msg.groupLabel) {
          this.showAllForGroup.add(msg.groupLabel as string);
        }
        this.update();
        break;
      case 'toggleGroup':
        {
          const label = msg.groupLabel as string;
          if (this.expandedGroups.has(label)) {
            this.expandedGroups.delete(label);
          } else {
            this.expandedGroups.add(label);
          }
        }
        this.update();
        break;
      case 'moveTask':
        this.taskStore.moveTask(msg.taskId as string, msg.targetState as string);
        break;
      case 'deleteTask':
        this.taskStore.deleteTask(msg.taskId as string);
        break;
      case 'openTask':
        vscode.commands.executeCommand('taskplanner.openTask', msg.taskId as string);
        break;
      case 'command':
        vscode.commands.executeCommand(msg.command as string);
        break;
    }
  }

  private update(): void {
    if (!this.view) return;

    if (!this.isInitialized()) {
      this.view.webview.html = this.buildWelcomeHtml();
      return;
    }

    const config = this.configManager.get();
    const states = config.states;
    const sortBy = vscode.workspace.getConfiguration('taskplanner').get<'priority' | 'name' | 'id'>('sortBy', 'priority');
    const allTasks = this.taskStore.getAllTasks();
    const groupBy = this.filter.groupBy ?? 'status';

    const groups = groupTasks(allTasks, states, groupBy, this.filter, undefined, sortBy);

    // Apply per-group "show all" overrides
    if (this.showAllForGroup.size > 0) {
      const unlimitedGroups = groupTasks(allTasks, states, groupBy, this.filter, null, sortBy);
      for (const group of groups) {
        if (this.showAllForGroup.has(group.label)) {
          const full = unlimitedGroups.find((g) => g.label === group.label);
          if (full) {
            group.tasks = full.tasks;
            group.hasMore = false;
          }
        }
      }
    }

    this.view.webview.html = this.buildHtml(groups, groupBy);
  }

  private buildWelcomeHtml(): string {
    const body = `
      <div class="welcome">
        <p>No TaskPlanner project found in this workspace.</p>
        <button class="welcome-btn" onclick="vscode.postMessage({type:'command',command:'taskplanner.init'})">Initialize Project</button>
        <button class="welcome-btn" onclick="vscode.postMessage({type:'command',command:'taskplanner.setup'})">Setup</button>
      </div>
    `;

    const extraStyles = `
      <style>
        body { padding: 8px; }
        .welcome {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px 8px;
          text-align: center;
          color: var(--muted-fg);
        }
        .welcome-btn {
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          padding: 6px 14px;
          border-radius: 3px;
          cursor: pointer;
          font-family: inherit;
          font-size: inherit;
        }
        .welcome-btn:hover {
          background: var(--vscode-button-hoverBackground);
        }
      </style>
    `;

    return getWebviewHtml(this.view!.webview, 'Tasks', extraStyles + body, '');
  }

  private buildHtml(groups: GroupViewData[], groupBy: string): string {
    const states = this.configManager.get().states;
    const stateOptions = states.map((s) => {
      const selected = this.filter.status === s.name ? ' selected' : '';
      return `<option value="${s.name}"${selected}>${s.name}</option>`;
    });

    const groupByOptions = [
      { value: 'status', label: 'Status' },
      { value: 'assignee', label: 'Assignee' },
      { value: 'date', label: 'Date' },
      { value: 'none', label: 'No grouping' },
    ]
      .map((o) => `<option value="${o.value}"${groupBy === o.value ? ' selected' : ''}>${o.label}</option>`)
      .join('\n');

    const filterBar = `
      <div class="filter-bar">
        <input type="text" id="queryFilter" placeholder="Search..."
          value="${this.escapeAttr(this.filter.query ?? '')}" />
        <div class="filter-row">
          <select id="groupByFilter">${groupByOptions}</select>
          <select id="statusFilter">
            <option value=""${!this.filter.status ? ' selected' : ''}>All</option>
            ${stateOptions.join('\n')}
          </select>
        </div>
      </div>
    `;

    const sections = groups
      .map((g) => this.buildGroupSection(g, states))
      .join('\n');

    const body = `
      ${filterBar}
      <div id="taskSections">${sections}</div>
    `;

    const script = `
      const statusEl = document.getElementById('statusFilter');
      const queryEl = document.getElementById('queryFilter');
      const groupByEl = document.getElementById('groupByFilter');

      let debounceTimer;
      function applyFilter() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          vscode.postMessage({
            type: 'applyFilter',
            filter: {
              status: statusEl.value || undefined,
              query: queryEl.value || undefined,
              groupBy: groupByEl.value || 'status'
            }
          });
        }, 200);
      }

      statusEl.addEventListener('change', applyFilter);
      queryEl.addEventListener('input', applyFilter);
      groupByEl.addEventListener('change', applyFilter);

      document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const taskId = btn.dataset.taskId;

        if (action === 'move') {
          const select = btn.previousElementSibling;
          if (select && select.value) {
            vscode.postMessage({ type: 'moveTask', taskId, targetState: select.value });
          }
        } else if (action === 'delete') {
          vscode.postMessage({ type: 'deleteTask', taskId });
        } else if (action === 'open') {
          vscode.postMessage({ type: 'openTask', taskId });
        } else if (action === 'showAll') {
          vscode.postMessage({ type: 'showAll', groupLabel: btn.dataset.groupLabel });
        } else if (action === 'toggleGroup') {
          vscode.postMessage({ type: 'toggleGroup', groupLabel: btn.dataset.groupLabel });
        }
      });
    `;

    const extraStyles = `
      <style>
        body { padding: 8px; }
        h1 { display: none; }
        .filter-bar {
          margin-bottom: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .filter-bar #queryFilter {
          width: 100%;
        }
        .filter-row {
          display: flex;
          gap: 4px;
        }
        .filter-row select {
          flex: 1;
          min-width: 0;
        }
        .group-section {
          margin-bottom: 8px;
        }
        .group-header {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          padding: 4px 6px;
          border-radius: 4px;
          user-select: none;
        }
        .group-header:hover {
          background: var(--card-hover);
        }
        .group-header h2 {
          font-size: 0.95em;
          margin: 0;
        }
        .group-chevron {
          font-size: 0.7em;
          transition: transform 0.15s;
          color: var(--muted-fg);
        }
        .group-chevron.collapsed {
          transform: rotate(-90deg);
        }
        .group-tasks {
          margin-top: 2px;
        }
        .group-tasks.hidden {
          display: none;
        }
        .task-card {
          padding: 6px 8px;
          margin-bottom: 4px;
          gap: 6px;
        }
        .task-content {
          min-width: 0;
        }
        .task-header {
          gap: 4px;
        }
        .task-id {
          font-size: 0.8em;
        }
        .task-title {
          font-size: 0.9em;
        }
        .task-actions {
          flex-direction: column;
          gap: 2px;
        }
        .task-actions select {
          font-size: 0.75em;
          padding: 2px 4px;
        }
        .task-actions .action-btn {
          font-size: 0.75em;
          padding: 1px 6px;
        }
        .task-meta {
          display: flex;
          gap: 6px;
          margin-top: 2px;
          font-size: 0.75em;
          color: var(--muted-fg);
        }
        .task-meta-item {
          display: flex;
          align-items: center;
          gap: 2px;
        }
      </style>
    `;

    return getWebviewHtml(this.view!.webview, 'Tasks', extraStyles + body, script);
  }

  private buildGroupSection(group: GroupViewData, allStates: { name: string }[]): string {
    const isCollapsedByDefault = group.collapsed && !this.expandedGroups.has(group.label);
    const isHidden = isCollapsedByDefault && !this.filter.query;
    const chevronClass = isHidden ? 'group-chevron collapsed' : 'group-chevron';
    const tasksClass = isHidden ? 'group-tasks hidden' : 'group-tasks';

    const cards = group.tasks.map((t) => this.buildTaskCard(t, allStates)).join('\n');
    const showMore = group.hasMore
      ? `<div class="show-more" data-action="showAll" data-group-label="${this.escapeAttr(group.label)}">Showing ${group.tasks.length} of ${group.totalCount} — Show all</div>`
      : '';

    const empty = group.tasks.length === 0 && !this.filter.query
      ? '<div class="empty-state">No tasks</div>'
      : group.tasks.length === 0
        ? ''
        : '';

    return `
      <div class="group-section">
        <div class="group-header" data-action="toggleGroup" data-group-label="${this.escapeAttr(group.label)}">
          <span class="${chevronClass}">&#9660;</span>
          <h2>${this.escapeHtml(group.label)} <span class="count-badge">(${group.totalCount})</span></h2>
        </div>
        <div class="${tasksClass}">
          ${cards}
          ${empty}
          ${showMore}
        </div>
      </div>
    `;
  }

  private buildTaskCard(task: TaskViewItem, allStates: { name: string }[]): string {
    const tags = task.tags.map((t) => `<span class="tag">${this.escapeHtml(t)}</span>`).join('');
    const otherStates = allStates
      .map((s) => `<option value="${s.name}">${s.name}</option>`)
      .join('');

    const metaParts: string[] = [];
    if (task.assignee) {
      metaParts.push(`<span class="task-meta-item">&#128100; ${this.escapeHtml(task.assignee)}</span>`);
    }
    if (task.updatedAt) {
      metaParts.push(`<span class="task-meta-item">&#128339; ${this.escapeHtml(task.updatedAt)}</span>`);
    }
    const metaHtml = metaParts.length > 0
      ? `<div class="task-meta">${metaParts.join('')}</div>`
      : '';

    return `
      <div class="task-card">
        <div class="priority-bar priority-${task.priority}"></div>
        <div class="task-content" data-action="open" data-task-id="${task.id}" style="cursor:pointer;">
          <div class="task-header">
            <span class="task-id">${task.id}</span>
            <span class="task-title">${this.escapeHtml(task.title)}</span>
          </div>
          ${tags ? `<div class="task-tags">${tags}</div>` : ''}
          ${metaHtml}
        </div>
        <div class="task-actions">
          <select title="Move to..." style="font-size:0.8em;">
            <option value="">Move to...</option>
            ${otherStates}
          </select>
          <button class="action-btn" data-action="move" data-task-id="${task.id}" title="Move">Go</button>
          <button class="action-btn danger" data-action="delete" data-task-id="${task.id}" title="Delete">&#10005;</button>
        </div>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private escapeAttr(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }
}
