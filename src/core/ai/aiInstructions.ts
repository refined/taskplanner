import { TaskPlannerConfig } from '../model/config.js';

const MARKER_START = '<!-- TASKPLANNER:START -->';
const MARKER_END = '<!-- TASKPLANNER:END -->';

export { MARKER_START, MARKER_END };

export interface AiInstructions {
  claudeMd: string;
  cursorRules: string;
}

export function generateAiInstructions(config: TaskPlannerConfig): AiInstructions {
  const content = buildInstructionContent(config);
  return {
    claudeMd: content,
    cursorRules: content,
  };
}

function buildInstructionContent(config: TaskPlannerConfig): string {
  const stateList = config.states
    .sort((a, b) => a.order - b.order)
    .map((s) => `- **${s.name}** → \`${s.fileName}\``)
    .join('\n');

  const idExample = `${config.idPrefix}-001`;

  const planSection = config.aiPlanRequired
    ? `
### Planning Requirement

Before writing any code, you MUST add a \`### Plan\` subsection under the task heading in IN_PROGRESS.md:

\`\`\`markdown
## ${idExample}: Example task title
**Priority:** P1

Description of the task.

### Plan

- Step 1: ...
- Step 2: ...
- Key files: ...
\`\`\`

The plan is free-form markdown. Write it before you start coding.`
    : '';

  return `# TaskPlanner — AI Agent Instructions

This project uses [TaskPlanner](https://github.com/refined/taskplanner) for task management.
Tasks are stored as markdown files in the \`.tasks/\` directory.

## Task File Structure

Each state has its own file:
${stateList}

## Task Format

Each task is a \`## \` heading section separated by \`---\`:

\`\`\`markdown
## ${idExample}: Task title here
**Priority:** P1 | **Tags:** tag1, tag2

Description text in markdown.

---
\`\`\`

- **ID prefix:** \`${config.idPrefix}\`
- **Priorities:** ${config.priorities.join(', ')}

## Workflow for Implementing a Task

When asked to implement a task:

1. **Pick the task** from BACKLOG.md or NEXT.md (highest priority first, or as specified by the user).
2. **Move the task** to IN_PROGRESS.md by cutting it from the source file and pasting it into IN_PROGRESS.md.${config.aiPlanRequired ? '\n3. **Write a plan** — add a `### Plan` subsection under the task heading (see below).' : ''}
${config.aiPlanRequired ? '4' : '3'}. **Implement** the task.
${config.aiPlanRequired ? '5' : '4'}. **Move the task** to DONE.md when complete.
${planSection}

## Creating a New Task

When the user asks you to create a task:

1. **Read** \`.tasks/config.json\` to get the current \`nextId\` and \`idPrefix\`.
2. **Generate the ID** — format: \`{idPrefix}-{nextId padded to 3 digits}\` (e.g. \`${config.idPrefix}-015\`).
3. **Increment \`nextId\`** in \`.tasks/config.json\` and save the file.
4. **Write the task** into \`BACKLOG.md\` (or the file the user specifies) using this format:

\`\`\`markdown
## ${idExample}: Task title
**Priority:** P2
**Tags:** tag1, tag2
**Updated:** YYYY-MM-DD HH:mm

Description of the task in markdown.

---
\`\`\`

Rules for new tasks:
- **Priority** is required. If not specified by the user, default to \`P2\`.
- **Tags** are optional. Pick from the project's tag list if relevant: ${config.tags.length > 0 ? config.tags.join(', ') : '(none configured)'}.
- **Updated** — set to the current date/time.
- Add the task at the **${config.insertPosition}** of the file (after the \`# Heading\` line).
- Always end the task section with a \`---\` separator.
- If the user asks to create multiple tasks at once, increment the ID for each one.

## Important Rules

- Do NOT change task IDs.
- Do NOT modify tasks you are not working on.
- Keep the \`---\` separator between tasks.
- When moving a task, remove it entirely from the source file (including the trailing \`---\`).
`;
}

/**
 * Insert or update the TaskPlanner section in an existing file content.
 * Uses marker comments to make the operation idempotent.
 */
export function upsertMarkedSection(existingContent: string, section: string): string {
  const markedSection = `${MARKER_START}\n${section}\n${MARKER_END}`;

  const startIdx = existingContent.indexOf(MARKER_START);
  const endIdx = existingContent.indexOf(MARKER_END);

  if (startIdx !== -1 && endIdx !== -1) {
    // Replace existing section
    return (
      existingContent.substring(0, startIdx) +
      markedSection +
      existingContent.substring(endIdx + MARKER_END.length)
    );
  }

  // Append to end
  const separator = existingContent.length > 0 && !existingContent.endsWith('\n') ? '\n' : '';
  const extraNewline = existingContent.length > 0 ? '\n' : '';
  return existingContent + separator + extraNewline + markedSection + '\n';
}
