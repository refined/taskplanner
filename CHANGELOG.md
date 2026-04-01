# Changelog

All notable changes to the **Task. Plan. AI.** extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Cursor Tier 1 chat failure logs to **TaskPlanner AI** output and shows a warning before the Agent Chat paste fallback (TASK-030)
- Optional `taskplanner.cursorPlanAndSubmitAfterOpen` — after Cursor Tier 1 succeeds, best-effort plan/submit commands (TASK-030)
- AI providers for **Implement with AI**: `vscode-chat`, `claude-cli` (terminal + `taskplanner.claudeCliCommand`, default `claude {{file}}`); optional first-run prompt and **TaskPlanner: Configure AI Provider** command (TASK-030)
- Cursor "Implement with AI" uses tiered delivery: native chat open, then Agent Chat paste workaround, then clipboard (TASK-030)
- AI prompts include a plan-mode instruction when project config requires an agent plan (TASK-030)
- "Implement with AI" button on task detail view and kanban cards — auto-detects Cursor or Claude Code, with clipboard fallback (TASK-026)
- `taskplanner.aiTool` setting to choose preferred AI tool (window-scoped; includes auto/cursor/claude-code/vscode-chat/claude-cli/clipboard) (TASK-026)
- Changelog for VS Code marketplace with retrospective entries and auto-update rule in CLAUDE.md (TASK-029)

### Fixed

- Task detail **Status** and **Priority** pickers use theme-colored popup menus instead of native `<select>` lists, so options stay readable in dark themes and match VS Code styling.

### Changed

- Claude Code integration simplified to URI handler — removed intermediate QuickPick menu (TASK-026)

## [1.2.0] - 2026-03-22

### Added
- Search/filter on Kanban board with debounced input (TASK-028)
- AI plan persistence — plans saved as `### Plan` subsections when tasks move through the workflow (TASK-016)
- Auto-increment patch version on every commit via git pre-commit hook (TASK-018)

### Changed
- Kanban board columns restructured: Backlog | Active (Next + In Progress) | Completed (Done + Rejected) (TASK-025)
- README split into developer docs and user-facing marketplace page (TASK-022)

## [1.1.0] - 2026-03-20

### Added
- Filtered task list as main view — grouped by status, searchable across all fields (TASK-013)
- Assignee and Updated datetime fields on tasks (TASK-013)
- Grouping controls: by status, assignee, date, or none (TASK-013)
- Duplicate task conflict detection with auto-fix (TASK-014)
- Sort/group icon-button dropdowns with VS Code native styling (TASK-015)

### Fixed
- Save button now closes the edit form and returns to list view (TASK-027)

## [1.0.0] - 2026-03-18

### Added
- Project scaffolding: TypeScript + esbuild + Vitest + VS Code extension shell (TASK-001)
- Regex-based markdown parser and serializer for task files (TASK-002)
- Extension icon and activity bar branding (TASK-003)
- Kanban board with drag-and-drop between columns (TASK-004)
- Filtered task list with status dropdown and search (TASK-004)
- AI instruction generation — auto-generates `CLAUDE.md` and `.cursorrules` (TASK-006)
- Setup menu: Initialize Project, AI Instructions, Planning toggle, Sort By (TASK-007)
- Compact tree view with priority-colored icons and task count badges (TASK-008)
- Example `.tasks/` folder with sample tasks (TASK-005)
- README with features, quick start, format spec, AI workflow docs (TASK-011)
- Rejected state, config migration v1 to v2, insert position setting (TASK-012)
- GitHub community files and CI rules (TASK-010)
- Overview screenshots for README and marketplace (TASK-009)
