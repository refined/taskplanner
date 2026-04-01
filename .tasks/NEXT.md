# Next

## TASK-030: Cursor sidebar prompt integration
**Priority:** P3 | **Tags:** feature, ui
**Updated:** 2026-04-01 15:00

Update `dispatchCursor()` to use Cursor 2.3+ prompt injection support. Cursor added programmatic prompt-to-composer capability in v2.3 (January 2026) after a community request.

Reference: https://forum.cursor.com/t/a-command-for-passing-a-prompt-to-the-chat/138049

**Technical notes:**

- `dispatchCursor()` in `src/extension/commands/implementWithAi.ts` currently tries `composerMode.agent` and `aipane.aichat.open` — verify which command Cursor 2.3 uses and whether it auto-submits
- Test in Cursor IDE to confirm behavior
- The existing clipboard fallback should remain for older Cursor versions

---

## TASK-017: Invalid data notification and parser test coverage
**Priority:** P1 | **Tags:** ui, testing, core
**Updated:** 2026-03-22 19:14

If a task or text cannot be parsed, display a notification banner at the top of the main screen. Add comprehensive tests for different markdown formats — both valid and malformed inputs.

---

