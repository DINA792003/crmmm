"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Filter,
  Loader2,
  Play,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Report {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  objectName: string;
  columns: string[];
  filters?: unknown;
  filterLogic?: "AND" | "OR";
  aggregates?: unknown;
  groupBy?: string | null;
  groupColumn?: string | null;
  rowGroups?: string[];
  columnGroups?: string[];
  crossFilter?: { objectName: string; mode: "with" | "without" } | null;
  sortBy?: string | null;
  sortOrder?: string | null;
  createdAt: string;
}

interface ReportResult {
  columns: string[];
  columnTypes?: Record<string, string>;
  totalRows: number;
  rows: Record<string, unknown>[];
  summary?: Record<string, number>;
  groups?: {
    group: string;
    groupValues?: Record<string, string>;
    count: number;
    summary?: Record<string, number>;
    rows?: Record<string, unknown>[];
  }[];
  columnGroups?: { group: string; count: number }[];
  pivot?: {
    aggregate?: { function: string; field?: string; label?: string };
    aggregateLabel?: string;
    columns: string[];
    rows: { group: string; groupValues?: Record<string, string>; values: Record<string, number> }[];
  };
}

interface ReportFilter {
  field: string;
  operator: string;
  value: unknown;
}

export default function ReportDetailsPage() {
  const params = useParams();
  const reportId = params?.id as string;
  const [report, setReport] = React.useState<Report | null>(null);
  const [result, setResult] = React.useState<ReportResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState("");
  const [runError, setRunError] = React.useState("");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [resultDateField, setResultDateField] = React.useState("");
  const [resultFrom, setResultFrom] = React.useState("");
  const [resultTo, setResultTo] = React.useState("");
  const [resultSearch, setResultSearch] = React.useState("");

  const reportFilters = Array.isArray(report?.filters)
    ? (report.filters as ReportFilter[])
    : [];
  const resultDateFields =
    result?.columns.filter((column) => result.columnTypes?.[column] === "date") || [];
  const activeResultDateField = resultDateField || resultDateFields[0] || "";
  const fromTimestamp = resultFrom
    ? new Date(resultFrom).getTime()
    : Number.NEGATIVE_INFINITY;
  const toTimestamp = resultTo
    ? new Date(resultTo).getTime() + 59999
    : Number.POSITIVE_INFINITY;
  const dateRangeError = fromTimestamp > toTimestamp;
  const matchesResultSearch = React.useCallback(
    (row: Record<string, unknown>) => {
      const query = resultSearch.trim().toLowerCase();
      return (
        !query ||
        result?.columns.some((column) =>
          String(row[column] ?? "")
            .toLowerCase()
            .includes(query),
        ) || false
      );
    },
    [resultSearch, result?.columns],
  );
  const matchesResultDate = React.useCallback(
    (row: Record<string, unknown>) => {
      if (
        dateRangeError ||
        !activeResultDateField ||
        (!resultFrom && !resultTo)
      )
        return true;
      const value = row[activeResultDateField];
      if (value == null) return false;
      const timestamp = new Date(String(value)).getTime();
      if (Number.isNaN(timestamp)) return false;
      return timestamp >= fromTimestamp && timestamp <= toTimestamp;
    },
    [activeResultDateField, dateRangeError, fromTimestamp, resultFrom, resultTo, toTimestamp],
  );
  const matchesResultRow = React.useCallback(
    (row: Record<string, unknown>) =>
      matchesResultSearch(row) && matchesResultDate(row),
    [matchesResultDate, matchesResultSearch],
  );
  const filteredResultRows = result?.rows || [];
  const filteredGroups = result?.groups || [];
  const filteredPivotRows = result?.pivot?.rows || [];
  const pivotIsAdditive = result?.pivot?.aggregate?.function === "count" || result?.pivot?.aggregate?.function === "sum";

  const loadReport = React.useCallback(async () => {
    if (!reportId) return;
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`/api/proxy/api/reports/${reportId}`, {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body?.message || body?.error || "Failed to load report",
        );
      setReport(body.data || body.report || null);
    } catch (err: any) {
      setError(err?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  React.useEffect(() => {
    loadReport();
  }, [loadReport]);

  const runReport = async () => {
    if (!report) return;
    if (dateRangeError) {
      setRunError("From date/time cannot be after To date/time.");
      return;
    }
    try {
      setRunning(true);
      setRunError("");
      setResult(null);
      const response = await fetch("/api/proxy/api/reports/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectName: report.objectName,
          columns: Array.isArray(report.columns) ? report.columns : [],
          filters: Array.isArray(report.filters) ? report.filters : [],
          filterLogic: report.filterLogic === "OR" ? "OR" : "AND",
          aggregates: Array.isArray(report.aggregates) ? report.aggregates : [],
          groupBy: report.groupBy || undefined,
          groupColumn: report.groupColumn || undefined,
          rowGroups: report.rowGroups || undefined,
          columnGroups: report.columnGroups || undefined,
          crossFilter: report.crossFilter || undefined,
          sortBy: report.sortBy || undefined,
          sortOrder: report.sortOrder === "asc" ? "asc" : "desc",
          search: resultSearch.trim() || undefined,
          resultDateField: activeResultDateField || undefined,
          resultFrom: resultFrom || undefined,
          resultTo: resultTo || undefined,
          limit: 10000,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body?.message || body?.error || "Failed to run report");
      setResult(body.data || body.result || body);
    } catch (err: any) {
      setRunError(err?.message || "Failed to run report");
    } finally {
      setRunning(false);
    }
  };

  React.useEffect(() => {
    if (!result) return;
    const timer = window.setTimeout(() => void runReport(), 300);
    return () => window.clearTimeout(timer);
  }, [resultSearch, resultDateField, resultFrom, resultTo]);

  if (loading)
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading report...
      </div>
    );

  if (error || !report)
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/reports">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reports
          </Link>
        </Button>
        <Card>
          <CardContent className="flex min-h-[250px] flex-col items-center justify-center text-center">
            <FileText className="mb-4 h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">
              {error || "Report not found"}
            </h2>
            <Button variant="outline" className="mt-4" onClick={loadReport}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-3 -ml-3">
            <Link href="/reports">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Reports
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-3">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{report.name}</h1>
              <p className="text-sm text-muted-foreground">
                {report.objectName} · {report.type}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={filtersOpen ? "default" : "outline"}
            onClick={() => setFiltersOpen((current) => !current)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {reportFilters.length > 0 && (
              <Badge
                variant={filtersOpen ? "secondary" : "default"}
                className="ml-1 h-5 min-w-5 justify-center px-1.5"
              >
                {reportFilters.length}
              </Badge>
            )}
          </Button>
          <Button onClick={runReport} disabled={running}>
            <Play className="mr-2 h-4 w-4" />
            {running ? "Running..." : "Run Report"}
          </Button>
        </div>
      </div>
      {filtersOpen && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Report Filters</CardTitle>
              <span className="text-xs text-muted-foreground">
                {reportFilters.length > 0
                  ? "Applied when the report runs"
                  : "No filters applied"}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {reportFilters.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {reportFilters.map((filter, index) => (
                  <div
                    key={`${filter.field}-${index}`}
                    className="rounded-md border bg-muted/20 p-3"
                  >
                    <p className="text-xs font-semibold text-muted-foreground">
                      {filter.field}
                    </p>
                    <p className="mt-1 text-sm">
                      <span className="font-medium">{filter.operator}</span>
                      <span className="mx-1 text-muted-foreground">·</span>
                      {filter.value == null || filter.value === ""
                        ? "Any value"
                        : String(filter.value)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                This report includes all records.
              </p>
            )}
          </CardContent>
        </Card>
      )}
      {report.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {report.description}
            </p>
          </CardContent>
        </Card>
      )}
      {runError && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {runError}
        </p>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="text-sm font-medium">Fields</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {report.columns?.map((column) => (
                <Badge key={column} variant="secondary">
                  {column}
                </Badge>
              ))}
            </div>
          </div>
          {(report.rowGroups?.length || report.groupBy) && (
            <div>
              <p className="text-sm font-medium">Group Rows</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(report.rowGroups?.length
                  ? report.rowGroups
                  : [report.groupBy]
                )
                  .filter(Boolean)
                  .map((group) => (
                    <Badge key={group} variant="outline">
                      {group}
                    </Badge>
                  ))}
              </div>
            </div>
          )}
          {(report.columnGroups?.length || report.groupColumn) && (
            <div>
              <p className="text-sm font-medium">Group Columns</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(report.columnGroups?.length
                  ? report.columnGroups
                  : [report.groupColumn]
                )
                  .filter(Boolean)
                  .map((group) => (
                    <Badge key={group} variant="outline">
                      {group}
                    </Badge>
                  ))}
              </div>
            </div>
          )}
          {report.sortBy && (
            <div>
              <p className="text-sm font-medium">Sort By</p>
              <p className="text-sm text-muted-foreground">
                {report.sortBy} ({report.sortOrder || "desc"})
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      {result && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle>
                Report Results{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  ({filteredResultRows.length}
                  {filteredResultRows.length !== result.totalRows
                    ? ` of ${result.totalRows}`
                    : ""}{" "}
                  rows)
                </span>
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={resultSearch}
                  onChange={(event) => setResultSearch(event.target.value)}
                  placeholder="Search results..."
                  className="h-9 min-w-[220px] rounded-md border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  aria-label="Search results"
                />
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={activeResultDateField}
                  onChange={(event) => setResultDateField(event.target.value)}
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                  aria-label="Date field"
                >
                  <option value="">Filter by date/time</option>
                  {resultDateFields.map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
                <input
                  type="datetime-local"
                  value={resultFrom}
                  onChange={(event) => setResultFrom(event.target.value)}
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                  aria-label="From date and time"
                />
                <input
                  type="datetime-local"
                  value={resultTo}
                  onChange={(event) => setResultTo(event.target.value)}
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                  aria-label="To date and time"
                />
                {(resultSearch || resultFrom || resultTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setResultSearch("");
                      setResultFrom("");
                      setResultTo("");
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.summary && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(result.summary).map(([label, value]) => (
                  <Badge key={label} variant="outline">
                    {label}: {value}
                  </Badge>
                ))}
              </div>
            )}
            {result.pivot ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="sticky left-0 bg-muted/40 px-3 py-2">
                        {report.rowGroups?.join(" / ") || report.groupBy || "Group"}
                      </th>
                      {result.pivot.columns.map((column) => (
                        <th key={column} className="px-3 py-2 text-center">
                          {column}
                        </th>
                      ))}
                      {pivotIsAdditive && <th className="px-3 py-2 text-center">Total</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPivotRows.map((row) => {
                      const total = result.pivot!.columns.reduce(
                        (sum, column) => sum + Number(row.values[column] || 0),
                        0,
                      );
                      return (
                        <tr key={row.group} className="border-b hover:bg-muted/30">
                          <td className="sticky left-0 bg-background px-3 py-2 font-medium text-primary">
                            {Object.values(row.groupValues || {}).join(" / ") || row.group}
                          </td>
                          {result.pivot!.columns.map((column) => (
                            <td key={column} className="px-3 py-2 text-center">
                              {row.values[column] || 0}
                            </td>
                          ))}
                          {pivotIsAdditive && <td className="px-3 py-2 text-center font-semibold">{total}</td>}
                        </tr>
                      );
                    })}
                    {filteredPivotRows.length === 0 && (
                      <tr>
                        <td colSpan={result.pivot.columns.length + (pivotIsAdditive ? 2 : 1)} className="py-8 text-center text-sm text-muted-foreground">
                          No pivot groups match your search.
                        </td>
                      </tr>
                    )}
                    {pivotIsAdditive && filteredPivotRows.length > 0 && (
                      <tr className="border-t bg-muted/40 font-semibold">
                        <td className="sticky left-0 bg-muted/40 px-3 py-2">Total</td>
                        {result.pivot.columns.map((column) => (
                          <td key={column} className="px-3 py-2 text-center">
                            {filteredPivotRows.reduce((sum, row) => sum + Number(row.values[column] || 0), 0)}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center">
                          {filteredPivotRows.reduce((sum, row) => sum + Object.values(row.values).reduce((rowSum, value) => rowSum + Number(value || 0), 0), 0)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : result.groups && (report.groupBy || report.rowGroups?.length) ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      {result.columns.map((column) => (
                        <th key={column} className="px-3 py-2">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGroups.length === 0 ? (
                      <tr>
                        <td colSpan={result.columns.length} className="py-8 text-center text-sm text-muted-foreground">
                          No grouped records match your search or date range.
                        </td>
                      </tr>
                    ) : filteredGroups.flatMap((group) => [
                      <tr key={`group-${group.group}`} className="bg-muted/50">
                        <td
                          colSpan={result.columns.length}
                          className="px-3 py-2 font-semibold"
                        >
                          {Object.values(group.groupValues || {}).join(" / ") || group.group} ({group.count})
                        </td>
                      </tr>,
                      ...(group.rows || []).map((row, index) => (
                        <tr
                          key={`${group.group}-${index}`}
                          className="border-b"
                        >
                          {result.columns.map((column) => (
                            <td key={column} className="px-3 py-2">
                              {row[column] == null ? "-" : String(row[column])}
                            </td>
                          ))}
                        </tr>
                      )),
                    ])}
                  </tbody>
                </table>
              </div>
            ) : filteredResultRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No rows match the selected search or date/time range.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      {result.columns.map((column) => (
                        <th key={column} className="px-3 py-2">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResultRows.map((row, index) => (
                      <tr key={index} className="border-b">
                        {result.columns.map((column) => (
                          <td key={column} className="px-3 py-2">
                            {row[column] == null ? "-" : String(row[column])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}