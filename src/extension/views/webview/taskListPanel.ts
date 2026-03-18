import * as vscode from 'vscode';
import { TaskStore } from '../../../core/store/taskStore.js';
import { ConfigManager } from '../../../core/config/configManager.js';
import { filterAndPaginate } from '../../../core/filter/taskFilter.js';
import { TaskFilter, TaskViewData, StateViewData, TaskViewItem } from '../../../core/model/messages.js';
import { getWebviewHtml } from './webviewHelper.js';

export class TaskListPanel {
  private static instance: TaskListPanel | undefined;
  private panel: vscode.WebviewPanel;
  private filter: TaskFilter = {};
  private showAllForState: Set<string> = new Set();
  private storeDisposable: { dispose: () => void };

  private constructor(
    private taskStore: TaskStore,
    private configManager: ConfigManager,
  ) {
    this.panel = vscode.window.createWebviewPanel(
      'taskplanner.taskList',
      'Tasks: Filtered List',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: false },
    );

    this.panel.iconPath = new vscode.ThemeIcon('list-filter');

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
    if (TaskListPanel.instance) {
      TaskListPanel.instance.panel.reveal(vscode.ViewColumn.One);
      return;
    }
    TaskListPanel.instance = new TaskListPanel(taskStore, configManager);
  }

  private handleMessage(msg: { type: string; [key: string]: unknown }): void {
    switch (msg.type) {
      case 'ready':
        this.update();
        break;
      case 'applyFilter':
        this.filter = (msg.filter as TaskFilter) ?? {};
        this.showAllForState.clear();
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
    }
  }

  private update(): void {
    const config = this.configManager.get();
    const states = config.states;
    const sortBy = config.sortBy ?? 'priority';
    const allTasks = this.taskStore.getAllTasks();
    const data = filterAndPaginate(allTasks, states, this.filter, undefined, sortBy);

    // Apply per-state "show all" overrides
    if (this.showAllForState.size > 0) {
      const unlimitedData = filterAndPaginate(allTasks, states, this.filter, null, sortBy);
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
    const states = this.configManager.get().states;
    const stateOptions = states.map((s) => {
      const selected = this.filter.status === s.name ? ' selected' : '';
      return `<option value="${s.name}"${selected}>${s.name}</option>`;
    });

    const filterBar = `
      <div style="display:flex; gap:8px; align-items:center; margin-bottom:16px; flex-wrap:wrap;">
        <select id="statusFilter">
          <option value=""${!this.filter.status ? ' selected' : ''}>All statuses</option>
          ${stateOptions.join('\n')}
        </select>
        <input type="text" id="queryFilter" placeholder="Search by ID or title..."
          value="${this.escapeAttr(this.filter.query ?? '')}" style="flex:1; min-width:180px;" />
      </div>
    `;

    const sections = data.states
      .map((s) => this.buildStateSection(s, states))
      .join('\n');

    const body = `
      <h1>Filtered Task List</h1>
      ${filterBar}
      <div id="taskSections">${sections}</div>
    `;

    const script = `
      const statusEl = document.getElementById('statusFilter');
      const queryEl = document.getElementById('queryFilter');

      let debounceTimer;
      function applyFilter() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          vscode.postMessage({
            type: 'applyFilter',
            filter: {
              status: statusEl.value || undefined,
              query: queryEl.value || undefined
            }
          });
        }, 200);
      }

      statusEl.addEventListener('change', applyFilter);
      queryEl.addEventListener('input', applyFilter);

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
          vscode.postMessage({ type: 'showAll', stateName: btn.dataset.stateName });
        }
      });
    `;

    return getWebviewHtml(this.panel.webview, 'Tasks: Filtered List', body, script);
  }

  private buildStateSection(state: StateViewData, allStates: { name: string }[]): string {
    if (state.tasks.length === 0 && !this.filter.query) {
      return `
        <div style="margin-bottom:20px;">
          <h2>${state.name} <span class="count-badge">(0)</span></h2>
          <div class="empty-state">No tasks</div>
        </div>
      `;
    }

    if (state.tasks.length === 0) {
      return '';
    }

    const cards = state.tasks.map((t) => this.buildTaskCard(t, state.name, allStates)).join('\n');
    const showMore = state.hasMore
      ? `<div class="show-more" data-action="showAll" data-state-name="${state.name}">Showing ${state.tasks.length} of ${state.totalCount} — Show all</div>`
      : '';

    return `
      <div style="margin-bottom:20px;">
        <h2>${state.name} <span class="count-badge">(${state.totalCount})</span></h2>
        ${cards}
        ${showMore}
      </div>
    `;
  }

  private buildTaskCard(task: TaskViewItem, currentState: string, allStates: { name: string }[]): string {
    const tags = task.tags.map((t) => `<span class="tag">${this.escapeHtml(t)}</span>`).join('');
    const otherStates = allStates
      .filter((s) => s.name !== currentState)
      .map((s) => `<option value="${s.name}">${s.name}</option>`)
      .join('');

    return `
      <div class="task-card">
        <div class="priority-bar priority-${task.priority}"></div>
        <div class="task-content" data-action="open" data-task-id="${task.id}" style="cursor:pointer;">
          <div class="task-header">
            <span class="task-id">${task.id}</span>
            <span class="task-title">${this.escapeHtml(task.title)}</span>
          </div>
          ${tags ? `<div class="task-tags">${tags}</div>` : ''}
        </div>
        <div class="task-actions">
          <select title="Move to..." style="font-size:0.8em;">
            <option value="">Move to...</option>
            ${otherStates}
          </select>
          <button class="action-btn" data-action="move" data-task-id="${task.id}" title="Move">Go</button>
          <button class="action-btn danger" data-action="delete" data-task-id="${task.id}" title="Delete">✕</button>
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

  private dispose(): void {
    this.storeDisposable.dispose();
    TaskListPanel.instance = undefined;
  }
}
