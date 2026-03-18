# TaskPlanner

Markdown-based task tracking that lives in your project folder. AI-friendly, git-tracked, zero external services.

## Why?

- **Tasks next to code** — no context switching to Jira/Asana
- **Git-tracked** — full history of task changes in your commits
- **AI-agent ready** — agents read `NEXT.md`, pick a task, and start building
- **Human-readable** — plain markdown, works without the extension installed
- **Zero config** — run "Initialize Project" and start creating tasks

## Features

- Sidebar tree view with tasks grouped by state (Backlog → Next → In Progress → Done)
- Create, move, edit, and delete tasks from the command palette or tree view
- File watcher — edit `.tasks/*.md` by hand and the tree updates live
- AI integration — generates `CLAUDE.md` and `.cursorrules` with task workflow instructions
- Configurable states, priorities, tags, and task ID prefix

## Quick Start

1. Install the extension from the VS Code Marketplace
2. Open a project folder
3. Click the TaskPlanner icon in the activity bar — a welcome view with **Initialize Project** button appears
4. Or use the **gear icon** (Setup) in the sidebar title bar to access all setup options
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

Each task looks like:

```markdown
## TASK-001: Implement user authentication
**Priority:** P1
**Tags:** auth, backend

Implement OAuth2 authentication with Google and GitHub providers.

---
```

## Setup Menu

Click the **gear icon** in the TaskPlanner sidebar title bar to access:

- **Initialize Project** — create `.tasks/` folder and state files (only shown if not yet initialized)
- **Initialize AI Instructions** — generate/update `CLAUDE.md` and `.cursorrules` with task workflow instructions
- **AI Planning: Enable/Disable** — toggle whether AI agents must write a `### Plan` before coding
- **Open Settings** — open TaskPlanner extension settings

## For AI Agents

Supported AI tools: **Claude** (via `CLAUDE.md`) and **Cursor** (via `.cursorrules`).

Run `TaskPlanner: Initialize AI Instructions` (or use the Setup menu) to generate instruction files that teach AI agents how to use your task board:

1. Agent reads `.tasks/NEXT.md`
2. Picks the highest-priority task
3. Moves it to `.tasks/IN_PROGRESS.md`
4. Writes a `### Plan` subsection under the task heading (if AI Planning is enabled)
5. Implements the task
6. Moves it to `.tasks/DONE.md`

### AI Planning

When enabled (default), the generated AI instructions require agents to write a plan before coding. The plan is stored as a `### Plan` subsection directly inside the task in `IN_PROGRESS.md`:

```markdown
## TASK-001: Implement user authentication
**Priority:** P1
**Tags:** auth, backend

Implement OAuth2 authentication with Google and GitHub providers.

### Plan

- Add OAuth2 client configuration
- Create auth callback endpoint
- Implement token refresh logic

---
```

Toggle this via the Setup menu or set `aiPlanRequired` in `.tasks/config.json`.

## Configuration

`.tasks/config.json` controls behavior:

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
  "priorities": ["P1", "P2", "P3", "P4"],
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
