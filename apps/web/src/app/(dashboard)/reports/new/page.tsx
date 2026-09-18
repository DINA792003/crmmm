

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  Filter,
  Play,
  Plus,
  Save,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Field {
  key: string;
  label: string;
  type: string;
  groupableInColumns?: boolean;
  groupableInRows?: boolean;
  isIdentifier?: boolean;
}
interface ReportObject {
  name: string;
  label: string;
  fields: Field[];
}
interface FilterRule {
  field: string;
  operator: string;
  value: string;
}
interface Aggregate {
  function: "count" | "sum" | "avg" | "min" | "max";
  field: string;
}
interface Result {
  columns: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  summary?: Record<string, number>;
  groups?: { group: string; groupValues?: Record<string, string>; count: number; summary: Record<string, number>; rows?: Record<string, unknown>[] }[];
  columnGroups?: { group: string; count: number }[];
  pivot?: {
    columns: string[];
    rows: { group: string; groupValues?: Record<string, string>; values: Record<string, number> }[];
    aggregateLabel?: string;
  };
}

const operators = [
  "equals",
  "notEquals",
  "contains",
  "startsWith",
  "endsWith",
  "gt",
  "gte",
  "lt",
  "lte",
];
const relativeDateOperators = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "thisWeek", label: "This Week" },
  { value: "lastWeek", label: "Last Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "thisYear", label: "This Year" },
  { value: "last90Days", label: "Last 90 Days" },
];
const crossFilterRelations: Record<string, string[]> = {
  Lead: ["Contact", "SiteVisit", "Opportunity", "Quotation", "Booking", "Task", "Customer"],
  Account: ["Contact", "Customer"],
  Opportunity: ["Quotation", "Booking", "Task", "Activity"],
  SiteVisit: ["Task", "Activity"],
  Quotation: ["Booking", "Approval", "QuotationItem"],
  Booking: ["Payment", "Activity"],
  Project: ["Lead", "SiteVisit", "Opportunity", "Quotation", "Booking", "Unit"],
};
const aggregateLabels = {
  count: "Record Count",
  sum: "Sum",
  avg: "Average",
  min: "Minimum",
  max: "Maximum",
};

export default function NewReportPage() {
  const router = useRouter();
  const [objects, setObjects] = React.useState<ReportObject[]>([]);
  const [selectedObject, setSelectedObject] = React.useState("");
  const [selectedFields, setSelectedFields] = React.useState<string[]>([]);
  const [filters, setFilters] = React.useState<FilterRule[]>([]);
  const [filterFieldPicker, setFilterFieldPicker] = React.useState("");
  const [groupBy, setGroupBy] = React.useState("");
  const [groupColumn, setGroupColumn] = React.useState("");
  const [rowGroups, setRowGroups] = React.useState<string[]>([]);
  const [columnGroups, setColumnGroups] = React.useState<string[]>([]);
  const [rowGroupSearch, setRowGroupSearch] = React.useState("");
  const [columnGroupSearch, setColumnGroupSearch] = React.useState("");
  const [rowGroupPickerOpen, setRowGroupPickerOpen] = React.useState(false);
  const [columnGroupPickerOpen, setColumnGroupPickerOpen] = React.useState(false);
  const [crossFilterObject, setCrossFilterObject] = React.useState("");
  const [crossFilterMode, setCrossFilterMode] = React.useState<"with" | "without">("with");
  const [sortBy, setSortBy] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [aggregates, setAggregates] = React.useState<Aggregate[]>([
    { function: "count", field: "" },
  ]);
  const [reportName, setReportName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [fieldSearch, setFieldSearch] = React.useState("");
  const [panel, setPanel] = React.useState<"outline" | "filters">("outline");
  const [result, setResult] = React.useState<Result | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [running, setRunning] = React.useState(false);
  const [hasRun, setHasRun] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [editingReportId, setEditingReportId] = React.useState<string | null>(null);
  const editHydrated = React.useRef(false);
  const [autoPreview, setAutoPreview] = React.useState(true);
  const [filterLogic, setFilterLogic] = React.useState<"AND" | "OR">("AND");
  const [filterLogicOpen, setFilterLogicOpen] = React.useState(false);
  const [formulaOpen, setFormulaOpen] = React.useState(false);
  const [formulaName, setFormulaName] = React.useState("");
  const [formulaExpression, setFormulaExpression] = React.useState("");
  const [showRowCounts, setShowRowCounts] = React.useState(true);
  const [showDetailRows, setShowDetailRows] = React.useState(true);
  const [showSubtotals, setShowSubtotals] = React.useState(false);
  const [showGrandTotal, setShowGrandTotal] = React.useState(true);
  const [showStackedSummaries, setShowStackedSummaries] = React.useState(true);

  const object = objects.find((item) => item.name === selectedObject);
  const fields = object?.fields || [];
  const canGroupInColumns = (field: Field) => {
    const key = field.key.toLowerCase();
    const label = field.label.toLowerCase();
    if (field.groupableInColumns === false || field.isIdentifier) return false;
    if (key === "id" || key.endsWith("id")) return false;
    if (label === "id" || label.endsWith(" id")) return false;
    return true;
  };
  const visibleFields = fields.filter((field) =>
    `${field.label} ${field.key}`
      .toLowerCase()
      .includes(fieldSearch.toLowerCase()),
  );
  const visibleRowGroupFields = fields.filter(
    (field) =>
      field.groupableInRows !== false &&
      !rowGroups.includes(field.key) &&
      `${field.label} ${field.key}`
        .toLowerCase()
        .includes(rowGroupSearch.toLowerCase()),
  );
  const visibleColumnGroupFields = fields.filter(
    (field) =>
      canGroupInColumns(field) &&
      !columnGroups.includes(field.key) &&
      `${field.label} ${field.key}`
        .toLowerCase()
        .includes(columnGroupSearch.toLowerCase()),
  );
  const numericFields = fields.filter((field) =>
    ["number", "currency", "decimal"].includes(field.type.toLowerCase()),
  );

  React.useEffect(() => {
    setEditingReportId(new URLSearchParams(window.location.search).get("edit"));
    fetch("/api/proxy/api/reports/metadata", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.success)
          throw new Error(body.error || "Unable to load report types");
        const data = (
          Array.isArray(body.data) ? body.data : body.data?.objects || []
        )
          .map((item: any) => ({
            name: item.name || item.objectName,
            label: item.label || item.name,
            fields: (item.fields || []).map((field: any) => ({
              key: field.key || field.name,
              label: field.label || field.key || field.name,
              type: field.type || "string",
              groupableInColumns: field.groupableInColumns !== false,
              groupableInRows: field.groupableInRows !== false,
              isIdentifier: field.isIdentifier === true,
            })),
          }))
          .filter((item: ReportObject) => item.name && item.fields.length);
        setObjects(data);
        const requested = new URLSearchParams(window.location.search).get(
          "object",
        );
        setSelectedObject(
          data.find((item: ReportObject) => item.name === requested)?.name ||
            data[0]?.name ||
            "",
        );
      })
      .catch((requestError) =>
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load report types",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    if (!object || !editingReportId || editHydrated.current) return;
    editHydrated.current = true;
    fetch(`/api/proxy/api/reports/${editingReportId}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.success) throw new Error(body.error || "Unable to load report");
        const saved = body.data;
        setReportName(saved.name || "");
        setDescription(saved.description || "");
        setSelectedObject(saved.objectName || object.name);
        setSelectedFields(Array.isArray(saved.columns) ? saved.columns : []);
        setFilters(Array.isArray(saved.filters) ? saved.filters : []);
        setFilterLogic(saved.filterLogic === "OR" ? "OR" : "AND");
        setCrossFilterObject(saved.crossFilter?.objectName || "");
        setCrossFilterMode(saved.crossFilter?.mode === "without" ? "without" : "with");
        setGroupBy(saved.groupBy || "");
        setGroupColumn(saved.groupColumn || "");
        setRowGroups(Array.isArray(saved.rowGroups) ? saved.rowGroups : saved.groupBy ? [saved.groupBy] : []);
        setColumnGroups(Array.isArray(saved.columnGroups) ? saved.columnGroups : saved.groupColumn ? [saved.groupColumn] : []);
        setSortBy(saved.sortBy || "");
        setSortOrder(saved.sortOrder === "asc" ? "asc" : "desc");
        setAggregates(Array.isArray(saved.aggregates) && saved.aggregates.length ? saved.aggregates : [{ function: "count", field: "" }]);
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load report"));
  }, [editingReportId, object]);

  React.useEffect(() => {
    if (!object) return;
    if (editingReportId && editHydrated.current) return;
    const defaults = object.fields.slice(0, 3).map((field) => field.key);
    setSelectedFields(defaults);
    setFilters([]);
    setFilterFieldPicker("");
    setGroupBy("");
    setGroupColumn("");
    setRowGroups([]);
    setColumnGroups([]);
    setRowGroupSearch("");
    setColumnGroupSearch("");
    setCrossFilterObject("");
    setCrossFilterMode("with");
    setSortBy(
      object.fields.some((field) => field.key === "createdAt")
        ? "createdAt"
        : object.fields[0]?.key || "",
    );
    setAggregates([{ function: "count", field: "" }]);
    setResult(null);
  }, [object, selectedObject]);

  const fieldLabel = (key: string) =>
    fields.find((field) => field.key === key)?.label || key;
  const fieldType = (key: string) => fields.find((field) => field.key === key)?.type.toLowerCase() || "string";
  const toggleField = (key: string) =>
    setSelectedFields((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  const addFilter = (field = filterFieldPicker || fields[0]?.key || "") =>
    setFilters((current) => [
      ...current,
      { field, operator: "equals", value: "" },
    ]);
  const addAggregate = () =>
    setAggregates((current) => [
      ...current,
      { function: "sum", field: numericFields[0]?.key || "" },
    ]);
  const addRowGroup = (field: string) => {
    if (!field || rowGroups.includes(field)) return;
    setRowGroups((current) => [...current, field]);
    if (!groupBy) setGroupBy(field);
  };
  const removeRowGroup = (field: string) => {
    setRowGroups((current) => current.filter((item) => item !== field));
    if (groupBy === field)
      setGroupBy(rowGroups.find((item) => item !== field) || "");
  };
  const addColumnGroup = (field: string) => {
    if (!field || columnGroups.includes(field)) return;
    setColumnGroups((current) => [...current, field]);
    if (!groupColumn) setGroupColumn(field);
  };
  const removeColumnGroup = (field: string) => {
    setColumnGroups((current) => current.filter((item) => item !== field));
    if (groupColumn === field) setGroupColumn(columnGroups.find((item) => item !== field) || "");
  };
  const validFilters = filters.filter(
    (filter) => filter.field && (filter.value !== "" || relativeDateOperators.some((operator) => operator.value === filter.operator)),
  );
  const validAggregates = aggregates.filter(
    (aggregate) => aggregate.function === "count" || aggregate.field,
  );
  const filterSummary =
    validFilters.length === 0
      ? "No filters"
      : `${validFilters.length} filter${validFilters.length === 1 ? "" : "s"} · ${filterLogic}`;

  const groupCountByField = React.useMemo(() => {
    const counts: Record<string, Record<string, number>> = {};
    for (const field of rowGroups) counts[field] = {};
    for (const group of result?.groups || []) {
      for (const field of rowGroups) {
        const value = group.groupValues?.[field] || "Unknown";
        counts[field][value] = (counts[field][value] || 0) + group.count;
      }
    }
    return counts;
  }, [result?.groups, rowGroups]);

  const formatGroupedValue = (field: string, value: string) => {
    const count = groupCountByField[field]?.[value] || 0;
    return showRowCounts && count > 0 ? `${value} (${count})` : value;
  };

  const runReport = async (preview = false) => {
    if (!selectedObject || selectedFields.length === 0) {
      setError("Select at least one field before running the report.");
      return;
    }
    try {
      setRunning(true);
      setError("");
      const response = await fetch("/api/proxy/api/reports/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectName: selectedObject,
          columns: selectedFields,
          filters: validFilters,
          crossFilter: crossFilterObject ? { objectName: crossFilterObject, mode: crossFilterMode } : null,
          filterLogic,
          groupBy: rowGroups[0] || undefined,
          groupColumn: columnGroups[0] || undefined,
          rowGroups,
          columnGroups,
          sortBy: sortBy || undefined,
          sortOrder,
          limit: preview ? 10 : 10000,
          aggregates: validAggregates,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success)
        throw new Error(body.error || body.message || "Unable to run report");
      setResult(body.data);
      if (!preview) setHasRun(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to run report",
      );
    } finally {
      setRunning(false);
    }
  };

  React.useEffect(() => {
    if (!autoPreview || !selectedObject || selectedFields.length === 0 || loading) return;
    const timer = window.setTimeout(() => void runReport(true), 250);
    return () => window.clearTimeout(timer);
  }, [autoPreview, selectedObject, selectedFields, filters, filterLogic, rowGroups, columnGroups, sortBy, sortOrder, loading]);

  const saveReport = async () => {
    if (!reportName.trim()) {
      setError("Enter a report name before saving.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const response = await fetch(editingReportId ? `/api/proxy/api/reports/${editingReportId}` : "/api/proxy/api/reports", {
        method: editingReportId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: reportName.trim(),
          description: description.trim() || null,
          type: groupBy ? "SUMMARY" : "TABULAR",
          objectName: selectedObject,
          columns: selectedFields,
          filters: validFilters,
          crossFilter: crossFilterObject ? { objectName: crossFilterObject, mode: crossFilterMode } : null,
          aggregates: validAggregates,
          groupBy: rowGroups[0] || null,
          groupColumn: columnGroups[0] || null,
          rowGroups,
          columnGroups,
          filterLogic,
          sortBy: sortBy || null,
          sortOrder,
          isShared: false,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success)
        throw new Error(body.error || body.message || "Unable to save report");
      setSaveOpen(false);
      router.push(`/reports/${body.data.id}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save report",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex min-h-[520px] items-center justify-center text-sm text-muted-foreground">
        Loading report builder...
      </div>
    );

  return (
    <div className="-m-4 flex min-h-[calc(100vh-64px)] flex-col bg-slate-50 md:-m-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/reports" aria-label="Back to reports">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              Report <ChevronDown className="h-3 w-3" />
            </div>
            <div className="flex items-center gap-2 text-lg font-semibold">
              {reportName || "Untitled Report"}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {object?.label || "Select a Report Type"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Undo" disabled>
            <span className="text-lg">↶</span>
          </Button>
          <Button variant="ghost" size="icon" aria-label="Redo" disabled>
            <span className="text-lg">↷</span>
          </Button>
          <label className="hidden items-center gap-2 text-xs text-muted-foreground xl:flex">
            <input
              type="checkbox"
              checked={autoPreview}
              onChange={(event) => setAutoPreview(event.target.checked)}
            />
            Update preview automatically
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSaveOpen(true)}
            disabled={!selectedFields.length}
          >
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
          <Button
            size="sm"
            onClick={() => void runReport()}
            disabled={running || !selectedFields.length}
          >
            <Play className="mr-2 h-4 w-4" />
            {running ? "Running..." : "Run"}
          </Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-b bg-white lg:w-72 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Fields
            </span>
            <button
              type="button"
              className="text-xs text-primary"
              onClick={() => setFieldSearch("")}
            >
              Reset
            </button>
          </div>
          <div className="flex border-b">
            <button
              className={`flex-1 px-4 py-3 text-sm font-medium ${panel === "outline" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
              onClick={() => setPanel("outline")}
            >
              Outline
            </button>
            <button
              className={`flex-1 px-4 py-3 text-sm font-medium ${panel === "filters" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
              onClick={() => setPanel("filters")}
            >
              <Filter className="mr-1 inline h-3.5 w-3.5" />
              Filters{" "}
              {validFilters.length > 0 && (
                <Badge className="ml-1 h-5 px-1.5">{validFilters.length}</Badge>
              )}
            </button>
          </div>
          {panel === "outline" ? (
            <div className="max-h-[calc(100vh-180px)] overflow-y-auto p-3">
              <section className="mb-4">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>Report Type</span>
                  <Settings2 className="h-4 w-4" />
                </div>
                <select
                  value={selectedObject}
                  onChange={(event) => setSelectedObject(event.target.value)}
                  className="h-9 w-full rounded-md border bg-white px-2 text-sm"
                >
                  <option value="">Select a Report Type</option>
                  {objects.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </section>
              <section className="mb-4">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>Groups</span>
                  <button
                    type="button"
                    aria-label="Clear groups"
                    onClick={() => {
                      setRowGroups([]);
                      setColumnGroups([]);
                      setGroupBy("");
                      setGroupColumn("");
                      setRowGroupSearch("");
                      setColumnGroupSearch("");
                      setRowGroupPickerOpen(false);
                      setColumnGroupPickerOpen(false);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Group Rows
                </div>
                <div className="relative">
                  <div className={`flex h-9 items-center rounded-md border bg-white ${rowGroupPickerOpen ? "border-primary ring-1 ring-primary/20" : "border-slate-300"}`}>
                    <Search className="ml-2.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <input
                    value={rowGroupSearch}
                    onFocus={() => setRowGroupPickerOpen(true)}
                    onChange={(event) => setRowGroupSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setRowGroupPickerOpen(false);
                      if (event.key === "Enter" && visibleRowGroupFields.length > 0) {
                        event.preventDefault();
                        addRowGroup(visibleRowGroupFields[0].key);
                        setRowGroupSearch("");
                      }
                    }}
                    onBlur={() => window.setTimeout(() => setRowGroupPickerOpen(false), 150)}
                    placeholder="Add group..."
                    aria-label="Search row group fields"
                    className="h-8 min-w-0 flex-1 bg-transparent px-2 text-xs outline-none"
                  />
                  </div>
                </div>
                {rowGroupPickerOpen && (
                  <div className="absolute z-50 mt-1 max-h-56 w-[calc(100%-1.5rem)] overflow-y-auto rounded-md border bg-white p-1 shadow-lg">
                    {!rowGroupSearch && <div className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Available Fields</div>}
                    {visibleRowGroupFields.length === 0 ? <div className="px-2 py-2 text-xs text-muted-foreground">No matching fields</div> : visibleRowGroupFields.map((field) => (
                      <button key={field.key} type="button" onMouseDown={(event) => { event.preventDefault(); addRowGroup(field.key); setRowGroupSearch(""); setRowGroupPickerOpen(true); }} className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-primary/10"><span>{field.label}</span><span className="text-[10px] text-slate-400">{field.key}</span></button>
                    ))}
                  </div>
                )}
                {rowGroups.map((field) => (
                  <div
                    key={field}
                    className="mb-1 flex items-center justify-between rounded-md bg-primary/5 px-2 py-1 text-xs text-primary"
                  >
                    <span>{fieldLabel(field)}</span>
                    <button
                      type="button"
                      onClick={() => removeRowGroup(field)}
                      aria-label={`Remove ${fieldLabel(field)} row group`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Group Columns
                </div>
                <div className="relative">
                  <div className={`flex h-9 items-center rounded-md border bg-white ${columnGroupPickerOpen ? "border-primary ring-1 ring-primary/20" : "border-slate-300"}`}>
                    <Search className="ml-2.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <input
                    value={columnGroupSearch}
                    onFocus={() => setColumnGroupPickerOpen(true)}
                    onChange={(event) => setColumnGroupSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setColumnGroupPickerOpen(false);
                      if (event.key === "Enter" && visibleColumnGroupFields.length > 0) {
                        event.preventDefault();
                        addColumnGroup(visibleColumnGroupFields[0].key);
                        setColumnGroupSearch("");
                      }
                    }}
                    onBlur={() => window.setTimeout(() => setColumnGroupPickerOpen(false), 150)}
                    placeholder="Add group..."
                    aria-label="Search column group fields"
                    className="h-8 min-w-0 flex-1 bg-transparent px-2 text-xs outline-none"
                  />
                  </div>
                </div>
                {columnGroupPickerOpen && (
                  <div className="absolute z-50 mt-1 max-h-56 w-[calc(100%-1.5rem)] overflow-y-auto rounded-md border bg-white p-1 shadow-lg">
                    {!columnGroupSearch && <div className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Available Fields</div>}
                    {visibleColumnGroupFields.length === 0 ? <div className="px-2 py-2 text-xs text-muted-foreground">No matching fields</div> : visibleColumnGroupFields.map((field) => (
                      <button key={field.key} type="button" onMouseDown={(event) => { event.preventDefault(); addColumnGroup(field.key); setColumnGroupSearch(""); setColumnGroupPickerOpen(true); }} className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-primary/10"><span>{field.label}</span><span className="text-[10px] text-slate-400">{field.key}</span></button>
                    ))}
                  </div>
                )}
                {columnGroups.map((field) => (
                  <div key={field} className="mb-1 flex items-center justify-between rounded-md bg-primary/5 px-2 py-1 text-xs text-primary">
                    <span>{fieldLabel(field)}</span>
                    <button type="button" onClick={() => removeColumnGroup(field)} aria-label={`Remove ${fieldLabel(field)} column group`}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </section>
              <section className="mb-4 border-t pt-4">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>Columns ({selectedFields.length})</span>
                  <button
                    className="text-primary"
                    onClick={() => setSelectedFields([])}
                  >
                    Clear
                  </button>
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={fieldSearch}
                    onChange={(event) => setFieldSearch(event.target.value)}
                    placeholder="Add column..."
                    aria-label="Search columns"
                    className="h-8 w-full rounded border bg-white pl-8 pr-2 text-xs outline-none focus:border-primary"
                  />
                </div>
                {selectedFields.map((key) => (
                  <div
                    key={key}
                    className="mb-1 flex items-center justify-between rounded-md bg-primary/5 px-2 py-1.5 text-sm text-primary"
                  >
                    <span>{fieldLabel(key)}</span>
                    <button
                      type="button"
                      onClick={() => toggleField(key)}
                      aria-label={`Remove ${fieldLabel(key)}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {visibleFields.filter((field) => !selectedFields.includes(field.key)).length > 0 && (
                  <div className="mt-1 max-h-32 overflow-y-auto rounded-md border bg-white p-1">
                    {visibleFields.filter((field) => !selectedFields.includes(field.key)).map((field) => (
                      <button
                        key={field.key}
                        type="button"
                        onClick={() => {
                          toggleField(field.key);
                          setFieldSearch("");
                        }}
                        className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-primary/10"
                      >
                        <span>{field.label}</span>
                        <span className="text-[10px] uppercase text-muted-foreground">{field.type}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedFields.length === 0 && !fieldSearch && (
                  <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                    Add columns from the search above.
                  </p>
                )}
              </section>
              <section className="mb-4">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>Summary Formulas</span>
                  <button
                    className="text-primary"
                    onClick={() => setFormulaOpen(true)}
                  >
                    + Create Formula
                  </button>
                </div>
                {formulaName && (
                  <div className="rounded-md bg-slate-100 px-2 py-1 text-xs">
                    {formulaName}: {formulaExpression}
                  </div>
                )}
              </section>
              <section>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Available Fields ({fields.length})
                </div>
                {visibleFields.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => toggleField(field.key)}
                    className={`mb-1 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ${selectedFields.includes(field.key) ? "bg-primary/10 font-medium text-primary" : "hover:bg-slate-100"}`}
                  >
                    <span>{field.label}</span>
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {field.type}
                    </span>
                  </button>
                ))}
              </section>
            </div>
          ) : (
            <div className="max-h-[calc(100vh-180px)] overflow-y-auto p-3">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Filters</h3>
                  <p className="text-xs text-muted-foreground">
                    {filterSummary}
                  </p>
                </div>
                <div className="flex gap-1">
                  <select
                    value={filterFieldPicker}
                    onChange={(event) => {
                      setFilterFieldPicker(event.target.value);
                      if (event.target.value) addFilter(event.target.value);
                    }}
                    className="h-9 max-w-36 rounded border bg-white px-2 text-xs"
                  >
                    <option value="">Add filter...</option>
                    {fields.map((field) => (
                      <option key={field.key} value={field.key}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilterLogicOpen(true)}
                  >
                    Logic
                  </Button>
                </div>
              </div>
              {filters.length === 0 && (
                <p className="rounded-md border border-dashed bg-slate-50 p-3 text-xs text-muted-foreground">
                  No filters. All records will be included.
                </p>
              )}
              {filters.map((filter, index) => (
                <div
                  key={index}
                  className="mb-2 rounded-md border bg-white p-2 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-muted-foreground">
                    <span className="truncate">{fieldLabel(filter.field)}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFilters((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      aria-label="Remove filter"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                  <div className="mt-1 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-1.5">
                    <select
                      value={filter.field}
                      aria-label={`Filter ${index + 1} field`}
                      onChange={(event) =>
                        setFilters((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, field: event.target.value }
                              : item,
                          ),
                        )
                      }
                      className="h-8 min-w-0 rounded border bg-white px-2 text-xs"
                    >
                      {fields.map((field) => (
                        <option key={field.key} value={field.key}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={filter.operator}
                      aria-label={`Filter ${index + 1} operator`}
                      onChange={(event) =>
                        setFilters((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, operator: event.target.value }
                              : item,
                          ),
                        )
                      }
                      className="h-8 min-w-0 rounded border bg-white px-2 text-xs"
                    >
                      {fieldType(filter.field).includes("date") && (
                        <optgroup label="Relative dates">
                          {relativeDateOperators.map((operator) => <option key={operator.value} value={operator.value}>{operator.label}</option>)}
                        </optgroup>
                      )}
                      <optgroup label="Comparison">
                        {operators.map((operator) => <option key={operator}>{operator}</option>)}
                      </optgroup>
                    </select>
                  </div>
                  {relativeDateOperators.some((operator) => operator.value === filter.operator) ? (
                    <p className="mt-1.5 rounded border bg-slate-50 px-2 py-1.5 text-xs text-muted-foreground">Uses the current calendar range.</p>
                  ) : (
                    <input
                      value={filter.value}
                      onChange={(event) =>
                        setFilters((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))
                      }
                      placeholder="Enter a value"
                      className="mt-1.5 h-8 w-full rounded border px-2 text-xs"
                    />
                  )}
                </div>
              ))}
              <section className="mt-6 border-t pt-4">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>Cross Filters</span>
                  {crossFilterObject && (
                    <button
                      type="button"
                      className="text-primary"
                      onClick={() => setCrossFilterObject("")}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <select
                  value={crossFilterObject}
                  onChange={(event) => setCrossFilterObject(event.target.value)}
                  className="h-9 w-full rounded border bg-white px-2 text-sm"
                >
                  <option value="">New Cross Filter</option>
                  {objects
                    .filter((item) => crossFilterRelations[selectedObject]?.includes(item.name))
                    .map((item) => (
                      <option key={item.name} value={item.name}>
                        {item.label}
                      </option>
                    ))}
                </select>
                {crossFilterObject && (
                  <div className="mt-2 space-y-2 rounded-md border bg-slate-50 p-2">
                    <select
                      value={crossFilterMode}
                      onChange={(event) => setCrossFilterMode(event.target.value as "with" | "without")}
                      className="h-8 w-full rounded border bg-white px-2 text-xs"
                      aria-label="Cross filter mode"
                    >
                      <option value="with">With related records</option>
                      <option value="without">Without related records</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                    {crossFilterMode === "with" ? "Include" : "Exclude"} records related to{" "}
                    {
                      objects.find((item) => item.name === crossFilterObject)
                        ?.label
                    }
                    .
                    </p>
                  </div>
                )}
              </section>
            </div>
          )}
        </aside>
        <main className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Preview</span>
              {result && (
                <Badge variant="secondary">{result.totalRows} records</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="h-8 rounded border bg-white px-2 text-xs"
              >
                <option value="">Sort by...</option>
                {fields.map((field) => (
                  <option key={field.key} value={field.key}>
                    {field.label}
                  </option>
                ))}
              </select>
              <select
                value={sortOrder}
                onChange={(event) =>
                  setSortOrder(event.target.value as "asc" | "desc")
                }
                className="h-8 rounded border bg-white px-2 text-xs"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
          {error && (
            <div className="m-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="min-h-[360px] overflow-auto bg-white p-4">
            {!result ? (
              <div className="flex min-h-[330px] flex-col items-center justify-center text-center text-muted-foreground">
                <h2 className="text-lg font-semibold text-slate-700">
                  Preview your report
                </h2>
                <p className="mt-1 text-sm">
                  Choose fields and click Run to see results.
                </p>
              </div>
            ) : result.rows.length === 0 ? (
              <div className="flex min-h-[330px] items-center justify-center text-lg text-muted-foreground">
                No results found
              </div>
            ) : rowGroups.length > 0 && result.groups && !columnGroups.length ? (
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700">Summary</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">Grouped by {rowGroups.map(fieldLabel).join(" · ")}</p>
                  </div>
                  <Badge variant="secondary">{result.totalRows} records</Badge>
                </div>
                <div className="overflow-x-auto rounded-sm border border-slate-300">
                  <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                    <thead><tr className="border-b border-slate-300 bg-slate-50">
                      {rowGroups.map((field) => <th key={field} className="border-r border-slate-300 px-3 py-2 font-semibold text-primary">{fieldLabel(field)}</th>)}
                      {Object.keys(result.groups[0]?.summary || {}).map((label) => <th key={label} className="border-r border-slate-300 px-3 py-2 text-center font-semibold text-primary">{label}</th>)}
                    </tr></thead>
                    <tbody>
                      {result.groups.map((group, index) => <tr key={`${group.group}-${index}`} className="border-b border-slate-200 hover:bg-slate-50">
                        {rowGroups.map((field) => <td key={field} className="border-r border-slate-200 px-3 py-2 font-medium text-primary">{formatGroupedValue(field, group.groupValues?.[field] || "Unknown")}</td>)}
                        {Object.keys(group.summary || {}).map((label) => <td key={label} className="border-r border-slate-200 px-3 py-2 text-center">{group.summary?.[label] ?? 0}</td>)}
                      </tr>)}
                      {showGrandTotal && <tr className="bg-slate-100 font-semibold">
                        {rowGroups.map((field, index) => <td key={field} className="border-r border-slate-300 px-3 py-2">{index === 0 ? "Grand Total" : ""}</td>)}
                        {Object.keys(result.summary || {}).map((label) => <td key={label} className="border-r border-slate-300 px-3 py-2 text-center">{result.summary?.[label] ?? 0}</td>)}
                      </tr>}
                    </tbody>
                  </table>
                </div>
                {showDetailRows && <section className="mt-5 border-t border-slate-200 pt-4">
                  <div className="mb-2 flex items-center gap-2"><h3 className="text-sm font-semibold text-slate-700">Details</h3><Badge variant="secondary">{hasRun ? result.totalRows : Math.min(result.totalRows, 10)} Rows</Badge></div>
                  <div className="overflow-x-auto rounded-sm border border-slate-300"><table className="w-full min-w-[900px] border-collapse text-left text-sm">
                    <thead><tr className="border-b border-slate-300 bg-slate-50">{result.columns.map((column) => <th key={column} className="border-r border-slate-300 px-3 py-2 font-semibold">{fieldLabel(column)}</th>)}</tr></thead>
                    <tbody>{result.rows.slice(0, hasRun ? result.rows.length : 10).map((row, index) => <tr key={index} className="border-b border-slate-200 hover:bg-slate-50">{result.columns.map((column) => <td key={column} className="border-r border-slate-200 px-3 py-2">{row[column] == null ? "-" : String(row[column])}</td>)}</tr>)}</tbody>
                  </table></div>
                </section>}
              </section>
            ) : result.pivot ? (
              <div className="space-y-4">
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700">Summary</h3>
                      {result.pivot.aggregateLabel && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{result.pivot.aggregateLabel}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">Grouped by {rowGroups.map(fieldLabel).join(" / ") || "rows"}</span>
                  </div>
                  <div className="overflow-x-auto rounded border">
                    <table className="w-full min-w-[650px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50">
                          <th className="whitespace-nowrap px-3 py-2 font-semibold">{rowGroups.map(fieldLabel).join(" / ") || "Group"}</th>
                          {result.pivot.columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-2 text-center font-semibold">{column}</th>)}
                          {(result.pivot.aggregateLabel?.startsWith("Record Count") || result.pivot.aggregateLabel?.startsWith("Sum")) && <th className="whitespace-nowrap px-3 py-2 text-center font-semibold">Total</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {result.pivot.rows.map((row) => {
                          const total = result.pivot!.columns.reduce((sum, column) => sum + Number(row.values[column] || 0), 0);
                          return <tr key={row.group} className="border-b hover:bg-slate-50"><td className="px-3 py-2 font-medium text-primary">{rowGroups.map((field) => formatGroupedValue(field, row.groupValues?.[field] || "Unknown")).join(" / ") || row.group}</td>{result.pivot!.columns.map((column) => <td key={column} className="px-3 py-2 text-center">{row.values[column] || 0}</td>)}{(result.pivot!.aggregateLabel?.startsWith("Record Count") || result.pivot!.aggregateLabel?.startsWith("Sum")) && <td className="px-3 py-2 text-center font-semibold">{total}</td>}</tr>;
                        })}
                        {(result.pivot.aggregateLabel?.startsWith("Record Count") || result.pivot.aggregateLabel?.startsWith("Sum")) && <tr className="bg-slate-50 font-semibold">
                          <td className="px-3 py-2">Total</td>
                          {result.pivot.columns.map((column) => <td key={column} className="px-3 py-2 text-center">{result.pivot!.rows.reduce((sum, row) => sum + Number(row.values[column] || 0), 0)}</td>)}
                          <td className="px-3 py-2 text-center">{result.pivot.rows.reduce((sum, row) => sum + Object.values(row.values).reduce((rowSum, value) => rowSum + Number(value || 0), 0), 0)}</td>
                        </tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
                <section>
                  <div className="mb-2 flex items-center gap-2 border-t pt-3">
                    <h3 className="text-sm font-semibold text-slate-700">Details</h3>
                    <Badge variant="secondary">{result.totalRows} Rows</Badge>
                  </div>
                  <div className="overflow-x-auto rounded border">
                    <table className="w-full min-w-[650px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50">
                          {result.columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold">{fieldLabel(column)}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.slice(0, hasRun ? result.rows.length : 10).map((row, index) => <tr key={index} className="border-b hover:bg-slate-50">{result.columns.map((column) => <td key={column} className="whitespace-nowrap px-3 py-2">{row[column] == null ? "-" : String(row[column])}</td>)}</tr>)}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            ) : (
              <table className="w-full min-w-[650px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    {result.columns.map((column) => (
                      <th
                        key={column}
                        className="whitespace-nowrap px-3 py-2 font-semibold"
                      >
                        {fieldLabel(column)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupBy && result.groups?.length
                    ? result.groups.flatMap((group, groupIndex) => [
                        <tr key={`group-${groupIndex}`} className="bg-primary/5">
                          <td colSpan={result.columns.length} className="px-3 py-2 font-semibold text-primary">
                            {rowGroups.map((field) => formatGroupedValue(field, group.groupValues?.[field] || "Unknown")).join(" / ") || `${fieldLabel(groupBy)}: ${group.group}`} <span className="font-normal text-muted-foreground">({group.count} records)</span>
                          </td>
                        </tr>,
                        ...(showDetailRows ? (group.rows || []).slice(0, hasRun ? group.rows?.length : 10) : [null]).map((row, rowIndex) => (
                          <tr key={`group-${groupIndex}-row-${rowIndex}`} className="border-b hover:bg-slate-50">
                            {result.columns.map((column) => (
                              <td key={column} className="whitespace-nowrap px-3 py-2">
                                {row?.[column] == null ? "-" : String(row[column])}
                              </td>
                            ))}
                          </tr>
                        )),
                      ])
                    : result.rows.slice(0, hasRun ? result.rows.length : 10).map((row, index) => (
                        <tr key={index} className="border-b hover:bg-slate-50">
                          {result.columns.map((column) => (
                            <td key={column} className="whitespace-nowrap px-3 py-2">
                              {row[column] == null ? "-" : String(row[column])}
                            </td>
                          ))}
                        </tr>
                      ))}
                </tbody>
              </table>
            )}
            {result && !hasRun && result.totalRows > 10 && <p className="mt-3 text-center text-xs text-muted-foreground">Previewing 10 of {result.totalRows} records. Click Run to show all records.</p>}
          </div>
          {result?.summary && (
            <div className="grid gap-3 border-t bg-slate-50 p-4 sm:grid-cols-3">
              {Object.entries(result.summary).map(([label, value]) => (
                <div key={label} className="rounded-md border bg-white p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
          )}
          {result?.columnGroups && result.columnGroups.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t bg-slate-50 p-4">
              <span className="w-full text-xs font-semibold uppercase tracking-wide text-muted-foreground">Group Columns</span>
              {result.columnGroups.map((group) => <Badge key={group.group} variant="outline">{group.group}: {group.count}</Badge>)}
            </div>
          )}
        </main>
      </div>
      <footer className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 border-t bg-white px-4 py-3 text-xs text-muted-foreground shadow-[0_-2px_8px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap">Row Counts<input type="checkbox" checked={showRowCounts} onChange={(event) => setShowRowCounts(event.target.checked)} className="h-4 w-4 accent-red-600" /></label>
          <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap">Detail Rows<input type="checkbox" checked={showDetailRows} onChange={(event) => setShowDetailRows(event.target.checked)} className="h-4 w-4 accent-red-600" /></label>
          <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap">Subtotals<input type="checkbox" checked={showSubtotals} onChange={(event) => setShowSubtotals(event.target.checked)} className="h-4 w-4 accent-red-600" /></label>
          <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap">Grand Total<input type="checkbox" checked={showGrandTotal} onChange={(event) => setShowGrandTotal(event.target.checked)} className="h-4 w-4 accent-red-600" /></label>
          <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap">Stacked Summaries<input type="checkbox" checked={showStackedSummaries} onChange={(event) => setShowStackedSummaries(event.target.checked)} className="h-4 w-4 accent-red-600" /></label>
        </div>
        <span className="hidden lg:inline">
          {selectedFields.length} columns · {validFilters.length} filters ·{" "}
          {groupBy ? `Grouped by ${fieldLabel(groupBy)}` : "No grouping"}
          {groupColumn ? ` · Columns: ${fieldLabel(groupColumn)}` : ""}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addAggregate}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Summary
          </Button>
          <Button variant="outline" size="sm" onClick={() => addFilter()}>
            <Filter className="mr-1 h-3.5 w-3.5" />
            Filter
          </Button>
        </div>
      </footer>
      {aggregates.length > 0 && (
        <div className="fixed bottom-12 left-1/2 z-10 hidden max-w-2xl -translate-x-1/2 items-center gap-2 rounded-lg border bg-white px-3 py-2 shadow-lg md:flex">
          {aggregates.map((aggregate, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded bg-slate-100 px-2 py-1 text-xs"
            >
              <select
                value={aggregate.function}
                onChange={(event) =>
                  setAggregates((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            function: event.target
                              .value as Aggregate["function"],
                          }
                        : item,
                    ),
                  )
                }
                className="bg-transparent font-medium"
              >
                <option value="count">Record Count</option>
                <option value="sum">Sum</option>
                <option value="avg">Average</option>
                <option value="min">Minimum</option>
                <option value="max">Maximum</option>
              </select>
              {aggregate.function !== "count" && (
                <select
                  value={aggregate.field}
                  onChange={(event) =>
                    setAggregates((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, field: event.target.value }
                          : item,
                      ),
                    )
                  }
                  className="max-w-32 bg-transparent"
                >
                  <option value="">Field</option>
                  {numericFields.map((field) => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() =>
                  setAggregates((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                aria-label="Remove summary"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {filterLogicOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="font-semibold">Edit Filter Logic</h2>
              <button
                onClick={() => setFilterLogicOpen(false)}
                aria-label="Close filter logic"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-sm text-muted-foreground">
                Choose how multiple filters are combined.
              </p>
              <select
                value={filterLogic}
                onChange={(event) => setFilterLogic(event.target.value as "AND" | "OR")}
                className="h-10 w-full rounded border bg-white px-3 text-sm"
              >
                <option value="AND">All filters must match (AND)</option>
                <option value="OR">Any filter can match (OR)</option>
              </select>
              <div className="flex justify-end">
                <Button onClick={() => setFilterLogicOpen(false)}>Apply</Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {formulaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="font-semibold">
                Edit Summary-Level Formula Column
              </h2>
              <button
                onClick={() => setFormulaOpen(false)}
                aria-label="Close formula dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <label className="text-sm font-medium">
                Column Name
                <input
                  value={formulaName}
                  onChange={(event) => setFormulaName(event.target.value)}
                  className="mt-2 h-10 w-full rounded border px-3"
                />
              </label>
              <label className="text-sm font-medium">
                Description
                <input className="mt-2 h-10 w-full rounded border px-3" />
              </label>
              <label className="text-sm font-medium md:col-span-2">
                Formula
                <textarea
                  value={formulaExpression}
                  onChange={(event) => setFormulaExpression(event.target.value)}
                  placeholder="Type your formula here..."
                  rows={5}
                  className="mt-2 w-full rounded border px-3 py-2 font-mono text-sm"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t bg-slate-50 px-5 py-4">
              <Button variant="outline" onClick={() => setFormulaOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setFormulaOpen(false)}>Apply</Button>
            </div>
          </div>
        </div>
      )}
      {saveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-xl font-semibold">Save Report</h2>
              <button
                onClick={() => setSaveOpen(false)}
                aria-label="Close save dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 p-6">
              <label className="block text-sm font-medium">
                Report Name
                <input
                  value={reportName}
                  onChange={(event) => setReportName(event.target.value)}
                  placeholder="Cancellation Reasons"
                  className="mt-2 h-10 w-full rounded border px-3"
                />
              </label>
              <label className="block text-sm font-medium">
                Report Description
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded border px-3 py-2"
                />
              </label>
              <label className="block text-sm font-medium">
                Folder
                <input
                  placeholder="Select Folder"
                  className="mt-2 h-10 w-full rounded border px-3"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t bg-slate-50 px-6 py-4">
              <Button variant="outline" onClick={() => setSaveOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void saveReport()} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
