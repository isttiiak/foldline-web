type ReadRow = {
  created_at: string;
  started_on: string | null;
  finished_on: string | null;
  stopped_on: string | null;
};

/** The day a read last moved; a read with no dates yet counts as the newest. */
function lastDay(read: ReadRow): string {
  return read.finished_on ?? read.stopped_on ?? read.started_on ?? "9999-12-31";
}

/**
 * Newest read first: the latest created, and among reads created together
 * (imports, scripts) the one that moved most recently. The first is the current read.
 */
export function newestReadFirst(a: ReadRow, b: ReadRow): number {
  return (
    b.created_at.localeCompare(a.created_at) ||
    lastDay(b).localeCompare(lastDay(a))
  );
}
