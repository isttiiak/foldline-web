/** The reader's local calendar date, YYYY-MM-DD. */
export function localToday(): string {
  return new Date().toLocaleDateString("en-CA");
}

/**
 * When something logged for a local day happened: now for today, otherwise
 * midday of that day in the reader's time zone (so it sorts within the day).
 */
export function occurredAtFor(day: string, now = new Date()): string {
  if (day === now.toLocaleDateString("en-CA")) return now.toISOString();
  return new Date(`${day}T12:00:00`).toISOString();
}
