import { Task, Priority, isPriority } from '../model/task.js';

const TASK_HEADING_RE = /^## ([A-Z]+-\d+):\s*(.+)$/;
const PRIORITY_RE = /^\*\*Priority:\*\*\s*(\S+)/;
const TAGS_RE = /^\*\*Tags?:\*\*\s*(.+)/;
const EPIC_RE = /^\*\*Epic:\*\*\s*(.+)/;
const SEPARATOR_RE = /^---\s*$/;

export function parseTasks(content: string): Task[] {
  const lines = content.split('\n');
  const tasks: Task[] = [];
  let current: Partial<Task> | null = null;
  let descriptionLines: string[] = [];
  let inMetadata = true;

  function flushTask() {
    if (current?.id && current?.title) {
      tasks.push({
        id: current.id,
        title: current.title,
        description: descriptionLines.join('\n').trim(),
        priority: current.priority ?? Priority.P4,
        tags: current.tags ?? [],
        epic: current.epic,
      });
    }
    current = null;
    descriptionLines = [];
    inMetadata = true;
  }

  for (const line of lines) {
    const headingMatch = line.match(TASK_HEADING_RE);
    if (headingMatch) {
      flushTask();
      current = {
        id: headingMatch[1],
        title: headingMatch[2].trim(),
        tags: [],
      };
      inMetadata = true;
      continue;
    }

    if (!current) {
      continue;
    }

    if (SEPARATOR_RE.test(line)) {
      flushTask();
      continue;
    }

    if (inMetadata) {
      // Support pipe-separated metadata on a single line
      const segments = line.includes('|') ? line.split('|').map((s) => s.trim()) : [line];
      let matchedAny = false;

      for (const segment of segments) {
        const priorityMatch = segment.match(PRIORITY_RE);
        if (priorityMatch) {
          const val = priorityMatch[1].trim();
          current.priority = isPriority(val) ? val : Priority.P4;
          matchedAny = true;
          continue;
        }

        const tagsMatch = segment.match(TAGS_RE);
        if (tagsMatch) {
          current.tags = tagsMatch[1]
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
          matchedAny = true;
          continue;
        }

        const epicMatch = segment.match(EPIC_RE);
        if (epicMatch) {
          current.epic = epicMatch[1].trim();
          matchedAny = true;
          continue;
        }
      }

      if (matchedAny) {
        continue;
      }

      if (line.trim() === '') {
        inMetadata = false;
        continue;
      }

      // Unknown metadata line — treat as start of description
      inMetadata = false;
      descriptionLines.push(line);
    } else {
      descriptionLines.push(line);
    }
  }

  flushTask();
  return tasks;
}

export function findTaskLineNumber(content: string, taskId: string): number {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(TASK_HEADING_RE);
    if (match && match[1] === taskId) {
      return i + 1; // 1-based
    }
  }
  return 1;
}
