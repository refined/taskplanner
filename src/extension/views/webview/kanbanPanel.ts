import * as vscode from 'vscode';
import { TaskStore } from '../../../core/store/taskStore.js';
import { ConfigManager } from '../../../core/config/configManager.js';
import { filterAndPaginate } from '../../../core/filter/taskFilter.js';
import { TaskViewData, StateViewData, TaskViewItem } from '../../../core/model/messages.js';
import { getWebviewHtml } from './webviewHelper.js';

export class KanbanPanel {
  private static instance: KanbanPanel | undefined;
  private panel: vscode.WebviewPanel;
  private showAllForState: Set<string> = new Set();
  private sortBy: 'priority' | 'name' | 'id' = 'priority';
  private storeDisposable: { dispose: () => void };

  private constructor(
    private taskStore: TaskStore,
    private configManager: ConfigManager,
  ) {
    this.panel = vscode.window.createWebviewPanel(
      'taskplanner.kanban',
      'Tasks: Kanban Board',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: false },
    );

    this.panel.iconPath = new vscode.ThemeIcon('project');

    this.panel.webview.onDidReceiveMessage((msg) => this.handleMessage(msg));
    this.panel.onDidDispose(() => this.dispose());
    this.panel.onDidChangeViewState((e) => {
      if (e.webviewPanel.visible) {
        this.update();
      }
    });

    this.storeDisposable = this.taskStore.onDidChange(() => {
      if (this.panel.visible) {
        this.update();
      }
    });

    this.syncSortFromSettings();
    this.update();
  }

  static createOrShow(taskStore: TaskStore, configManager: ConfigManager): void {
    if (KanbanPanel.instance) {
      KanbanPanel.instance.panel.reveal(vscode.ViewColumn.One);
      return;
    }
    KanbanPanel.instance = new KanbanPanel(taskStore, configManager);
  }

  public static refreshIfOpen(): void {
    if (!KanbanPanel.instance) return;
    KanbanPanel.instance.syncSortFromSettings();
    if (KanbanPanel.instance.panel.visible) {
      KanbanPanel.instance.update();
    }
  }

  private getSortByFromSettings(): 'priority' | 'name' | 'id' {
    const value = vscode.workspace.getConfiguration('taskplanner').get<string>('sortBy', 'priority');
    if (value === 'priority' || value === 'name' || value === 'id') return value;
    return 'priority';
  }

  private syncSortFromSettings(): void {
    this.sortBy = this.getSortByFromSettings();
  }

  private handleMessage(msg: { type: string; [key: string]: unknown }): void {
    switch (msg.type) {
      case 'ready':
        this.update();
        break;
      case 'showAll':
        if (msg.stateName) {
          this.showAllForState.add(msg.stateName as string);
        }
        this.update();
        break;
      case 'showCompleted':
        this.showAllForState.add('Done');
        this.showAllForState.add('Rejected');
        this.update();
        break;
      case 'moveTask':
        this.taskStore.moveTask(msg.taskId as string, msg.targetState as string);
        break;
      case 'deleteTask':
        this.taskStore.deleteTask(msg.taskId as string);
        break;
      case 'openTask':
        vscode.commands.executeCommand('taskplanner.viewTask', msg.taskId as string);
        break;
      case 'addTask':
        vscode.commands.executeCommand('taskplanner.createTaskInState', msg.stateName as string);
        break;
      case 'sortBy':
        {
          const nextSortBy = msg.sortBy as 'priority' | 'name' | 'id';
          if (nextSortBy !== this.sortBy) {
            this.sortBy = nextSortBy;
            void vscode.workspace.getConfiguration('taskplanner').update(
              'sortBy',
              nextSortBy,
              vscode.ConfigurationTarget.Workspace,
            );
          }
          this.update();
        }
        break;
    }
  }

  private update(): void {
    const config = this.configManager.get();
    const states = config.states;
    const allTasks = this.taskStore.getAllTasks();
    const data = filterAndPaginate(allTasks, states, undefined, undefined, this.sortBy);

    // Apply per-state "show all"
    if (this.showAllForState.size > 0) {
      const unlimitedData = filterAndPaginate(allTasks, states, undefined, null, this.sortBy);
      for (const state of data.states) {
        if (this.showAllForState.has(state.name)) {
          const full = unlimitedData.states.find((s) => s.name === state.name);
          if (full) {
            state.tasks = full.tasks;
            state.hasMore = false;
          }
        }
      }
    }

    this.panel.webview.html = this.buildHtml(data);
  }

  private buildHtml(data: TaskViewData): string {
    // Extract known states
    const stateMap = new Map(data.states.map((s) => [s.name, s]));
    const nextState = stateMap.get('Next');
    const backlogState = stateMap.get('Backlog');
    const inProgressState = stateMap.get('In Progress');
    const doneState = stateMap.get('Done');
    const rejectedState = stateMap.get('Rejected');

    // Build columns: Backlog | Next+In Progress | Done+Rejected
    // Any other custom states get their own columns
    const knownNames = new Set(['Next', 'Backlog', 'In Progress', 'Done', 'Rejected']);
    const customStates = data.states.filter((s) => !knownNames.has(s.name));

    let columns = '';
    if (backlogState) {
      columns += this.buildStandardColumn(backlogState);
    }
    if (nextState || inProgressState) {
      columns += this.buildActiveColumn(nextState, inProgressState);
    }
    for (const cs of customStates) {
      columns += this.buildStandardColumn(cs);
    }
    if (doneState || rejectedState) {
      columns += this.buildCompletedColumn(doneState, rejectedState);
    }

    const sortByItems = [
      { value: 'priority', label: 'Priority' },
      { value: 'name', label: 'Name' },
      { value: 'id', label: 'ID' },
    ]
      .map((o) => `<div class="popup-item${this.sortBy === o.value ? ' active' : ''}" data-action="setSortBy" data-value="${o.value}">${o.label}</div>`)
      .join('\n');

    const body = `
      <h1>Kanban Board</h1>
      <div class="kanban-toolbar">
        <div class="icon-btn-wrap">
          <button class="icon-btn${this.sortBy !== 'priority' ? ' icon-btn-active' : ''}" id="sortByBtn" title="Sort by: ${this.sortBy}">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 1l3 4H4v6h2l-3 4-3-4h2V5H0l3-4zm6 1h7v2H9V2zm0 4h5v2H9V6zm0 4h3v2H9v-2z"/></svg>
          </button>
          <div class="popup-menu" id="sortByMenu">
            <div class="popup-label">Sort by</div>
            ${sortByItems}
          </div>
        </div>
      </div>
      <div class="kanban-board">${columns}</div>
    `;

    const script = `
      // Drag and drop — drop targets are elements with [data-state-name]
      let draggedTaskId = null;

      document.addEventListener('dragstart', (e) => {
        const card = e.target.closest('.kanban-card');
        if (!card) return;
        draggedTaskId = card.dataset.taskId;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedTaskId);
      });

      document.addEventListener('dragend', (e) => {
        const card = e.target.closest('.kanban-card');
        if (card) card.classList.remove('dragging');
        document.querySelectorAll('[data-state-name]').forEach(el => el.classList.remove('drag-over'));
        draggedTaskId = null;
      });

      document.addEventListener('dragover', (e) => {
        const zone = e.target.closest('[data-state-name]');
        if (!zone) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        document.querySelectorAll('[data-state-name]').forEach(el => el.classList.remove('drag-over'));
        zone.classList.add('drag-over');
      });

      document.addEventListener('dragleave', (e) => {
        const zone = e.target.closest('[data-state-name]');
        if (zone && !zone.contains(e.relatedTarget)) {
          zone.classList.remove('drag-over');
        }
      });

      document.addEventListener('drop', (e) => {
        e.preventDefault();
        const zone = e.target.closest('[data-state-name]');
        if (!zone || !draggedTaskId) return;
        zone.classList.remove('drag-over');
        const targetState = zone.dataset.stateName;
        vscode.postMessage({ type: 'moveTask', taskId: draggedTaskId, targetState });
        draggedTaskId = null;
      });

      // Popup sort control
      const sortByBtn = document.getElementById('sortByBtn');
      const sortByMenu = document.getElementById('sortByMenu');

      function closeAllMenus() {
        document.querySelectorAll('.popup-menu.open').forEach(m => m.classList.remove('open'));
      }

      sortByBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = sortByMenu.classList.contains('open');
        closeAllMenus();
        if (!isOpen) sortByMenu.classList.add('open');
      });

      document.addEventListener('click', () => closeAllMenus());

      // Button actions
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const taskId = btn.dataset.taskId;

        if (action === 'delete') {
          vscode.postMessage({ type: 'deleteTask', taskId });
        } else if (action === 'open') {
          vscode.postMessage({ type: 'openTask', taskId });
        } else if (action === 'showAll') {
          vscode.postMessage({ type: 'showAll', stateName: btn.dataset.stateName });
        } else if (action === 'showCompleted') {
          vscode.postMessage({ type: 'showCompleted' });
        } else if (action === 'addTask') {
          vscode.postMessage({ type: 'addTask', stateName: btn.dataset.stateName });
        } else if (action === 'setSortBy') {
          vscode.postMessage({ type: 'sortBy', sortBy: btn.dataset.value });
        }
      });
    `;

    const kanbanStyles = `
      <style>
        .kanban-toolbar {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        .icon-btn-wrap {
          position: relative;
          display: inline-flex;
        }
        .icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: 3px;
          color: var(--muted-fg);
          cursor: pointer;
        }
        .icon-btn:hover {
          background: var(--card-hover);
          color: var(--header-fg);
        }
        .icon-btn-active {
          color: var(--accent);
        }
        .popup-menu {
          display: none;
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          background: var(--vscode-dropdown-background);
          color: var(--vscode-foreground);
          border: 1px solid var(--vscode-input-border, var(--card-border));
          border-radius: 4px;
          min-width: 160px;
          padding: 4px 0;
          z-index: 1000;
          font-family: inherit;
          font-size: inherit;
          box-shadow: var(--vscode-widget-shadow, none);
        }
        .popup-menu.open {
          display: block;
        }
        .popup-label {
          padding: 4px 10px;
          color: var(--muted-fg);
          font-size: 0.75em;
          font-family: inherit;
        }
        .popup-item {
          padding: 4px 10px;
          cursor: pointer;
          white-space: nowrap;
          font-family: inherit;
          font-size: inherit;
        }
        .popup-item:hover {
          background: var(--vscode-list-hoverBackground);
        }
        .popup-item.active {
          font-weight: 600;
          background: var(--vscode-list-activeSelectionBackground, var(--card-hover));
        }
        .kanban-board {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding-bottom: 12px;
          min-height: calc(100vh - 80px);
          align-items: flex-start;
        }
        .kanban-column {
          flex: 0 0 260px;
          min-width: 220px;
          background: var(--vscode-sideBar-background, var(--card-bg));
          border: 1px solid var(--card-border);
          border-radius: 6px;
          padding: 10px;
          transition: border-color 0.15s;
        }
        [data-state-name].drag-over {
          border-color: var(--accent);
          border-style: dashed;
          border-width: 2px;
          padding: 9px;
        }
        .column-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          padding-bottom: 6px;
          border-bottom: 1px solid var(--card-border);
        }
        .column-title {
          font-weight: 600;
          font-size: 0.95em;
        }
        .kanban-card {
          padding: 8px;
          margin-bottom: 6px;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 4px;
          cursor: grab;
          transition: background 0.1s, opacity 0.15s;
        }
        .kanban-card:hover {
          background: var(--card-hover);
        }
        .kanban-card.dragging {
          opacity: 0.4;
        }
        .card-top {
          display: flex;
          align-items: flex-start;
          gap: 6px;
        }
        .card-move-row {
          display: flex;
          gap: 3px;
          margin-top: 6px;
          justify-content: flex-end;
          opacity: 0;
          transition: opacity 0.15s;
        }
        .kanban-card:hover .card-move-row {
          opacity: 1;
        }
        .add-btn {
          background: none;
          border: 1px solid var(--card-border);
          color: var(--vscode-foreground, #ccc);
          border-radius: 4px;
          width: 22px;
          height: 22px;
          font-size: 16px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }
        .add-btn:hover {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }
        .sub-zone {
          margin-top: 8px;
          padding: 8px;
          border: 1px solid var(--card-border);
          border-radius: 4px;
          min-height: 36px;
          transition: border-color 0.15s;
        }
        .sub-zone-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .sub-zone-title {
          font-weight: 600;
          font-size: 0.85em;
          color: var(--muted-fg);
        }
        .show-collapsed-btn {
          display: block;
          width: 100%;
          padding: 6px 8px;
          margin-top: 6px;
          background: none;
          border: 1px dashed var(--card-border);
          border-radius: 4px;
          color: var(--muted-fg);
          cursor: pointer;
          font-size: 0.8em;
          text-align: center;
        }
        .show-collapsed-btn:hover {
          border-color: var(--accent);
          color: var(--accent);
        }
      </style>
    `;

    const html = getWebviewHtml(this.panel.webview, 'Tasks: Kanban Board', kanbanStyles + body, script);
    return html;
  }

  /** Standard column (used for In Progress and custom states) */
  private buildStandardColumn(state: StateViewData): string {
    const cards = state.tasks.map((t) => this.buildCard(t)).join('\n');
    const showMore = state.hasMore
      ? `<div class="show-more" data-action="showAll" data-state-name="${state.name}">Showing ${state.tasks.length} of ${state.totalCount} — Show all</div>`
      : '';
    const empty = state.tasks.length === 0 ? '<div class="empty-state">No tasks</div>' : '';

    return `
      <div class="kanban-column" data-state-name="${state.name}">
        <div class="column-header">
          <span class="column-title">${state.name}</span>
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="count-badge">${state.totalCount}</span>
            <button class="add-btn" data-action="addTask" data-state-name="${state.name}" title="Add task to ${state.name}">+</button>
          </div>
        </div>
        ${cards}
        ${empty}
        ${showMore}
      </div>
    `;
  }

  /** Active column: Next + In Progress merged */
  private buildActiveColumn(nextState?: StateViewData, inProgressState?: StateViewData): string {
    const nextCount = nextState?.totalCount ?? 0;
    const inProgressCount = inProgressState?.totalCount ?? 0;
    const totalActive = nextCount + inProgressCount;

    // In Progress sub-zone (shown at top)
    let inProgressHtml = '';
    if (inProgressState) {
      const cards = inProgressState.tasks.map((t) => this.buildCard(t)).join('\n');
      const empty = inProgressState.tasks.length === 0 ? '<div class="empty-state">No tasks</div>' : '';
      const showMore = inProgressState.hasMore
        ? `<div class="show-more" data-action="showAll" data-state-name="In Progress">Showing ${inProgressState.tasks.length} of ${inProgressCount} — Show all</div>`
        : '';
      inProgressHtml = `
        <div class="sub-zone" data-state-name="In Progress">
          <div class="sub-zone-header">
            <span class="sub-zone-title">In Progress</span>
            <span class="count-badge">${inProgressCount}</span>
          </div>
          ${cards}${empty}${showMore}
        </div>`;
    }

    // Next sub-zone
    let nextHtml = '';
    if (nextState) {
      const cards = nextState.tasks.map((t) => this.buildCard(t)).join('\n');
      const empty = nextState.tasks.length === 0 ? '<div class="empty-state">No tasks</div>' : '';
      const showMore = nextState.hasMore
        ? `<div class="show-more" data-action="showAll" data-state-name="Next">Showing ${nextState.tasks.length} of ${nextCount} — Show all</div>`
        : '';
      nextHtml = `
        <div class="sub-zone" data-state-name="Next">
          <div class="sub-zone-header">
            <span class="sub-zone-title">Next</span>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="count-badge">${nextCount}</span>
              <button class="add-btn" data-action="addTask" data-state-name="Next" title="Add task to Next">+</button>
            </div>
          </div>
          ${cards}${empty}${showMore}
        </div>`;
    }

    return `
      <div class="kanban-column">
        <div class="column-header">
          <span class="column-title">Active</span>
          <span class="count-badge">${totalActive}</span>
        </div>
        ${inProgressHtml}
        ${nextHtml}
      </div>
    `;
  }

  /** Completed column: Done + Rejected merged */
  private buildCompletedColumn(doneState?: StateViewData, rejectedState?: StateViewData): string {
    const doneCount = doneState?.totalCount ?? 0;
    const rejectedCount = rejectedState?.totalCount ?? 0;
    const totalCompleted = doneCount + rejectedCount;
    const isExpanded = this.showAllForState.has('Done') || this.showAllForState.has('Rejected');

    let innerContent: string;

    if (isExpanded) {
      // Show Done and Rejected as sub-zones with cards
      let doneHtml = '';
      if (doneState) {
        const cards = doneState.tasks.map((t) => this.buildCard(t)).join('\n');
        const empty = doneState.tasks.length === 0 ? '<div class="empty-state">No tasks</div>' : '';
        doneHtml = `
          <div class="sub-zone" data-state-name="Done">
            <div class="sub-zone-header">
              <span class="sub-zone-title">Done</span>
              <span class="count-badge">${doneCount}</span>
            </div>
            ${cards}${empty}
          </div>`;
      }

      let rejectedHtml = '';
      if (rejectedState) {
        const cards = rejectedState.tasks.map((t) => this.buildCard(t)).join('\n');
        const empty = rejectedState.tasks.length === 0 ? '<div class="empty-state">No tasks</div>' : '';
        rejectedHtml = `
          <div class="sub-zone" data-state-name="Rejected">
            <div class="sub-zone-header">
              <span class="sub-zone-title">Rejected</span>
              <span class="count-badge">${rejectedCount}</span>
            </div>
            ${cards}${empty}
          </div>`;
      }

      innerContent = `${doneHtml}${rejectedHtml}`;
    } else {
      // Collapsed: show drop zones and a button
      const showButton = totalCompleted > 0
        ? `<button class="show-collapsed-btn" data-action="showCompleted">Show ${totalCompleted} completed tasks</button>`
        : '';

      innerContent = `
        <div class="sub-zone" data-state-name="Done">
          <div class="sub-zone-header">
            <span class="sub-zone-title">Done</span>
            <span class="count-badge">${doneCount}</span>
          </div>
        </div>
        <div class="sub-zone" data-state-name="Rejected">
          <div class="sub-zone-header">
            <span class="sub-zone-title">Rejected</span>
            <span class="count-badge">${rejectedCount}</span>
          </div>
        </div>
        ${showButton}`;
    }

    return `
      <div class="kanban-column">
        <div class="column-header">
          <span class="column-title">Completed</span>
          <span class="count-badge">${totalCompleted}</span>
        </div>
        ${innerContent}
      </div>
    `;
  }

  private buildCard(task: TaskViewItem): string {
    const tags = task.tags.map((t) => `<span class="tag">${this.escapeHtml(t)}</span>`).join('');

    const metaParts: string[] = [];
    if (task.assignee) {
      metaParts.push(`<span style="font-size:0.8em;color:var(--muted-fg);">&#128100; ${this.escapeHtml(task.assignee)}</span>`);
    }
    if (task.updatedAt) {
      metaParts.push(`<span style="font-size:0.8em;color:var(--muted-fg);">&#128339; ${this.escapeHtml(task.updatedAt)}</span>`);
    }
    const metaHtml = metaParts.length > 0
      ? `<div style="display:flex;gap:6px;margin-top:3px;flex-wrap:wrap;">${metaParts.join('')}</div>`
      : '';

    return `
      <div class="kanban-card" draggable="true" data-task-id="${task.id}">
        <div class="card-top">
          <div class="priority-bar priority-${task.priority}"></div>
          <div style="flex:1; min-width:0;">
            <div class="task-header">
              <span class="task-id">${task.id}</span>
              <span class="task-title" data-action="open" data-task-id="${task.id}" style="cursor:pointer;">${this.escapeHtml(task.title)}</span>
            </div>
            ${tags ? `<div class="task-tags">${tags}</div>` : ''}
            ${metaHtml}
          </div>
        </div>
        <div class="card-move-row">
          <button class="action-btn danger" data-action="delete" data-task-id="${task.id}" style="font-size:0.75em;" title="Delete">&#10005;</button>
        </div>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private dispose(): void {
    this.storeDisposable.dispose();
    KanbanPanel.instance = undefined;
  }
}
