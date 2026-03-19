import { Task } from '../model/task.js';
import { TaskState } from '../model/state.js';
import { TaskPlannerConfig } from '../model/config.js';
import { ConfigManager } from '../config/configManager.js';
import { FileStore } from './fileStore.js';
import { IdGenerator } from '../id/idGenerator.js';

export type TaskStoreListener = () => void;

export class TaskStore {
  private tasksByState: Map<string, Task[]> = new Map();
  private listeners: TaskStoreListener[] = [];
  private fileStore: FileStore;
  private idGenerator: IdGenerator;

  constructor(
    private configManager: ConfigManager,
    fileStore: FileStore,
  ) {
    this.fileStore = fileStore;
    this.idGenerator = new IdGenerator(configManager);
  }

  get config(): TaskPlannerConfig {
    return this.configManager.get();
  }

  reload(): void {
    this.tasksByState = this.fileStore.readAllStates(this.config);
    this.notifyListeners();
  }

  reloadState(stateName: string): void {
    const state = this.findState(stateName);
    if (state) {
      this.tasksByState.set(stateName, this.fileStore.readState(state));
      this.notifyListeners();
    }
  }

  getTasksByState(stateName: string): Task[] {
    return this.tasksByState.get(stateName) ?? [];
  }

  getAllTasks(): Map<string, Task[]> {
    return new Map(this.tasksByState);
  }

  findTask(taskId: string): { task: Task; stateName: string } | null {
    for (const [stateName, tasks] of this.tasksByState) {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        return { task, stateName };
      }
    }
    return null;
  }

  private static now(): string {
    return new Date().toISOString().replace('T', ' ').slice(0, 16);
  }

  createTask(task: Omit<Task, 'id'>, stateName: string): Task {
    const state = this.findState(stateName);
    if (!state) {
      throw new Error(`Unknown state: ${stateName}`);
    }

    const id = this.idGenerator.next();
    const newTask: Task = { ...task, id, updatedAt: TaskStore.now() };

    const tasks = this.getTasksByState(stateName);
    if (this.config.insertPosition === 'top') {
      tasks.unshift(newTask);
    } else {
      tasks.push(newTask);
    }

    this.tasksByState.set(stateName, tasks);
    this.fileStore.writeState(state, tasks);
    this.notifyListeners();
    return newTask;
  }

  moveTask(taskId: string, targetStateName: string): Task | null {
    const found = this.findTask(taskId);
    if (!found) {
      return null;
    }

    const sourceState = this.findState(found.stateName);
    const targetState = this.findState(targetStateName);
    if (!sourceState || !targetState) {
      return null;
    }

    // Remove from source
    const sourceTasks = this.getTasksByState(found.stateName).filter((t) => t.id !== taskId);
    this.tasksByState.set(found.stateName, sourceTasks);
    this.fileStore.writeState(sourceState, sourceTasks);

    // Add to target with updated timestamp
    found.task.updatedAt = TaskStore.now();
    const targetTasks = this.getTasksByState(targetStateName);
    if (this.config.insertPosition === 'top') {
      targetTasks.unshift(found.task);
    } else {
      targetTasks.push(found.task);
    }
    this.tasksByState.set(targetStateName, targetTasks);
    this.fileStore.writeState(targetState, targetTasks);

    this.notifyListeners();
    return found.task;
  }

  deleteTask(taskId: string): boolean {
    const found = this.findTask(taskId);
    if (!found) {
      return false;
    }

    const state = this.findState(found.stateName);
    if (!state) {
      return false;
    }

    const tasks = this.getTasksByState(found.stateName).filter((t) => t.id !== taskId);
    this.tasksByState.set(found.stateName, tasks);
    this.fileStore.writeState(state, tasks);
    this.notifyListeners();
    return true;
  }

  updateTask(taskId: string, updates: Partial<Omit<Task, 'id'>>): Task | null {
    const found = this.findTask(taskId);
    if (!found) {
      return null;
    }

    const state = this.findState(found.stateName);
    if (!state) {
      return null;
    }

    const updatedTask: Task = { ...found.task, ...updates, id: taskId, updatedAt: TaskStore.now() };
    const tasks = this.getTasksByState(found.stateName).map((t) =>
      t.id === taskId ? updatedTask : t,
    );
    this.tasksByState.set(found.stateName, tasks);
    this.fileStore.writeState(state, tasks);
    this.notifyListeners();
    return updatedTask;
  }

  reorderTask(taskId: string, direction: 'up' | 'down'): boolean {
    const found = this.findTask(taskId);
    if (!found) {
      return false;
    }

    const state = this.findState(found.stateName);
    if (!state) {
      return false;
    }

    const tasks = [...this.getTasksByState(found.stateName)];
    const index = tasks.findIndex((t) => t.id === taskId);
    if (index === -1) {
      return false;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= tasks.length) {
      return false;
    }

    [tasks[index], tasks[newIndex]] = [tasks[newIndex], tasks[index]];
    this.tasksByState.set(found.stateName, tasks);
    this.fileStore.writeState(state, tasks);
    this.notifyListeners();
    return true;
  }

  onDidChange(listener: TaskStoreListener): { dispose: () => void } {
    this.listeners.push(listener);
    return {
      dispose: () => {
        const index = this.listeners.indexOf(listener);
        if (index >= 0) {
          this.listeners.splice(index, 1);
        }
      },
    };
  }

  private findState(stateName: string): TaskState | undefined {
    return this.config.states.find((s) => s.name === stateName);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
