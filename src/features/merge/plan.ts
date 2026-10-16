/** Whether a field holds nothing worth keeping. */
export function isEmpty(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  );
}

/**
 * The fields the kept row takes from the dropped one: only where the kept row
 * has nothing and the reader has not locked the field. Returns the patch and
 * the kept row's old values for those fields (to undo it).
 */
export function fillGaps<T extends Record<string, unknown>>(
  keep: T,
  drop: T,
  fields: readonly (keyof T & string)[],
  locks: readonly string[],
): { patch: Partial<T>; before: Partial<T> } {
  const patch: Partial<T> = {};
  const before: Partial<T> = {};
  for (const field of fields) {
    if (locks.includes(field)) continue;
    if (!isEmpty(keep[field]) || isEmpty(drop[field])) continue;
    patch[field] = drop[field];
    before[field] = keep[field];
  }
  return { patch, before };
}

/** Custom field values of both books; the kept book's answers win. */
export function mergeCustomValues(
  keep: unknown,
  drop: unknown,
): Record<string, unknown> {
  const asObject = (value: unknown) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const kept = asObject(keep);
  const merged: Record<string, unknown> = { ...asObject(drop) };
  for (const [key, value] of Object.entries(kept)) {
    if (!isEmpty(value)) merged[key] = value;
    else if (!(key in merged)) merged[key] = value;
  }
  return merged;
}
