interface CsvReportResult {
  columns?: string[];
  rows?: Record<string, unknown>[];
}

export function createReportCsv(result: CsvReportResult): string {
  const escapeCsv = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const text = typeof value === "object" ? JSON.stringify(value) : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const columns = result.columns || [];
  const rows = result.rows || [];
  return [
    columns.map(escapeCsv).join(","),
    ...rows.map((row) => columns.map((column) => escapeCsv(row[column])).join(",")),
  ].join("\n");
}

export function reportCsvFilename(reportName: string): string {
  return `${reportName.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "report"}.csv`;
}
