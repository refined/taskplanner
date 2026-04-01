import { Task } from './task.js';

export interface ParseWarning {
  line: number;
  message: string;
}

export interface ParseResult {
  tasks: Task[];
  warnings: ParseWarning[];
}
