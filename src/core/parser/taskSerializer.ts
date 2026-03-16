import { Task } from '../model/task.js';

export function serializeTask(task: Task): string {
  const lines: string[] = [];

  lines.push(`## ${task.id}: ${task.title}`);

  const metaParts: string[] = [`**Priority:** ${task.priority}`];
  if (task.tags.length > 0) {
    const label = task.tags.length === 1 ? 'Tag' : 'Tags';
    metaParts.push(`**${label}:** ${task.tags.join(', ')}`);
  }
  if (task.epic) {
    metaParts.push(`**Epic:** ${task.epic}`);
  }
  lines.push(metaParts.join(' | '));

  if (task.description.trim()) {
    lines.push('');
    lines.push(task.description.trim());
  }

  return lines.join('\n');
}

export function serializeStateFile(stateName: string, tasks: Task[]): string {
  const lines: string[] = [`# ${stateName}`, ''];

  if (tasks.length === 0) {
    return lines.join('\n');
  }

  for (let i = 0; i < tasks.length; i++) {
    lines.push(serializeTask(tasks[i]));
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}
