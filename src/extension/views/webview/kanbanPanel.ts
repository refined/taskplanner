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

    this.update();
  }

  static createOrShow(taskStore: TaskStore, configManager: ConfigManager): void {
    if (KanbanPanel.instance) {
      KanbanPanel.instance.panel.reveal(vscode.ViewColumn.One);
      return;
    }
    KanbanPanel.instance = new KanbanPanel(taskStore, configManager);
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
      case 'moveTask':
        this.taskStore.moveTask(msg.taskId as string, msg.targetState as string);
        break;
      case 'deleteTask':
        this.taskStore.deleteTask(msg.taskId as string);
        break;
      case 'openTask':
        vscode.commands.executeCommand('taskplanner.openTask', msg.taskId as string);
        break;
      case 'addTask':
        vscode.commands.executeCommand('taskplanner.createTaskInState', msg.stateName as string);
        break;
    }
  }

  private update(): void {
    const states = this.configManager.get().states;
    const allTasks = this.taskStore.getAllTasks();
    const data = filterAndPaginate(allTasks, states);

    // Apply per-state "show all"
    if (this.showAllForState.size > 0) {
      const unlimitedData = filterAndPaginate(allTasks, states, undefined, null);
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
    const columns = data.states.map((s) => this.buildColumn(s)).join('\n');

    const body = `
      <h1>Kanban Board</h1>
      <div class="kanban-board">${columns}</div>
    `;

    const script = `
      // Drag and drop
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
        document.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('drag-over'));
        draggedTaskId = null;
      });

      document.addEventListener('dragover', (e) => {
        const col = e.target.closest('.kanban-column');
        if (!col) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('drag-over'));
        col.classList.add('drag-over');
      });

      document.addEventListener('dragleave', (e) => {
        const col = e.target.closest('.kanban-column');
        if (col && !col.contains(e.relatedTarget)) {
          col.classList.remove('drag-over');
        }
      });

      document.addEventListener('drop', (e) => {
        e.preventDefault();
        const col = e.target.closest('.kanban-column');
        if (!col || !draggedTaskId) return;
        col.classList.remove('drag-over');
        const targetState = col.dataset.stateName;
        vscode.postMessage({ type: 'moveTask', taskId: draggedTaskId, targetState });
        draggedTaskId = null;
      });

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
        } else if (action === 'addTask') {
          vscode.postMessage({ type: 'addTask', stateName: btn.dataset.stateName });
        }
      });
    `;

    const kanbanStyles = `
      <style>
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
        .kanban-column.drag-over {
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
          align-items: center;
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
      </style>
    `;

    const html = getWebviewHtml(this.panel.webview, 'Tasks: Kanban Board', kanbanStyles + body, script);
    return html;
  }

  private buildColumn(state: StateViewData): string {
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

  private buildCard(task: TaskViewItem): string {
    const tags = task.tags.map((t) => `<span class="tag">${this.escapeHtml(t)}</span>`).join('');

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
          </div>
        </div>
        <div class="card-move-row">
          <button class="action-btn danger" data-action="delete" data-task-id="${task.id}" style="font-size:0.75em;" title="Delete">✕</button>
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
