# TaskPlanner — Development Guide

## What is this?

TaskPlanner is a VS Code extension that provides markdown-based task tracking directly in your project folder. Think lightweight Jira — but stored as `.md` files, git-tracked, and AI-agent friendly.

## Tech Stack

- **Language:** TypeScript (strict mode)
- **Bundler:** esbuild
- **Unit tests:** Vitest (`npm test`)
- **Integration tests:** @vscode/test-cli
- **Linter:** ESLint (`npm run lint`)
- **Formatter:** Prettier (`npm run format`)

## Project Structure

- `src/core/` — Pure logic, zero VS Code dependencies. Models, parser, serializer, stores, config.
- `src/extension/` — VS Code extension shell. Commands, views, providers, watchers.
- `src/test/core/` — Vitest unit tests for core library.
- `src/test/extension/` — VS Code integration tests.
- `resources/` — SVG icons and templates.

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

## Task File Format

Tasks are stored in `.tasks/` as markdown files (BACKLOG.md, NEXT.md, IN_PROGRESS.md, DONE.md). Each task is a `##` section:

```markdown
## TASK-001: Task title here
**Priority:** P1
**Tags:** tag1, tag2

Description text in markdown.

---
```

## Architecture Decisions

- **Core is VS Code-free** so it can be reused for JetBrains plugin or CLI later.
- **Regex-based parsing** — no YAML dependency, the format is simple enough.
- **Single file per state** — scales well for typical project task counts.
- **Config in `.tasks/config.json`** — stores operational metadata (next ID, settings).
