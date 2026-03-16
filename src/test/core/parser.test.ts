import { describe, it, expect } from 'vitest';
import { parseTasks, findTaskLineNumber } from '../../core/parser/taskParser.js';
import { Priority } from '../../core/model/task.js';

describe('parseTasks', () => {
  it('parses a single task', () => {
    const content = `# Backlog

## TASK-001: Implement auth
**Priority:** P1
**Tags:** auth, backend

Build OAuth2 authentication.

---
`;
    const tasks = parseTasks(content);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toEqual({
      id: 'TASK-001',
      title: 'Implement auth',
      priority: Priority.P1,
      tags: ['auth', 'backend'],
      epic: undefined,
      description: 'Build OAuth2 authentication.',
    });
  });

  it('parses multiple tasks', () => {
    const content = `# Backlog

## TASK-001: First task
**Priority:** P1
**Tags:** tag1

Description one.

---

## TASK-002: Second task
**Priority:** P3
**Tag:** tag2

Description two.

---
`;
    const tasks = parseTasks(content);
    expect(tasks).toHaveLength(2);
    expect(tasks[0].id).toBe('TASK-001');
    expect(tasks[1].id).toBe('TASK-002');
    expect(tasks[1].tags).toEqual(['tag2']);
  });

  it('parses task with epic', () => {
    const content = `# Next

## TASK-005: Setup CI
**Priority:** P2
**Tags:** devops
**Epic:** infrastructure

Configure GitHub Actions.

---
`;
    const tasks = parseTasks(content);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].epic).toBe('infrastructure');
  });

  it('parses task with no tags', () => {
    const content = `# Backlog

## TASK-010: Simple task
**Priority:** P4

Just a simple task.

---
`;
    const tasks = parseTasks(content);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].tags).toEqual([]);
    expect(tasks[0].priority).toBe(Priority.P4);
  });

  it('parses task with no description', () => {
    const content = `# Backlog

## TASK-001: No description
**Priority:** P2

---
`;
    const tasks = parseTasks(content);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].description).toBe('');
  });

  it('parses pipe-separated metadata on one line', () => {
    const content = `# Backlog

## TASK-001: Implement auth
**Priority:** P1 | **Tags:** auth, backend

Build OAuth2 authentication.

---
`;
    const tasks = parseTasks(content);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toEqual({
      id: 'TASK-001',
      title: 'Implement auth',
      priority: Priority.P1,
      tags: ['auth', 'backend'],
      epic: undefined,
      description: 'Build OAuth2 authentication.',
    });
  });

  it('parses pipe-separated metadata with epic', () => {
    const content = `## TASK-003: Setup CI
**Priority:** P2 | **Tag:** devops | **Epic:** infrastructure

Configure GitHub Actions.

---
`;
    const tasks = parseTasks(content);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].priority).toBe(Priority.P2);
    expect(tasks[0].tags).toEqual(['devops']);
    expect(tasks[0].epic).toBe('infrastructure');
  });

  it('handles empty file', () => {
    const tasks = parseTasks('# Backlog\n');
    expect(tasks).toHaveLength(0);
  });

  it('handles empty string', () => {
    const tasks = parseTasks('');
    expect(tasks).toHaveLength(0);
  });

  it('defaults to P4 for unknown priority', () => {
    const content = `## TASK-001: Bad priority
**Priority:** CRITICAL

Some description.
`;
    const tasks = parseTasks(content);
    expect(tasks[0].priority).toBe(Priority.P4);
  });

  it('handles task without separator at end of file', () => {
    const content = `# Backlog

## TASK-001: Last task
**Priority:** P1

Description without trailing separator.
`;
    const tasks = parseTasks(content);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].description).toBe('Description without trailing separator.');
  });

  it('parses multiline description', () => {
    const content = `## TASK-001: Multiline
**Priority:** P2

Line one.

Line two with **bold**.

- List item

---
`;
    const tasks = parseTasks(content);
    expect(tasks[0].description).toContain('Line one.');
    expect(tasks[0].description).toContain('Line two with **bold**.');
    expect(tasks[0].description).toContain('- List item');
  });
});

describe('findTaskLineNumber', () => {
  it('finds the correct line', () => {
    const content = `# Backlog

## TASK-001: First
**Priority:** P1

---

## TASK-002: Second
**Priority:** P2

---
`;
    expect(findTaskLineNumber(content, 'TASK-001')).toBe(3);
    expect(findTaskLineNumber(content, 'TASK-002')).toBe(8);
  });

  it('returns 1 for not found', () => {
    expect(findTaskLineNumber('# Empty\n', 'TASK-999')).toBe(1);
  });
});
