import { App } from '@modelcontextprotocol/ext-apps';

interface TaskViewItem {
  id: string;
  title: string;
  priority: string;
  tags: string[];
  assignee?: string;
  updatedAt?: string;
  description: string;
}

interface StateViewData {
  name: string;
  tasks: TaskViewItem[];
  totalCount: number;
  hasMore: boolean;
}

interface TaskViewData {
  states: StateViewData[];
}

interface ToolTextResult {
  content?: { type: string; text?: string }[];
  isError?: boolean;
}

interface BoardDataArgs {
  [key: string]: unknown;
  query?: string;
  include_completed?: boolean;
  limit?: number | null;
}

const app = new App({ name: 'TaskPlanner Board', version: '1.0.0' });

const root = document.getElementById('root')!;
const drawer = document.getElementById('drawer') as HTMLDivElement;

let currentData: TaskViewData | null = null;
let refreshInFlight = false;
let expandedAllStates = false;
let expandedCompleted = false;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractText(result: ToolTextResult | undefined): string {
  if (!result?.content) return '';
  const block = result.content.find((c) => c.type === 'text');
  return block?.text ?? '';
}

function renderError(msg: string): void {
  root.dataset.state = 'error';
  root.innerHTML = `<div class="error-banner">${escapeHtml(msg)}</div>`;
}

function priorityClass(p: string): string {
  const v = (p || '').toLowerCase();
  return ['p0', 'p1', 'p2', 'p3', 'p4'].includes(v) ? v : 'p4';
}

function renderCard(task: TaskViewItem, stateName: string): string {
  const tags = task.tags
    .slice(0, 4)
    .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
    .join('');
  const assignee = task.assignee
    ? `<span class="assignee">@${escapeHtml(task.assignee)}</span>`
    : '';
  return `
    <div class="card" draggable="true"
         data-task-id="${escapeHtml(task.id)}"
         data-state="${escapeHtml(stateName)}">
      <div class="card-title">${escapeHtml(task.title)}</div>
      <div class="card-meta">
        <span class="card-id">${escapeHtml(task.id)}</span>
        <span class="priority ${priorityClass(task.priority)}">${escapeHtml(task.priority)}</span>
        ${assignee}
        ${tags}
      </div>
    </div>`;
}

function renderColumn(state: StateViewData): string {
  const cards =
    state.tasks.length === 0
      ? '<div class="empty">No tasks</div>'
      : state.tasks.map((t) => renderCard(t, state.name)).join('');
  const hiddenCount = Math.max(0, state.totalCount - state.tasks.length);
  const more = hiddenCount > 0 && !expandedAllStates
    ? `<button class="more-pill show-more-btn" type="button" data-state="${escapeHtml(state.name)}">Show ${hiddenCount} more</button>`
    : '';
  return `
    <div class="column" data-state="${escapeHtml(state.name)}">
      <div class="column-header">
        <span>${escapeHtml(state.name)}</span>
        <span class="column-count">${state.totalCount}</span>
      </div>
      ${cards}
      ${more}
    </div>`;
}

function renderBoard(data: TaskViewData): void {
  currentData = data;
  root.dataset.state = 'ready';
  const columns = data.states.map(renderColumn).join('');
  root.innerHTML = `<div class="board">${columns}</div>`;
  wireDragAndDrop();
  wireCardClicks();
  wireShowMore();
}

function wireDragAndDrop(): void {
  const cards = root.querySelectorAll<HTMLElement>('.card');
  cards.forEach((card) => {
    card.addEventListener('dragstart', (e) => {
      card.classList.add('dragging');
      const taskId = card.dataset.taskId ?? '';
      const fromState = card.dataset.state ?? '';
      e.dataTransfer?.setData('application/x-taskplanner', JSON.stringify({ taskId, fromState }));
      e.dataTransfer!.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
  });

  const columns = root.querySelectorAll<HTMLElement>('.column');
  columns.forEach((col) => {
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      col.classList.add('drop-target');
      e.dataTransfer!.dropEffect = 'move';
    });
    col.addEventListener('dragleave', (e) => {
      if (!col.contains(e.relatedTarget as Node)) {
        col.classList.remove('drop-target');
      }
    });
    col.addEventListener('drop', async (e) => {
      e.preventDefault();
      col.classList.remove('drop-target');
      const raw = e.dataTransfer?.getData('application/x-taskplanner');
      if (!raw) return;
      const { taskId, fromState } = JSON.parse(raw) as { taskId: string; fromState: string };
      const targetState = col.dataset.state ?? '';
      if (!taskId || !targetState || targetState === fromState) return;
      await moveTask(taskId, targetState);
    });
  });
}

function wireCardClicks(): void {
  const cards = root.querySelectorAll<HTMLElement>('.card');
  cards.forEach((card) => {
    let didDrag = false;
    card.addEventListener('dragstart', () => {
      didDrag = true;
    });
    card.addEventListener('dragend', () => {
      setTimeout(() => {
        didDrag = false;
      }, 0);
    });
    card.addEventListener('click', () => {
      if (didDrag) return;
      const id = card.dataset.taskId;
      if (id) openDrawer(id);
    });
  });
}

async function moveTask(taskId: string, targetState: string): Promise<void> {
  try {
    await app.callServerTool({
      name: 'taskplanner_move',
      arguments: { task_id: taskId, target_state: targetState },
    });
    await refreshBoard();
  } catch (err) {
    renderError(`Move failed: ${(err as Error).message ?? String(err)}`);
  }
}

async function refreshBoard(): Promise<void> {
  if (refreshInFlight) return;
  refreshInFlight = true;
  try {
    const args: BoardDataArgs = {};
    if (expandedAllStates) args.limit = null;
    if (expandedCompleted) args.include_completed = true;
    const result = await app.callServerTool({
      name: 'taskplanner_board_data',
      arguments: args,
    });
    if (result.isError) {
      renderError(`Could not load board: ${extractText(result) || 'unknown error'}`);
      return;
    }
    const text = extractText(result);
    if (!text) {
      renderError('Board data response was empty.');
      return;
    }
    const parsed = JSON.parse(text) as TaskViewData;
    renderBoard(parsed);
  } catch (err) {
    renderError(`Could not load board: ${(err as Error).message ?? String(err)}`);
  } finally {
    refreshInFlight = false;
  }
}

function wireShowMore(): void {
  const buttons = root.querySelectorAll<HTMLButtonElement>('.show-more-btn');
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      expandedAllStates = true;
      const stateName = button.dataset.state ?? '';
      if (stateName === 'Done' || stateName === 'Rejected') {
        expandedCompleted = true;
      }
      void refreshBoard();
    });
  });
}

async function openDrawer(taskId: string): Promise<void> {
  drawer.hidden = false;
  drawer.setAttribute('aria-hidden', 'false');
  drawer.innerHTML = `<button class="drawer-close" aria-label="Close">&times;</button><div class="status-banner">Loading…</div>`;
  drawer.querySelector('.drawer-close')?.addEventListener('click', closeDrawer);
  try {
    const result = await app.callServerTool({
      name: 'taskplanner_get',
      arguments: { task_id: taskId },
    });
    const text = extractText(result);
    const task = findTaskInCurrent(taskId);
    const title = escapeHtml(task?.title ?? taskId);
    const priority = escapeHtml(task?.priority ?? '');
    const assignee = task?.assignee ? `<span class="assignee">@${escapeHtml(task.assignee)}</span>` : '';
    const tags = (task?.tags ?? [])
      .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
      .join('');
    drawer.innerHTML = `
      <button class="drawer-close" aria-label="Close">&times;</button>
      <h2 class="drawer-title">${title}</h2>
      <div class="drawer-meta">
        <span class="card-id">${escapeHtml(taskId)}</span>
        ${priority ? `<span class="priority ${priorityClass(priority)}">${priority}</span>` : ''}
        ${assignee}
        ${tags}
      </div>
      <div class="drawer-section-title">Details</div>
      <div class="drawer-body">${escapeHtml(text || '(no details)')}</div>`;
    drawer.querySelector('.drawer-close')?.addEventListener('click', closeDrawer);
  } catch (err) {
    drawer.innerHTML = `
      <button class="drawer-close" aria-label="Close">&times;</button>
      <div class="error-banner">Could not load task: ${escapeHtml((err as Error).message ?? String(err))}</div>`;
    drawer.querySelector('.drawer-close')?.addEventListener('click', closeDrawer);
  }
}

function closeDrawer(): void {
  drawer.hidden = true;
  drawer.setAttribute('aria-hidden', 'true');
  drawer.innerHTML = '';
}

function findTaskInCurrent(taskId: string): TaskViewItem | undefined {
  if (!currentData) return undefined;
  for (const state of currentData.states) {
    const t = state.tasks.find((task) => task.id === taskId);
    if (t) return t;
  }
  return undefined;
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !drawer.hidden) closeDrawer();
});

app.ontoolresult = () => {
  void refreshBoard();
};

void (async () => {
  try {
    await app.connect();
    await refreshBoard();
  } catch (err) {
    renderError(`Failed to connect to host: ${(err as Error).message ?? String(err)}`);
  }
})();
