import { describe, it, expect } from 'vitest';
import { filterAndPaginate } from '../../core/filter/taskFilter.js';
import { Task, Priority } from '../../core/model/task.js';
import { TaskState } from '../../core/model/state.js';

const states: TaskState[] = [
  { name: 'Backlog', fileName: 'BACKLOG.md', order: 0 },
  { name: 'In Progress', fileName: 'IN_PROGRESS.md', order: 1 },
  { name: 'Done', fileName: 'DONE.md', order: 2 },
];

function makeTask(id: string, title: string, priority: Priority = Priority.P3): Task {
  return { id, title, description: '', priority, tags: [] };
}

function makeTasks(count: number, prefix: string): Task[] {
  return Array.from({ length: count }, (_, i) =>
    makeTask(`TASK-${prefix}${String(i + 1).padStart(3, '0')}`, `Task ${prefix} ${i + 1}`),
  );
}

describe('filterAndPaginate', () => {
  it('returns all states with no filter', () => {
    const tasksByState = new Map<string, Task[]>([
      ['Backlog', [makeTask('TASK-001', 'First')]],
      ['In Progress', [makeTask('TASK-002', 'Second')]],
      ['Done', []],
    ]);

    const result = filterAndPaginate(tasksByState, states);
    expect(result.states).toHaveLength(3);
    expect(result.states[0].tasks).toHaveLength(1);
    expect(result.states[1].tasks).toHaveLength(1);
    expect(result.states[2].tasks).toHaveLength(0);
  });

  it('filters by status', () => {
    const tasksByState = new Map<string, Task[]>([
      ['Backlog', [makeTask('TASK-001', 'First')]],
      ['In Progress', [makeTask('TASK-002', 'Second')]],
      ['Done', []],
    ]);

    const result = filterAndPaginate(tasksByState, states, { status: 'Backlog' });
    expect(result.states).toHaveLength(1);
    expect(result.states[0].name).toBe('Backlog');
  });

  it('filters by query matching ID', () => {
    const tasksByState = new Map<string, Task[]>([
      ['Backlog', [makeTask('TASK-001', 'Alpha'), makeTask('TASK-002', 'Beta')]],
      ['In Progress', []],
      ['Done', []],
    ]);

    const result = filterAndPaginate(tasksByState, states, { query: '001' });
    expect(result.states[0].tasks).toHaveLength(1);
    expect(result.states[0].tasks[0].id).toBe('TASK-001');
  });

  it('filters by query matching title (case-insensitive)', () => {
    const tasksByState = new Map<string, Task[]>([
      ['Backlog', [makeTask('TASK-001', 'Fix login bug'), makeTask('TASK-002', 'Add feature')]],
      ['In Progress', []],
      ['Done', []],
    ]);

    const result = filterAndPaginate(tasksByState, states, { query: 'LOGIN' });
    expect(result.states[0].tasks).toHaveLength(1);
    expect(result.states[0].tasks[0].title).toBe('Fix login bug');
  });

  it('applies 50-task limit and sets hasMore', () => {
    const tasksByState = new Map<string, Task[]>([
      ['Backlog', makeTasks(60, 'B')],
      ['In Progress', []],
      ['Done', []],
    ]);

    const result = filterAndPaginate(tasksByState, states);
    expect(result.states[0].tasks).toHaveLength(50);
    expect(result.states[0].totalCount).toBe(60);
    expect(result.states[0].hasMore).toBe(true);
  });

  it('returns all tasks when limit is null (show all)', () => {
    const tasksByState = new Map<string, Task[]>([
      ['Backlog', makeTasks(60, 'B')],
      ['In Progress', []],
      ['Done', []],
    ]);

    const result = filterAndPaginate(tasksByState, states, undefined, null);
    expect(result.states[0].tasks).toHaveLength(60);
    expect(result.states[0].hasMore).toBe(false);
  });

  it('combines status and query filters', () => {
    const tasksByState = new Map<string, Task[]>([
      ['Backlog', [makeTask('TASK-001', 'Fix bug'), makeTask('TASK-002', 'Add feature')]],
      ['In Progress', [makeTask('TASK-003', 'Fix crash')]],
      ['Done', []],
    ]);

    const result = filterAndPaginate(tasksByState, states, { status: 'Backlog', query: 'fix' });
    expect(result.states).toHaveLength(1);
    expect(result.states[0].tasks).toHaveLength(1);
    expect(result.states[0].tasks[0].id).toBe('TASK-001');
  });
});
