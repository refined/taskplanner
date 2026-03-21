# Contributing to TaskPlanner

[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=refined.taskplanner) | [Open VSX](https://open-vsx.org/extension/refined/taskplanner) | [GitHub](https://github.com/refined/taskplanner)

Thanks for your interest in contributing! This guide covers everything you need to get started.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [VS Code](https://code.visualstudio.com/)
- npm (comes with Node.js)

## Getting Started

```bash
git clone https://github.com/refined/taskplanner.git
cd taskplanner
npm install
```

To run the extension in development mode:

1. Open the project in VS Code
2. Press **F5** to launch the Extension Development Host
3. The extension activates in the new VS Code window

## Tech Stack

- **Language:** TypeScript (strict mode)
- **Bundler:** esbuild
- **Unit tests:** Vitest (`npm test`)
- **Integration tests:** @vscode/test-cli
- **Linter:** ESLint (`npm run lint`)
- **Formatter:** Prettier (`npm run format`)

## Key Commands

```bash
npm install          # Install dependencies
npm run build        # Production build (esbuild)
npm run watch        # Dev build with watch mode
npm test             # Run unit tests (Vitest)
npm run lint         # Run ESLint
npm run format       # Run Prettier
npm run package      # Create .vsix package
```

## Project Structure

```
src/
├── core/           # Pure logic, zero VS Code dependencies
│                   # Models, parser, serializer, stores, config
├── extension/      # VS Code extension shell
│                   # Commands, views, providers, watchers
├── test/
│   ├── core/       # Vitest unit tests for core library
│   └── extension/  # VS Code integration tests
resources/          # SVG icons and templates
```

## Architecture Decisions

- **Core is VS Code-free** — `src/core/` has no VS Code imports so it can be reused for a JetBrains plugin or CLI later.
- **Regex-based parsing** — no YAML dependency; the markdown format is simple enough for regex.
- **Single file per state** — one `.md` file per board column (BACKLOG.md, NEXT.md, etc.). Scales well for typical project task counts.
- **Config in `.tasks/config.json`** — stores operational metadata (next ID, settings).

## Config Reference

Project configuration lives in `.tasks/config.json`:

```json
{
  "version": 2,
  "idPrefix": "TASK",
  "nextId": 1,
  "states": [
    { "name": "Backlog", "fileName": "BACKLOG.md", "order": 0 },
    { "name": "Next", "fileName": "NEXT.md", "order": 1 },
    { "name": "In Progress", "fileName": "IN_PROGRESS.md", "order": 2 },
    { "name": "Done", "fileName": "DONE.md", "order": 3 },
    { "name": "Rejected", "fileName": "REJECTED.md", "order": 4 }
  ],
  "priorities": ["P0", "P1", "P2", "P3", "P4"],
  "tags": [],
  "insertPosition": "top",
  "aiPlanRequired": true,
  "sortBy": "priority"
}
```

| Field | Description |
|-------|-------------|
| `idPrefix` | Prefix for task IDs (e.g. `TASK` → `TASK-001`) |
| `states` | Task board columns with file mappings |
| `priorities` | Available priority levels |
| `insertPosition` | Where new tasks are added: `top` or `bottom` |
| `aiPlanRequired` | Whether AI agents must write a `### Plan` before coding |
| `sortBy` | Default sort order: `priority`, `name`, or `id` |

## Testing

- **Unit tests** — run `npm test` (Vitest). Tests live in `src/test/core/`.
- **Integration tests** — use @vscode/test-cli. Tests live in `src/test/extension/`.

## Code Style

The project uses ESLint and Prettier. Run `npm run lint` and `npm run format` before submitting a PR.

## Pull Requests

1. Create a feature branch from `main`
2. Make your changes with tests where appropriate
3. Ensure `npm test` and `npm run lint` pass
4. Open a PR with a clear description of what changed and why

## License

By contributing, you agree that your contributions will be licensed under the GPL v3 license.
