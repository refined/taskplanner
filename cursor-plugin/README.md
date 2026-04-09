# TaskPlanner — Cursor Plugin

Markdown-based task management for AI agents. This plugin gives Cursor agents the ability to read, create, move, and implement tasks stored in `.tasks/` files.

## What's included

| Component | Description |
|-----------|-------------|
| **MCP Server** | 6 tools for full task CRUD: board overview, list, get, create, move, update |
| **Commands** | `/list-tasks`, `/next-task`, `/continue-task` slash commands |
| **Skill** | Full TaskPlanner workflow knowledge for agent auto-discovery |
| **Rule** | Task markdown format conventions (fires when editing `.tasks/` files) |

## Usage

Once installed, the agent can:

- **List tasks** — type `/list-tasks` or ask "show me all tasks"
- **Pick next task** — type `/next-task` to start the highest-priority item
- **Continue current work** — type `/continue-task` to resume an in-progress task
- **Use MCP tools directly** — e.g. "create a P1 task for fixing the login bug"

## Requirements

- A workspace with a `.tasks/` directory (run `TaskPlanner: Initialize Project` from the VS Code extension)
- Node.js (the MCP server runs as a Node process)

## Installation

### Via Cursor Marketplace

Search for "taskplanner" in the Cursor marketplace panel.

### Via the VS Code extension

Install the **Task → Plan → AI** VS Code extension — the plugin is auto-registered.

### Manual

```bash
ln -s /path/to/this/cursor-plugin ~/.cursor/plugins/local/taskplanner
```

## Task format

Tasks live in `.tasks/*.md` as `## TASK-###: Title` sections separated by `---`:

```markdown
## TASK-001: Example task
**Priority:** P1
**Tags:** feature, core

Description in markdown.

---
```

## License

GPL-3.0
