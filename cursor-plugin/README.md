# TaskPlanner — Cursor Plugin

Markdown-based task management for AI agents. This plugin gives Cursor agents the ability to read, create, move, and implement tasks stored in `.tasks/` files.

## What's included

| Component | Description |
|-----------|-------------|
| **MCP Server** | 8 tools: board overview, list, get, create, move, update, board-data (JSON), board-visual (inline UI) |
| **Commands** | `/list-tasks`, `/next-task`, `/continue-task` slash commands |
| **Skill** | Full TaskPlanner workflow knowledge for agent auto-discovery |
| **Rule** | Task markdown format conventions (fires when editing `.tasks/` files) |

## Usage

Once installed, the agent can:

- **List tasks** — type `/list-tasks` or ask "show me all tasks"
- **Pick next task** — type `/next-task` to start the highest-priority item
- **Continue current work** — type `/continue-task` to resume an in-progress task
- **Use MCP tools directly** — e.g. "create a P1 task for fixing the login bug"
- **Show the visual board** — ask "open the visual task board" (or invoke `taskplanner_board_visual`) to render an inline interactive kanban with drag-to-move and click-for-details (requires an [MCP Apps](https://modelcontextprotocol.io/extensions/apps) host, such as Cursor 2.6+)
- **Get board JSON** — invoke `taskplanner_board_data` for a machine-readable board view-model (states + cards), useful for hosts without MCP UI rendering

The MCP board renders inline in agent chat. It is separate from the VS Code extension's `TaskPlanner: Open Kanban Board` panel.

## Requirements

- A workspace with a `.tasks/` directory (run `TaskPlanner: Initialize Project` from the VS Code extension)
- Node.js (the MCP server runs as a Node process)
- Built plugin artifacts (`dist/mcp-server.js` and `ui/board/index.html`) present in the plugin package

If your host does not support MCP Apps UI, `taskplanner_board_visual` may not render an iframe; use `taskplanner_board_data` and the standard task tools (`taskplanner_list`, `taskplanner_get`, `taskplanner_move`, etc.) as fallback.

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
