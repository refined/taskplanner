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
3. Run `TaskPlanner: Initialize Project` from the command palette
4. Start creating tasks!

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

## For AI Agents

Run `TaskPlanner: Initialize AI Instructions` to generate instruction files that teach AI agents how to use your task board:

1. Agent reads `.tasks/NEXT.md`
2. Picks the highest-priority task
3. Moves it to `.tasks/IN_PROGRESS.md`
4. Implements the task
5. Moves it to `.tasks/DONE.md`

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
  "insertPosition": "top"
}
```

## Works With

- **VS Code** — primary target
- **Cursor IDE** — fully compatible (published to Open VSX)
- **JetBrains IDEs** — planned

## License

GPL v3
