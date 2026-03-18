import { Task } from '../model/task.js';
import { TaskState } from '../model/state.js';
import { TaskFilter, TaskViewData, TaskViewItem, StateViewData } from '../model/messages.js';

const DEFAULT_LIMIT = 50;

function taskToViewItem(task: Task): TaskViewItem {
  return {
    id: task.id,
    title: task.title,
    priority: task.priority,
    tags: [...task.tags],
    epic: task.epic,
    description: task.description,
  };
}

function matchesQuery(task: Task, query: string): boolean {
  const q = query.toLowerCase();
  return task.id.toLowerCase().includes(q) || task.title.toLowerCase().includes(q);
}

const PRIORITY_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 };

export function sortTasks(tasks: Task[], sortBy: 'priority' | 'name' | 'id'): Task[] {
  const sorted = [...tasks];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'priority': {
        const diff = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
        return diff !== 0 ? diff : a.title.localeCompare(b.title);
      }
      case 'name':
        return a.title.localeCompare(b.title);
      case 'id':
        return a.id.localeCompare(b.id);
    }
  });
  return sorted;
}

export function filterAndPaginate(
  tasksByState: Map<string, Task[]>,
  states: TaskState[],
  filter?: TaskFilter,
  limit: number | null = DEFAULT_LIMIT,
  sortBy: 'priority' | 'name' | 'id' = 'priority',
): TaskViewData {
  const result: StateViewData[] = [];

  for (const state of states) {
    // Skip states that don't match the status filter
    if (filter?.status && filter.status !== state.name) {
      continue;
    }

    let tasks = tasksByState.get(state.name) ?? [];

    // Apply query filter
    if (filter?.query) {
      tasks = tasks.filter((t) => matchesQuery(t, filter.query!));
    }

    // Apply sorting
    tasks = sortTasks(tasks, sortBy);

    const totalCount = tasks.length;
    const hasMore = limit !== null && totalCount > limit;
    const sliced = limit !== null ? tasks.slice(0, limit) : tasks;

    result.push({
      name: state.name,
      tasks: sliced.map(taskToViewItem),
      totalCount,
      hasMore,
    });
  }

  return { states: result, filter };
}
