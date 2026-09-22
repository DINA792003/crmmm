export function exportReportCsv(reportId: string): void {
  window.open(`/api/proxy/api/reports/${encodeURIComponent(reportId)}/export?format=csv`, "_blank");
}
