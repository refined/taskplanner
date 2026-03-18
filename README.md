# Task Planner AI

Markdown-based task tracking built for AI-assisted development. Tasks live in your repo as `.md` files — readable by humans, parseable by AI agents, tracked by git.

## Why?

- **AI-native workflow** — agents read `NEXT.md`, pick a task, plan, build, and move it to `DONE.md`
- **Tasks next to code** — no context switching to Jira/Linear/Asana
- **Git-tracked** — full history of every task change in your commits
- **Human-readable** — plain markdown, works without the extension installed
- **Zero config** — run "Initialize Project" and start creating tasks

## Overview

![TaskPlanner overview](resources/screenshots/overview.png)

## Features

- **Kanban board** — drag-and-drop cards between columns, visual priority indicators
- **Filtered task list** — search by ID or title, filter by state
- **Sidebar tree view** — tasks grouped by state (Backlog → Next → In Progress → Done)
- **Drag-and-drop** — move tasks between states in tree view and Kanban board
- **AI instruction generation** — auto-generates `CLAUDE.md` and `.cursorrules` that teach agents your task workflow
- **AI planning mode** — agents write a `### Plan` inside the task before coding
- **Live file watcher** — edit `.tasks/*.md` by hand and all views update instantly
- **Configurable** — custom states, priorities (P0–P4), tags, ID prefix, sort order

## Quick Start

1. Install the extension from the VS Code Marketplace
2. Open a project folder
3. Click the TaskPlanner icon in the activity bar — a welcome view with **Initialize Project** appears
4. Run **Initialize AI Instructions** to generate workflow files for your AI tools
5. Start creating tasks!

You can also run `TaskPlanner: Initialize Project` from the command palette (`Ctrl+Shift+P`).

## Task Format

Tasks are stored in `.tasks/` as plain markdown:

```
.tasks/
├── config.json
├── BACKLOG.md
├── NEXT.md
├── IN_PROGRESS.md
└── DONE.md
```

Each task is a `##` heading section:

```markdown
## TASK-001: Set up OAuth2 authentication
**Priority:** P0
**Tags:** auth, backend

Implement OAuth2 flow with Google and GitHub providers.
Add token refresh logic and session management.

---

## TASK-002: Add rate limiting to API endpoints
**Priority:** P1
**Tags:** api, security

Apply rate limiting middleware to all public endpoints.
Use sliding window algorithm, 100 req/min per API key.

---
```

### Priorities

| Level | Meaning | Color |
|-------|---------|-------|
| P0 | Blocker | Purple |
| P1 | Critical | Red |
| P2 | High | Orange |
| P3 | Medium | Blue |
| P4 | Low | Grey |

## AI Agent Workflow

TaskPlanner is designed as a task interface between you and AI coding agents. Supported tools: **Claude Code** (via `CLAUDE.md`), **Cursor** (via `.cursorrules`).

Run **Initialize AI Instructions** (Setup menu or command palette) to generate instruction files. The generated workflow teaches agents to:

1. Read `.tasks/NEXT.md` and pick the highest-priority task
2. Move it to `.tasks/IN_PROGRESS.md`
3. Write a `### Plan` subsection under the task (if AI Planning is enabled)
4. Implement the task
5. Move it to `.tasks/DONE.md`

### AI Planning

When enabled (default), agents must write a plan before coding. The plan lives inside the task:

```markdown
## TASK-003: Migrate database to PostgreSQL
**Priority:** P1
**Tags:** database, migration

Replace SQLite with PostgreSQL for production readiness.

### Plan

- Add pg driver and connection pool configuration
- Create migration scripts for all existing tables
- Update repository layer to use parameterized queries
- Add integration tests against test database

---
```

Toggle via the Setup menu or set `aiPlanRequired` in `.tasks/config.json`.

### Auto-init

When `autoInitAiFiles` is enabled (default), AI instruction files are automatically created or updated during project initialization — so agents get the workflow from the first commit.

## Views

### Kanban Board

Open via command palette → `TaskPlanner: Open Kanban Board`. Columns map to task states. Drag cards between columns to change state. Task titles wrap fully — no truncation.

### Filtered Task List

Open via command palette → `TaskPlanner: Open Filtered Task List`. Search tasks by ID or title, filter by state.

### Sidebar Tree

Always visible in the activity bar. Tasks grouped under collapsible state nodes with task counts. Drag-and-drop between states. Priority shown as colored icons.

## Setup Menu

Click the **gear icon** in the TaskPlanner sidebar title bar:

- **Initialize Project** — create `.tasks/` folder and state files
- **Initialize AI Instructions** — generate/update `CLAUDE.md` and `.cursorrules`
- **AI Planning: Enable/Disable** — toggle whether agents must plan before coding
- **Sort By** — change task sort order (Priority / Name / ID)
- **Open Settings** — open VS Code extension settings

## Settings

Extension settings (accessible via VS Code Settings UI):

| Setting | Default | Description |
|---------|---------|-------------|
| `taskplanner.taskDirectory` | `.tasks` | Directory for task files relative to workspace root |
| `taskplanner.autoInitAiFiles` | `true` | Auto-create/update AI instruction files on init |
| `taskplanner.sortBy` | `priority` | Sort order for tasks: `priority`, `name`, or `id` |

Project config (`.tasks/config.json`):

```json
{
  "version": 1,
  "idPrefix": "TASK",
  "nextId": 1,
  "states": [
    { "name": "Backlog", "fileName": "BACKLOG.md", "order": 0 },
    { "name": "Next", "fileName": "NEXT.md", "order": 1 },
    { "name": "In Progress", "fileName": "IN_PROGRESS.md", "order": 2 },
    { "name": "Done", "fileName": "DONE.md", "order": 3 }
  ],
  "priorities": ["P0", "P1", "P2", "P3", "P4"],
  "tags": [],
  "insertPosition": "top",
  "aiPlanRequired": true
}
```

| Field | Description |
|-------|-------------|
| `idPrefix` | Prefix for task IDs (e.g. `TASK` → `TASK-001`) |
| `states` | Task board columns with file mappings |
| `priorities` | Available priority levels |
| `insertPosition` | Where new tasks are added: `top` or `bottom` |
| `aiPlanRequired` | Whether AI agents must write a `### Plan` before coding |

## Works With

- **VS Code** — primary target
- **Cursor IDE** — fully compatible (published to Open VSX)
- **JetBrains IDEs** — planned

## License

GPL v3
