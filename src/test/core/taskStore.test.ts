import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigManager } from '../../core/config/configManager.js';
import { FileStore } from '../../core/store/fileStore.js';
import { TaskStore } from '../../core/store/taskStore.js';
import { Priority } from '../../core/model/task.js';

describe('TaskStore', () => {
  let tmpDir: string;
  let configManager: ConfigManager;
  let fileStore: FileStore;
  let taskStore: TaskStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskplanner-test-'));
    configManager = new ConfigManager(tmpDir);
    configManager.load();
    configManager.save();
    fileStore = new FileStore(tmpDir);
    fileStore.initializeStateFiles(configManager.get());
    taskStore = new TaskStore(configManager, fileStore);
    taskStore.reload();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('starts with empty states', () => {
    expect(taskStore.getTasksByState('Backlog')).toHaveLength(0);
    expect(taskStore.getTasksByState('Next')).toHaveLength(0);
  });

  it('creates a task', () => {
    const task = taskStore.createTask(
      {
        title: 'Test task',
        priority: Priority.P1,
        tags: ['test'],
        description: 'A test task.',
      },
      'Backlog',
    );

    expect(task.id).toBe('TASK-001');
    expect(taskStore.getTasksByState('Backlog')).toHaveLength(1);

    // Verify persisted to file
    const filePath = path.join(tmpDir, 'BACKLOG.md');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('TASK-001');
    expect(content).toContain('Test task');
  });

  it('moves a task between states', () => {
    taskStore.createTask(
      { title: 'Move me', priority: Priority.P2, tags: [], description: 'Will move.' },
      'Backlog',
    );

    const moved = taskStore.moveTask('TASK-001', 'In Progress');
    expect(moved).not.toBeNull();
    expect(taskStore.getTasksByState('Backlog')).toHaveLength(0);
    expect(taskStore.getTasksByState('In Progress')).toHaveLength(1);
  });

  it('deletes a task', () => {
    taskStore.createTask(
      { title: 'Delete me', priority: Priority.P3, tags: [], description: '' },
      'Backlog',
    );

    expect(taskStore.deleteTask('TASK-001')).toBe(true);
    expect(taskStore.getTasksByState('Backlog')).toHaveLength(0);
  });

  it('updates a task', () => {
    taskStore.createTask(
      { title: 'Original', priority: Priority.P3, tags: [], description: 'Old.' },
      'Backlog',
    );

    const updated = taskStore.updateTask('TASK-001', { title: 'Updated', priority: Priority.P1 });
    expect(updated?.title).toBe('Updated');
    expect(updated?.priority).toBe(Priority.P1);
  });

  it('finds a task by ID', () => {
    taskStore.createTask(
      { title: 'Find me', priority: Priority.P1, tags: ['search'], description: 'Findable.' },
      'Next',
    );

    const found = taskStore.findTask('TASK-001');
    expect(found?.task.title).toBe('Find me');
    expect(found?.stateName).toBe('Next');
  });

  it('reorders tasks', () => {
    taskStore.createTask(
      { title: 'First', priority: Priority.P1, tags: [], description: '' },
      'Backlog',
    );
    taskStore.createTask(
      { title: 'Second', priority: Priority.P2, tags: [], description: '' },
      'Backlog',
    );

    // With insertPosition 'top', Second (TASK-002) is at index 0, First (TASK-001) at index 1
    const tasks = taskStore.getTasksByState('Backlog');
    expect(tasks[0].id).toBe('TASK-002');
    expect(tasks[1].id).toBe('TASK-001');

    taskStore.reorderTask('TASK-001', 'up');
    const reordered = taskStore.getTasksByState('Backlog');
    expect(reordered[0].id).toBe('TASK-001');
    expect(reordered[1].id).toBe('TASK-002');
  });

  it('notifies listeners on change', () => {
    let changeCount = 0;
    taskStore.onDidChange(() => changeCount++);

    taskStore.createTask(
      { title: 'Notify', priority: Priority.P1, tags: [], description: '' },
      'Backlog',
    );
    expect(changeCount).toBe(1);

    taskStore.moveTask('TASK-001', 'Next');
    expect(changeCount).toBe(2);
  });

  it('reorders a task to a specific index', () => {
    taskStore.createTask(
      { title: 'A', priority: Priority.P1, tags: [], description: '' },
      'Backlog',
    );
    taskStore.createTask(
      { title: 'B', priority: Priority.P2, tags: [], description: '' },
      'Backlog',
    );
    taskStore.createTask(
      { title: 'C', priority: Priority.P3, tags: [], description: '' },
      'Backlog',
    );

    expect(taskStore.reorderTaskToIndex('TASK-003', 2)).toBe(true);
    let order = taskStore.getTasksByState('Backlog').map((t) => t.id);
    expect(order).toEqual(['TASK-002', 'TASK-001', 'TASK-003']);

    expect(taskStore.reorderTaskToIndex('TASK-003', 0)).toBe(true);
    order = taskStore.getTasksByState('Backlog').map((t) => t.id);
    expect(order).toEqual(['TASK-003', 'TASK-002', 'TASK-001']);
  });

  it('reorderTaskToIndex is a no-op when index unchanged', () => {
    let changeCount = 0;
    taskStore.onDidChange(() => changeCount++);
    taskStore.createTask(
      { title: 'Only', priority: Priority.P1, tags: [], description: '' },
      'Backlog',
    );
    const before = changeCount;
    expect(taskStore.reorderTaskToIndex('TASK-001', 0)).toBe(true);
    expect(changeCount).toBe(before);
  });

  it('moveTask inserts at targetIndex in target state', () => {
    taskStore.createTask(
      { title: 'In next', priority: Priority.P1, tags: [], description: '' },
      'Next',
    );
    taskStore.createTask(
      { title: 'In backlog', priority: Priority.P2, tags: [], description: '' },
      'Backlog',
    );

    const moved = taskStore.moveTask('TASK-002', 'Next', 0);
    expect(moved).not.toBeNull();
    const nextOrder = taskStore.getTasksByState('Next').map((t) => t.title);
    expect(nextOrder).toEqual(['In backlog', 'In next']);
    expect(taskStore.getTasksByState('Backlog')).toHaveLength(0);
  });

  it('moveTask with targetIndex reorders within the same state', () => {
    taskStore.createTask(
      { title: 'First', priority: Priority.P1, tags: [], description: '' },
      'Backlog',
    );
    taskStore.createTask(
      { title: 'Second', priority: Priority.P2, tags: [], description: '' },
      'Backlog',
    );

    const moved = taskStore.moveTask('TASK-001', 'Backlog', 0);
    expect(moved).not.toBeNull();
    const order = taskStore.getTasksByState('Backlog').map((t) => t.id);
    expect(order).toEqual(['TASK-001', 'TASK-002']);
  });
});
