# Done

## TASK-031: Make tasks draggable in the basic Task list view
**Priority:** P2 | **Tags:** ui, feature
**Updated:** 2026-04-01

Allow users to reorder tasks in the basic Task list view by dragging (within a group and/or between groups, consistent with how grouping works). Align drag-and-drop behavior and feedback with the Kanban board where it makes sense.

### Plan

- **Core:** `TaskStore.reorderTaskToIndex`, `moveTask(..., targetIndex?)` for arbitrary positions; Vitest coverage.
- **List webview:** HTML5 DnD when grouped by **Status** only; `.group-tasks` + **group header** drop zones (collapsed sections); dashed `drag-over`, drop line, `expandGroup` after drop on collapsed header; suppress accidental open after drag.
- **Sort:** `taskplanner.sortBy` value **file** (markdown order) so reordered lists stay stable; Kanban/setup pickers updated.
- **Messages:** `reorderTask`, `moveTask.targetIndex`, `expandGroup`.

---

## TASK-017: Invalid data notification and parser test coverage
**Priority:** P1 | **Tags:** ui, testing, core
**Updated:** 2026-04-01

If a task or text cannot be parsed, display a notification banner at the top of the main screen. Add comprehensive tests for different markdown formats — both valid and malformed inputs.

### Plan

- Introduced `ParseResult` / `ParseWarning`; `parseTasks` returns tasks plus per-line warnings (orphan text, invalid `##` headings, empty titles, BOM strip, harmless `---` when no task open).
- `FileStore` / `TaskStore` propagate warnings; `getWarnings()` grouped by state file for the UI.
- Dismissible warning banner in sidebar task list (list + detail) and Kanban, with Open-at-line; dismiss resets when warning set changes.
- File watcher logs reload failures to **TaskPlanner** output channel instead of swallowing errors.
- Extended Vitest parser coverage: assignee/updated, round-trip serialize, malformed inputs, BOM, duplicates.

---

## TASK-030: Cursor sidebar prompt integration
**Priority:** P3 | **Tags:** feature, ui
**Updated:** 2026-04-01 20:45

Update `dispatchCursor()` to use Cursor 2.3+ prompt injection support: try `workbench.action.chat.open` with query, then `composer.newAgentChat` + clipboard paste, then copy-only fallback. When `aiPlanRequired` is true, prepend a plan-mode line to the composed prompt.

### Plan

- Tier 1: `workbench.action.chat.open` with `{ query, isPartialQuery: false }` in `implementWithAi.ts`
- Tier 2: save clipboard, write prompt, `composer.newAgentChat`, delay 150ms, `editor.action.clipboardPasteAction`, restore clipboard
- Tier 3: existing `copyToClipboard` message
- `promptComposer.ts`: prepend "Use plan mode. Read and analyze before making changes." when `aiPlanRequired`
- Extended Vitest coverage for plan-mode line; Claude Code path unchanged

---

## TASK-026: [Claude] Implement with AI button on tasks
**Priority:** P1 | **Tags:** feature, ui
**Updated:** 2026-04-01 12:38

Add an "Implement with AI" action button to task cards/detail view. When clicked, it should open the available AI extension (Cursor AI / Copilot), pass the task context, and start planning the implementation. The AI should then follow the existing task pipeline (move to In Progress, plan, implement, move to Done).

### Plan

- Added `composeImplementationPrompt()` in `src/core/ai/promptComposer.ts` — pure function composing task context into an AI prompt
- Added `taskplanner.implementWithAi` command in `src/extension/commands/implementWithAi.ts` with auto-detection: Cursor Composer, Claude Code URI handler (`vscode://anthropic.claude-code/open?prompt=...`), or clipboard fallback. Sidebar prompt injection pending anthropics/claude-code#42000
- Added `taskplanner.aiTool` setting (auto/cursor/claude-code/clipboard) to `package.json`
- Added "Implement with AI" primary button to task detail view in `taskListPanel.ts`
- Added hover-revealed AI sparkle button to kanban cards in `kanbanPanel.ts`
- Registered command in `extension.ts`
- Unit tests for prompt composition (8 tests)

---

## TASK-029: Changelog for extension marketplace
**Priority:** P1 | **Tags:** docs, setup
**Updated:** 2026-03-22

The VS Code marketplace page shows an empty Changelog tab. Create and maintain a `CHANGELOG.md` at the project root following the [Keep a Changelog](https://keepachangelog.com) format. The changelog should be auto-updated whenever a task is moved to Done — the AI agent completing the task appends an entry under the current `[Unreleased]` section.

### Plan

- Created `CHANGELOG.md` at project root with retrospective entries from all completed tasks, grouped into versions 1.0.0, 1.1.0, 1.2.0
- Added `[Unreleased]` section at top for ongoing entries
- Added changelog update rule to `CLAUDE.md` so AI agents append entries when moving tasks to Done
- Follows [Keep a Changelog](https://keepachangelog.com) format

---

## TASK-028: search on Kanban board
**Priority:** P3 | **Tags:** UI, search | **Assignee:** Fedor
**Updated:** 2026-03-22 14:09

I want to have same search abilities as on a List Board. Search field only, we already have sorting, and other "query" functionalities is not applicable to Kanban Board.

### Plan

- Added search input to kanban toolbar with 200ms debounced filtering
- Reused existing `filterAndPaginate` + `matchesQuery` from core
- Removed delete button from kanban (not needed for now)
- Reduced column gap from 12px to 6px
- Added branch naming convention (`feature/TASK-NNN-desc`, `bug/TASK-NNN-desc`) to project CLAUDE.md and generated AI instructions
- Key files: `kanbanPanel.ts`, `aiInstructions.ts`, `CLAUDE.md`

---

## TASK-022: Split README into dev docs and user-facing page
**Priority:** P3 | **Tags:** docs
**Updated:** 2026-03-21

Refocused the GitHub README on development process, technical docs, and contribution guide. Created a separate user-facing page with feature highlights, screenshots, and setup guidelines.

---

## TASK-025: Refactor Kanban board column layout
**Priority:** P2 | **Tags:** ui, refactor
**Updated:** 2026-03-21

Restructured Kanban board columns from Next+Backlog | In Progress | Done+Rejected to Backlog | Active (Next+In Progress) | Completed (Done+Rejected).

### Plan

- Replaced `buildNextBacklogColumn()` with `buildActiveColumn()` merging Next + In Progress as sub-zones
- Backlog now renders as a standalone standard column
- In Progress shown at top of Active column, Next below it
- Completed column unchanged

---

## TASK-016: AI plan persistence in task workflow
**Priority:** P1 | **Tags:** core, feature
**Updated:** 2026-03-21

When AI moves a task to In Progress, the plan is saved as a `### Plan` subsection. When moved to Done, the plan is preserved for history.

### Plan

- Added `plan?: string` field to Task model
- Updated parser to detect `### Plan` heading and capture content separately from description
- Updated serializer to render plan section after description
- Updated AI instruction template with plan persistence convention
- Added parser and serializer tests

---

## TASK-018: Auto-increment package version on commit
**Priority:** P3 | **Tags:** setup
**Updated:** 2026-03-21

Automatically bump the patch version in package.json via a git pre-commit hook. Uses `core.hooksPath` pointing to `.githooks/pre-commit` — no husky dependency. The `prepare` npm script configures the hooks path on `npm install`.

---

## TASK-027: Save button should close form and return to list
**Priority:** P1 | **Tags:** ui, feature
**Updated:** 2026-03-20

After clicking the Save button on the task edit form, the form should close and navigate back to the task list view.

---

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

Additionally, polished the sidebar sorting and grouping UX:
- Use standard VS Code fonts for sort/group dropdown/popup controls.
- Render sort/group as icon buttons that open dropdown menus.
- Remove the Delete button from the task detail editor.
- Show a visible save confirmation toast after saving a task.
- Persist sort (and grouping) in workspace settings and keep sorting consistent between the sidebar tree view and the Kanban board.

---

## TASK-015: Fix Cursor sorting and grouping panels
**Priority:** P1
**Updated:** 2026-03-19 00:00

Use VS Code styling for the sorting/grouping popup controls, switch to icon-based dropdown menus, remove the broken Delete action from the sidebar detail panel, add a clear save confirmation, and keep sorting synchronized across the sidebar tree view and the Kanban board.

---

## TASK-014: Conflict resolution
**Priority:** P1
**Updated:** 2026-03-19 01:00

There is a quite an issue. Somtimes is possible because of conflicts on Github we might endup having the same task with same number twice.
In this case I propose to notify user. We can give user select - or make an autofix with taken the latest task (if date is the same or not presented we should take the latest by status) - so user would need only approve.
Please update after resolution the minor version of a package

---