import * as vscode from 'vscode';
import { TaskStore } from '../../../core/store/taskStore.js';
import { ConfigManager } from '../../../core/config/configManager.js';
import { groupTasks } from '../../../core/filter/taskFilter.js';
import { Task, Priority } from '../../../core/model/task.js';
import { TaskFilter, GroupViewData, TaskViewItem } from '../../../core/model/messages.js';
import { getWebviewHtml } from './webviewHelper.js';

export class TaskListViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'taskplanner.taskView';

  private view?: vscode.WebviewView;
  private filter: TaskFilter = { groupBy: 'status' };
  private sortBy: 'priority' | 'name' | 'id' = 'priority';
  private showAllForGroup: Set<string> = new Set();
  private expandedGroups: Set<string> = new Set();
  private activeTaskId: string | null = null;
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

  public showTask(taskId: string): void {
    this.activeTaskId = taskId;
    this.update();
  }

  private handleMessage(msg: { type: string; [key: string]: unknown }): void {
    switch (msg.type) {
      case 'ready':
        this.update();
        break;
      case 'applyFilter':
        this.filter = (msg.filter as TaskFilter) ?? { groupBy: 'status' };
        if (msg.sortBy) {
          this.sortBy = msg.sortBy as 'priority' | 'name' | 'id';
        }
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
      case 'viewTask':
        this.activeTaskId = msg.taskId as string;
        this.update();
        break;
      case 'backToList':
        this.activeTaskId = null;
        this.update();
        break;
      case 'changeStatus':
        this.taskStore.moveTask(msg.taskId as string, msg.targetState as string);
        break;
      case 'saveTask':
        {
          const taskId = msg.taskId as string;
          const updates: Partial<Omit<Task, 'id'>> = {};
          if (msg.title !== undefined) updates.title = msg.title as string;
          if (msg.description !== undefined) updates.description = msg.description as string;
          if (msg.priority !== undefined) updates.priority = msg.priority as Priority;
          if (msg.tags !== undefined) updates.tags = msg.tags as string[];
          if (msg.assignee !== undefined) updates.assignee = (msg.assignee as string) || undefined;
          if (msg.epic !== undefined) updates.epic = (msg.epic as string) || undefined;
          this.taskStore.updateTask(taskId, updates);
        }
        break;
      case 'deleteTask':
        this.taskStore.deleteTask(msg.taskId as string);
        this.activeTaskId = null;
        this.update();
        break;
      case 'openInEditor':
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

    if (this.activeTaskId) {
      const found = this.taskStore.findTask(this.activeTaskId);
      if (found) {
        this.view.webview.html = this.buildDetailHtml(found.task, found.stateName);
        return;
      }
      this.activeTaskId = null;
    }

    const config = this.configManager.get();
    const states = config.states;
    const allTasks = this.taskStore.getAllTasks();
    const groupBy = this.filter.groupBy ?? 'status';

    const groups = groupTasks(allTasks, states, groupBy, this.filter, undefined, this.sortBy);

    if (this.showAllForGroup.size > 0) {
      const unlimitedGroups = groupTasks(allTasks, states, groupBy, this.filter, null, this.sortBy);
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

    this.view.webview.html = this.buildListHtml(groups, groupBy);
  }

  // ── Welcome ───────────────────────────────────────────────────────

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

  // ── List view ─────────────────────────────────────────────────────

  private buildListHtml(groups: GroupViewData[], groupBy: string): string {
    const states = this.configManager.get().states;
    const stateOptions = states.map((s) => {
      const selected = this.filter.status === s.name ? ' selected' : '';
      return `<option value="${s.name}"${selected}>${s.name}</option>`;
    });

    const groupByItems = [
      { value: 'status', label: 'Status' },
      { value: 'assignee', label: 'Assignee' },
      { value: 'date', label: 'Date' },
      { value: 'none', label: 'No grouping' },
    ]
      .map((o) => `<div class="popup-item${groupBy === o.value ? ' active' : ''}" data-action="setGroupBy" data-value="${o.value}">${o.label}</div>`)
      .join('\n');

    const sortByItems = [
      { value: 'priority', label: 'Priority' },
      { value: 'name', label: 'Name' },
      { value: 'id', label: 'ID' },
    ]
      .map((o) => `<div class="popup-item${this.sortBy === o.value ? ' active' : ''}" data-action="setSortBy" data-value="${o.value}">${o.label}</div>`)
      .join('\n');

    const filterBar = `
      <div class="filter-bar">
        <div class="filter-top">
          <input type="text" id="queryFilter" placeholder="Search..."
            value="${this.escapeAttr(this.filter.query ?? '')}" />
          <select id="statusFilter">
            <option value=""${!this.filter.status ? ' selected' : ''}>All statuses</option>
            ${stateOptions.join('\n')}
          </select>
        </div>
        <div class="filter-icons">
          <div class="icon-btn-wrap">
            <button class="icon-btn${groupBy !== 'status' ? ' icon-btn-active' : ''}" id="groupByBtn" title="Group by: ${this.escapeAttr(groupBy)}">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 3h14v1H1zm0 4h10v1H1zm0 4h14v1H1zm0-2h10v1H1z"/></svg>
            </button>
            <div class="popup-menu" id="groupByMenu">
              <div class="popup-label">Group by</div>
              ${groupByItems}
            </div>
          </div>
          <div class="icon-btn-wrap">
            <button class="icon-btn${this.sortBy !== 'priority' ? ' icon-btn-active' : ''}" id="sortByBtn" title="Sort by: ${this.escapeAttr(this.sortBy)}">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 1l3 4H4v6h2l-3 4-3-4h2V5H0l3-4zm6 1h7v2H9V2zm0 4h5v2H9V6zm0 4h3v2H9v-2z"/></svg>
            </button>
            <div class="popup-menu" id="sortByMenu">
              <div class="popup-label">Sort by</div>
              ${sortByItems}
            </div>
          </div>
        </div>
      </div>
    `;

    const sections = groups
      .map((g) => this.buildGroupSection(g))
      .join('\n');

    const body = `
      ${filterBar}
      <div id="taskSections">${sections}</div>
    `;

    const script = `
      const statusEl = document.getElementById('statusFilter');
      const queryEl = document.getElementById('queryFilter');
      const groupByBtn = document.getElementById('groupByBtn');
      const groupByMenu = document.getElementById('groupByMenu');
      const sortByBtn = document.getElementById('sortByBtn');
      const sortByMenu = document.getElementById('sortByMenu');

      let currentGroupBy = ${JSON.stringify(groupBy)};
      let currentSortBy = ${JSON.stringify(this.sortBy)};

      let debounceTimer;
      function applyFilter() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          vscode.postMessage({
            type: 'applyFilter',
            filter: {
              status: statusEl.value || undefined,
              query: queryEl.value || undefined,
              groupBy: currentGroupBy
            },
            sortBy: currentSortBy
          });
        }, 200);
      }

      statusEl.addEventListener('change', applyFilter);
      queryEl.addEventListener('input', applyFilter);

      // Restore focus to search when re-rendered with an active query
      if (queryEl.value) {
        requestAnimationFrame(() => {
          queryEl.focus();
          queryEl.setSelectionRange(queryEl.value.length, queryEl.value.length);
        });
      }

      // Popup menu toggle
      function closeAllMenus() {
        document.querySelectorAll('.popup-menu.open').forEach(m => m.classList.remove('open'));
      }

      groupByBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = groupByMenu.classList.contains('open');
        closeAllMenus();
        if (!isOpen) groupByMenu.classList.add('open');
      });

      sortByBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = sortByMenu.classList.contains('open');
        closeAllMenus();
        if (!isOpen) sortByMenu.classList.add('open');
      });

      document.addEventListener('click', () => closeAllMenus());

      document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;

        if (action === 'viewTask') {
          vscode.postMessage({ type: 'viewTask', taskId: btn.dataset.taskId });
        } else if (action === 'showAll') {
          vscode.postMessage({ type: 'showAll', groupLabel: btn.dataset.groupLabel });
        } else if (action === 'toggleGroup') {
          vscode.postMessage({ type: 'toggleGroup', groupLabel: btn.dataset.groupLabel });
        } else if (action === 'setGroupBy') {
          currentGroupBy = btn.dataset.value;
          closeAllMenus();
          applyFilter();
        } else if (action === 'setSortBy') {
          currentSortBy = btn.dataset.value;
          closeAllMenus();
          applyFilter();
        }
      });
    `;

    const extraStyles = `
      <style>
        body { padding: 8px; }
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
        .filter-select-wrap {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 3px;
          background: var(--vscode-input-background);
          border: 1px solid var(--vscode-input-border, var(--card-border));
          border-radius: 3px;
          padding-left: 5px;
        }
        .filter-select-wrap:focus-within {
          outline: 1px solid var(--accent);
        }
        .filter-icon {
          flex-shrink: 0;
          color: var(--muted-fg);
        }
        .filter-select-wrap select {
          flex: 1;
          min-width: 0;
          border: none;
          background: transparent;
          padding-left: 2px;
        }
        .filter-select-wrap select:focus {
          outline: none;
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
          cursor: pointer;
        }
        .task-content {
          min-width: 0;
          flex: 1;
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

  private buildGroupSection(group: GroupViewData): string {
    const isCollapsedByDefault = group.collapsed && !this.expandedGroups.has(group.label);
    const isHidden = isCollapsedByDefault && !this.filter.query;
    const chevronClass = isHidden ? 'group-chevron collapsed' : 'group-chevron';
    const tasksClass = isHidden ? 'group-tasks hidden' : 'group-tasks';

    const cards = group.tasks.map((t) => this.buildTaskCard(t)).join('\n');
    const showMore = group.hasMore
      ? `<div class="show-more" data-action="showAll" data-group-label="${this.escapeAttr(group.label)}">Showing ${group.tasks.length} of ${group.totalCount} — Show all</div>`
      : '';

    const empty = group.tasks.length === 0 && !this.filter.query
      ? '<div class="empty-state">No tasks</div>'
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

  private buildTaskCard(task: TaskViewItem): string {
    const tags = task.tags.map((t) => `<span class="tag">${this.escapeHtml(t)}</span>`).join('');

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
      <div class="task-card" data-action="viewTask" data-task-id="${task.id}">
        <div class="priority-bar priority-${task.priority}"></div>
        <div class="task-content">
          <div class="task-header">
            <span class="task-id">${task.id}</span>
            <span class="task-title">${this.escapeHtml(task.title)}</span>
          </div>
          ${tags ? `<div class="task-tags">${tags}</div>` : ''}
          ${metaHtml}
        </div>
      </div>
    `;
  }

  // ── Detail / edit view ────────────────────────────────────────────

  private buildDetailHtml(task: Task, stateName: string): string {
    const states = this.configManager.get().states;
    const stateOptions = states
      .map((s) => `<option value="${s.name}"${s.name === stateName ? ' selected' : ''}>${s.name}</option>`)
      .join('\n');

    const priorityOptions = Object.values(Priority)
      .map((p) => `<option value="${p}"${p === task.priority ? ' selected' : ''}>${p}</option>`)
      .join('\n');

    const descriptionText = this.escapeHtml(task.description);

    const body = `
      <div class="detail-view">
        <button class="back-btn" id="backBtn">&#8592; Back</button>

        <div class="detail-field">
          <label>Title</label>
          <input type="text" id="fieldTitle" value="${this.escapeAttr(task.title)}" />
        </div>

        <div class="detail-row">
          <div class="detail-field detail-field-half">
            <label>Status</label>
            <select id="fieldStatus">${stateOptions}</select>
          </div>
          <div class="detail-field detail-field-half">
            <label>Priority</label>
            <select id="fieldPriority">${priorityOptions}</select>
          </div>
        </div>

        <div class="detail-row">
          <div class="detail-field detail-field-half">
            <label>Assignee</label>
            <input type="text" id="fieldAssignee" value="${this.escapeAttr(task.assignee ?? '')}" placeholder="Unassigned" />
          </div>
          <div class="detail-field detail-field-half">
            <label>Epic</label>
            <input type="text" id="fieldEpic" value="${this.escapeAttr(task.epic ?? '')}" placeholder="None" />
          </div>
        </div>

        <div class="detail-field">
          <label>Tags</label>
          <input type="text" id="fieldTags" value="${this.escapeAttr(task.tags.join(', '))}" placeholder="tag1, tag2" />
        </div>

        <div class="detail-field detail-field-grow">
          <label>Description</label>
          <textarea id="fieldDescription">${descriptionText}</textarea>
        </div>

        ${task.updatedAt ? `<div class="detail-meta">Updated: ${this.escapeHtml(task.updatedAt)}</div>` : ''}

        <div class="detail-actions">
          <button class="save-btn" id="saveBtn">Save</button>
          <button class="editor-btn" id="editorBtn">Open in Editor</button>
          <button class="delete-btn" id="deleteBtn">Delete</button>
        </div>

        <div class="detail-id">${this.escapeHtml(task.id)}</div>
      </div>
    `;

    const script = `
      const taskId = ${JSON.stringify(task.id)};

      document.getElementById('backBtn').addEventListener('click', () => {
        vscode.postMessage({ type: 'backToList' });
      });

      document.getElementById('fieldStatus').addEventListener('change', (e) => {
        vscode.postMessage({ type: 'changeStatus', taskId, targetState: e.target.value });
      });

      document.getElementById('saveBtn').addEventListener('click', () => {
        const tagsRaw = document.getElementById('fieldTags').value;
        const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
        vscode.postMessage({
          type: 'saveTask',
          taskId,
          title: document.getElementById('fieldTitle').value,
          priority: document.getElementById('fieldPriority').value,
          assignee: document.getElementById('fieldAssignee').value,
          epic: document.getElementById('fieldEpic').value,
          tags,
          description: document.getElementById('fieldDescription').value
        });
      });

      document.getElementById('editorBtn').addEventListener('click', () => {
        vscode.postMessage({ type: 'openInEditor', taskId });
      });

      document.getElementById('deleteBtn').addEventListener('click', () => {
        if (confirm('Delete this task?')) {
          vscode.postMessage({ type: 'deleteTask', taskId });
        }
      });
    `;

    const extraStyles = `
      <style>
        html, body {
          height: 100%;
          margin: 0;
          padding: 0;
        }
        body {
          padding: 8px;
          display: flex;
          flex-direction: column;
        }
        .detail-view {
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
          min-height: 0;
        }
        .back-btn {
          background: none;
          border: none;
          color: var(--accent);
          cursor: pointer;
          font-family: inherit;
          font-size: 0.9em;
          padding: 2px 0;
          text-align: left;
          width: fit-content;
        }
        .back-btn:hover {
          text-decoration: underline;
        }
        .detail-field {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .detail-field label {
          font-size: 0.8em;
          font-weight: 500;
          color: var(--muted-fg);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .detail-field input,
        .detail-field select,
        .detail-field textarea {
          width: 100%;
        }
        .detail-field textarea {
          resize: vertical;
          min-height: 80px;
          font-family: inherit;
          font-size: inherit;
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border, var(--card-border));
          padding: 4px 8px;
          border-radius: 3px;
        }
        .detail-field textarea:focus {
          outline: 1px solid var(--accent);
        }
        .detail-field-grow {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .detail-field-grow textarea {
          flex: 1;
          min-height: 80px;
        }
        .detail-row {
          display: flex;
          gap: 8px;
        }
        .detail-field-half {
          flex: 1;
          min-width: 0;
        }
        .detail-meta {
          font-size: 0.8em;
          color: var(--muted-fg);
        }
        .detail-actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          padding-top: 4px;
          border-top: 1px solid var(--card-border);
        }
        .save-btn {
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          padding: 5px 14px;
          border-radius: 3px;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.85em;
        }
        .save-btn:hover {
          background: var(--vscode-button-hoverBackground);
        }
        .editor-btn {
          background: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
          border: none;
          padding: 5px 14px;
          border-radius: 3px;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.85em;
        }
        .editor-btn:hover {
          background: var(--vscode-button-secondaryHoverBackground);
        }
        .delete-btn {
          background: none;
          border: 1px solid var(--vscode-inputValidation-errorBorder, #c0392b);
          color: var(--vscode-inputValidation-errorBorder, #c0392b);
          padding: 5px 14px;
          border-radius: 3px;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.85em;
          margin-left: auto;
        }
        .delete-btn:hover {
          background: var(--vscode-inputValidation-errorBackground, #c0392b);
          color: var(--vscode-button-foreground, #fff);
        }
        .detail-id {
          font-size: 0.75em;
          color: var(--muted-fg);
          text-align: right;
        }
      </style>
    `;

    return getWebviewHtml(this.view!.webview, 'Tasks', extraStyles + body, script);
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private escapeAttr(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }
}
