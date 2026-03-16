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

export function filterAndPaginate(
  tasksByState: Map<string, Task[]>,
  states: TaskState[],
  filter?: TaskFilter,
  limit: number | null = DEFAULT_LIMIT,
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
