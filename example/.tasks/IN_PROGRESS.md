# In Progress

## TASK-002: Build kanban board webview
**Priority:** P1 | **Tags:** ui, feature
**Updated:** 2026-04-01 20:32

Create a WebviewPanel with columns per state. Support HTML5 drag-and-drop to move tasks between columns.

---

## TASK-010: Fix parser crash on empty description
**Priority:** P2 | **Tags:** bug

The parser throws when a task has a heading and metadata but no description text before the separator. Add a guard for empty description.

---

## TASK-012: Bulk move tasks between states
**Priority:** P3 | **Tags:** ui, feature
**Updated:** 2026-04-01 20:25

Allow selecting multiple tasks in the list view and moving them to a target state in one action.

---

## TASK-003: Implement task edit command
**Priority:** P2 | **Tags:** ui, feature

The `taskplanner.editTask` command is registered in package.json but has no implementation. Add a multi-step input flow similar to createTask that pre-fills current values.

---
