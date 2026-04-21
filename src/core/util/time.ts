/** Current timestamp in `YYYY-MM-DD HH:MM` form used in task `Updated:` metadata. */
export function currentTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 16);
}
