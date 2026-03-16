import { TaskState, DEFAULT_STATES } from './state.js';

export interface TaskPlannerConfig {
  version: number;
  idPrefix: string;
  nextId: number;
  states: TaskState[];
  priorities: string[];
  tags: string[];
  insertPosition: 'top' | 'bottom';
}

export function createDefaultConfig(): TaskPlannerConfig {
  return {
    version: 1,
    idPrefix: 'TASK',
    nextId: 1,
    states: [...DEFAULT_STATES],
    priorities: ['P1', 'P2', 'P3', 'P4'],
    tags: [],
    insertPosition: 'top',
  };
}
