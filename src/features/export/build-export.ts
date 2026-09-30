export const EXPORT_FORMAT = "foldline-export";
/** Bump when the shape of the file changes in a way importers must know about. */
export const EXPORT_VERSION = 1;

export type ExportTables = Record<string, unknown[]>;

export type FoldlineExport = {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  account: { id: string; email: string | null };
  tables: ExportTables;
};

/** The "download my data" file: everything the user owns, one key per table. */
export function buildExport({
  user,
  tables,
  exportedAt,
}: {
  user: { id: string; email: string | null };
  tables: ExportTables;
  exportedAt: Date;
}): FoldlineExport {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: exportedAt.toISOString(),
    account: { id: user.id, email: user.email },
    tables,
  };
}

export function exportFilename(exportedAt: Date): string {
  return `foldline-export-${exportedAt.toISOString().slice(0, 10)}.json`;
}
