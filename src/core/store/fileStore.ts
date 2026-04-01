import * as fs from 'fs';
import * as path from 'path';
import { Task } from '../model/task.js';
import { TaskState } from '../model/state.js';
import { TaskPlannerConfig } from '../model/config.js';
import { ParseResult } from '../model/parseResult.js';
import { parseTasks } from '../parser/taskParser.js';
import { serializeStateFile } from '../parser/taskSerializer.js';

export class FileStore {
  constructor(private tasksDir: string) {}

  readState(state: TaskState): ParseResult {
    const filePath = path.join(this.tasksDir, state.fileName);
    if (!fs.existsSync(filePath)) {
      return { tasks: [], warnings: [] };
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return parseTasks(content);
  }

  writeState(state: TaskState, tasks: Task[]): void {
    const filePath = path.join(this.tasksDir, state.fileName);
    const content = serializeStateFile(state.name, tasks);
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  readAllStates(config: TaskPlannerConfig): Map<string, ParseResult> {
    const result = new Map<string, ParseResult>();
    for (const state of config.states) {
      result.set(state.name, this.readState(state));
    }
    return result;
  }

  ensureDirectory(): void {
    if (!fs.existsSync(this.tasksDir)) {
      fs.mkdirSync(this.tasksDir, { recursive: true });
    }
  }

  initializeStateFiles(config: TaskPlannerConfig): void {
    this.ensureDirectory();
    for (const state of config.states) {
      const filePath = path.join(this.tasksDir, state.fileName);
      if (!fs.existsSync(filePath)) {
        const content = serializeStateFile(state.name, []);
        fs.writeFileSync(filePath, content, 'utf-8');
      }
    }
  }

  getStateFilePath(state: TaskState): string {
    return path.join(this.tasksDir, state.fileName);
  }

  readRawContent(state: TaskState): string {
    const filePath = path.join(this.tasksDir, state.fileName);
    if (!fs.existsSync(filePath)) {
      return '';
    }
    return fs.readFileSync(filePath, 'utf-8');
  }
}
