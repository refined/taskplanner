# Done

## TASK-001: Project scaffolding and initial setup
**Priority:** P1 | **Tags:** core, setup | **Assignee:** Fedor
**Updated:** 2026-03-16 00:00

Set up TypeScript project with esbuild bundler, VS Code extension shell, core library structure (models, parser, serializer, store), and Vitest test framework.

---

## TASK-002: Task parser and serializer
**Priority:** P1 | **Tags:** core
**Updated:** 2026-03-16 00:00

Implement regex-based markdown parser that extracts tasks from `## TASK-XXX: Title` headings with priority, tags, epic metadata. Implement serializer that converts Task objects back to markdown format with pipe-separated metadata.

---

## TASK-003: Extension icon and branding
**Priority:** P3 | **Tags:** ui, setup
**Updated:** 2026-03-16 00:00

Create SVG and PNG icons for the TaskPlanner activity bar and marketplace listing.

---

## TASK-004: Kanban board and filtered task list webviews
**Priority:** P1 | **Tags:** ui, feature
**Updated:** 2026-03-16 00:00

Implement Kanban board with drag-and-drop cards between columns (Next+Backlog merged, In Progress, Done+Rejected merged). Implement filtered task list with status dropdown and search-by-ID/title. Both use webview panels with VS Code theme integration.

---

## TASK-005: Task example files and webview polish
**Priority:** P3 | **Tags:** docs, ui
**Updated:** 2026-03-16 00:00

Create example `.tasks/` folder with sample tasks across all states. Polish webview card layout and flow.

---

## TASK-006: AI instruction generation and workflow
**Priority:** P2 | **Tags:** feature, core
**Updated:** 2026-03-16 00:00

Implement auto-generation of `CLAUDE.md` and `.cursorrules` files that teach AI agents the task pickup workflow (read NEXT.md, move to IN_PROGRESS, plan, implement, move to DONE).

---

## TASK-007: Setup menu and configuration options
**Priority:** P2 | **Tags:** ui, feature
**Updated:** 2026-03-18 00:00

Add gear icon setup menu with quick pick: Initialize Project, Initialize AI Instructions, AI Planning toggle, Sort By selection, Open Settings. Add `taskplanner.sortBy` configuration property.

---

## TASK-008: Compact tree view and card layout
**Priority:** P3 | **Tags:** ui
**Updated:** 2026-03-18 00:00

Refine sidebar tree view with priority-colored circle icons, task count badges, and drag-and-drop between states. Compact card layout with full word-wrap titles.

---

## TASK-009: Icon and screenshot updates
**Priority:** P4 | **Tags:** ui, docs
**Updated:** 2026-03-18 00:00

Update activity bar icon design, add overview screenshot for README and marketplace listing.

---

## TASK-010: GitHub community files and CI rules
**Priority:** P3 | **Tags:** setup, docs
**Updated:** 2026-03-18 00:00

Add GitHub repository configuration: community guidelines, contribution rules.

---

## TASK-011: README documentation
**Priority:** P2 | **Tags:** docs
**Updated:** 2026-03-18 00:00

Write comprehensive README with features overview, quick start guide, task format spec, AI agent workflow, views documentation, settings reference, and platform support matrix.

---

## TASK-012: Additional setup options and configuration
**Priority:** P3 | **Tags:** feature, setup
**Updated:** 2026-03-18 00:00

Add Rejected state support, config migration (v1→v2), insert position setting, and additional setup menu entries.

---

## TASK-013: MVP launch preparation
**Priority:** P1 | **Tags:** feature, ui | **Assignee:** Fedor
**Updated:** 2026-03-19 00:00

Replace main screen with filtered task list (grouped by status, hiding Backlog/Done/Rejected by default). Add Assignee and Updated datetime fields to tasks. Add grouping controls (by status, assignee, date, or none). Add search across all fields. Update README.

---

