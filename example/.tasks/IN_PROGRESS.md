# In Progress

## TASK-001: Build filtered task list webview
**Priority:** P1 | **Tags:** ui, feature

Create a WebviewPanel that displays all tasks in a flat list with filter controls: status dropdown, text search (matches ID and title). Cap at 50 tasks with "Show all" button.

---

## TASK-002: Build kanban board webview
**Priority:** P1 | **Tags:** ui, feature

Create a WebviewPanel with columns per state. Support HTML5 drag-and-drop to move tasks between columns.

---

## TASK-010: Fix parser crash on empty description
**Priority:** P2 | **Tag:** bug

The parser throws when a task has a heading and metadata but no description text before the separator. Add a guard for empty description.

---
