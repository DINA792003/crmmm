

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
  Trash2,
  Undo2,
  Redo2,
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
type DateGroupBucket = "day" | "week" | "month" | "quarter" | "year";
interface ReportObject {
  name: string;
  label: string;
  fields: Field[];
}
interface FilterRule {
  field: string;
  operator: string;
  value: string | { start: string; end: string };
}
interface ColumnConfig {
  field: string;
  label: string;
  visible: boolean;
  aggregation: "none" | "count" | "uniqueCount" | "sum" | "avg" | "min" | "max";
}
interface Aggregate {
  function: "count" | "sum" | "avg" | "min" | "max";
  field: string;
}
interface BuilderSnapshot {
  selectedFields: string[];
  rowGroups: string[];
  columnGroups: string[];
  filters: FilterRule[];
  sortBy: string;
  sortOrder: "asc" | "desc";
  secondarySortBy: string;
  secondarySortOrder: "asc" | "desc";
}
interface Result {
  columns: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  summary?: Record<string, number>;
  groups?: { key?: string; group: string; groupValues?: Record<string, string>; count: number; summary: Record<string, number>; rows?: Record<string, unknown>[] }[];
  columnGroups?: { group: string; count: number }[];
  pivot?: {
    columns: string[];
    columnValues?: Record<string, Record<string, string>>;
    rows: { group: string; groupValues?: Record<string, string>; values: Record<string, number> }[];
    aggregateLabel?: string;
  };
}

interface GroupTreeNode {
  key: string;
  field: string;
  value: string;
  values: Record<string, string>;
  depth: number;
  count: number;
  summary: Record<string, number>;
  rows: Record<string, unknown>[];
  children: GroupTreeNode[];
}

function buildGroupTree(
  groups: NonNullable<Result["groups"]>,
  fields: string[],
): GroupTreeNode[] {
  const roots: GroupTreeNode[] = [];

  for (const group of groups) {
    let nodes = roots;
    let parentKey = "root";
    fields.forEach((field, depth) => {
      const value = group.groupValues?.[field] || "(Blank)";
      const key = `${parentKey}/${field}=${value}`;
      let node = nodes.find((candidate) => candidate.key === key);
      if (!node) {
        node = { key, field, value, values: {}, depth, count: 0, summary: {}, rows: [], children: [] };
        nodes.push(node);
      }
      node.values[field] = value;
      node.count += depth === fields.length - 1 ? group.count : 0;
      for (const [label, amount] of Object.entries(group.summary || {})) {
        node.summary[label] = (node.summary[label] || 0) + (depth === fields.length - 1 ? amount : 0);
      }
      if (depth === fields.length - 1) node.rows.push(...(group.rows || []));
      nodes = node.children;
      parentKey = key;
    });
  }

  const addParentTotals = (nodes: GroupTreeNode[]) => {
    for (const node of nodes) {
      addParentTotals(node.children);
      if (node.children.length) {
        node.count = node.children.reduce((sum, child) => sum + child.count, 0);
        node.summary = node.children.reduce<Record<string, number>>((totals, child) => {
          for (const [label, amount] of Object.entries(child.summary)) totals[label] = (totals[label] || 0) + amount;
          return totals;
        }, {});
      }
    }
  };
  addParentTotals(roots);
  return roots;
}

const operators = [
  "equals",
  "notEquals",
  "contains",
  "notContains",
  "startsWith",
  "endsWith",
  "gt",
  "gte",
  "lt",
  "lte",
  "isBlank",
  "isNotBlank",
  "in",
  "notIn",
];
const getAvailableOperators = (type: string) => {
  const normalized = type.toLowerCase();

  if (normalized.includes("date")) {
    return [
      "equals",
      "notEquals",
      "gt",
      "gte",
      "lt",
      "lte",
    ];
  }

  if (normalized === "number" || normalized === "currency" || normalized === "decimal") {
    return [
      "equals",
      "notEquals",
      "gt",
      "gte",
      "lt",
      "lte",
    ];
  }

  return operators;
};
const relativeDateOperators = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "thisWeek", label: "This Week" },
  { value: "lastWeek", label: "Last Week" },
  { value: "nextWeek", label: "Next Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "nextMonth", label: "Next Month" },
  { value: "thisQuarter", label: "This Quarter" },
  { value: "lastQuarter", label: "Last Quarter" },
  { value: "thisYear", label: "This Year" },
  { value: "lastYear", label: "Last Year" },
  { value: "last90Days", label: "Last 90 Days" },
  { value: "customRange", label: "Custom Date Range" },
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
  const [columnLabels, setColumnLabels] = React.useState<Record<string, string>>({});
  const [hiddenColumns, setHiddenColumns] = React.useState<string[]>([]);
  const [columnAggregations, setColumnAggregations] = React.useState<Record<string, ColumnConfig["aggregation"]>>({});
  const [filters, setFilters] = React.useState<FilterRule[]>([]);
  const [filterFieldPicker, setFilterFieldPicker] = React.useState("");
  const [filterFieldPickerOpen, setFilterFieldPickerOpen] = React.useState(false);
  const [groupBy, setGroupBy] = React.useState("");
  const [groupColumn, setGroupColumn] = React.useState("");
  const [rowGroups, setRowGroups] = React.useState<string[]>([]);
  const [columnGroups, setColumnGroups] = React.useState<string[]>([]);
    const [groupDateBuckets, setGroupDateBuckets] = React.useState<Record<string, DateGroupBucket>>({});
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({});
  const [rowGroupSearch, setRowGroupSearch] = React.useState("");
  const [columnGroupSearch, setColumnGroupSearch] = React.useState("");
  const [rowGroupPickerOpen, setRowGroupPickerOpen] = React.useState(false);
  const [columnGroupPickerOpen, setColumnGroupPickerOpen] = React.useState(false);
  const [rowGroupHighlight, setRowGroupHighlight] = React.useState(0);
  const [columnGroupHighlight, setColumnGroupHighlight] = React.useState(0);
  const rowGroupPickerRef = React.useRef<HTMLDivElement>(null);
  const columnGroupPickerRef = React.useRef<HTMLDivElement>(null);
  const columnPickerRef = React.useRef<HTMLDivElement>(null);
  const filterFieldPickerRef = React.useRef<HTMLDivElement>(null);
  const [crossFilterObject, setCrossFilterObject] = React.useState("");
  const [crossFilterMode, setCrossFilterMode] = React.useState<"with" | "without">("with");
  const [sortBy, setSortBy] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [secondarySortBy, setSecondarySortBy] = React.useState("");
  const [secondarySortOrder, setSecondarySortOrder] = React.useState<"asc" | "desc">("asc");
  const [aggregates, setAggregates] = React.useState<Aggregate[]>([
    { function: "count", field: "" },
  ]);
  const [reportName, setReportName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [fieldSearch, setFieldSearch] = React.useState("");
  const [columnPickerOpen, setColumnPickerOpen] = React.useState(false);
  const [panel, setPanel] = React.useState<"outline" | "filters">("outline");
  const [result, setResult] = React.useState<Result | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [running, setRunning] = React.useState(false);
  const [hasRun, setHasRun] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [showFolderPicker, setShowFolderPicker] = React.useState(false);
  const [reportUniqueName, setReportUniqueName] = React.useState("");
  const [folders, setFolders] = React.useState<{ id: string; name: string }[]>([]);
  const [folderSearch, setFolderSearch] = React.useState("");
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null);
  const [folderMenuOpen, setFolderMenuOpen] = React.useState(false);
  const [folderPickerSearch, setFolderPickerSearch] = React.useState("");
  const [editingReportId, setEditingReportId] = React.useState<string | null>(null);
  const editHydrated = React.useRef(false);
  const closingRef = React.useRef(false);
  const [autoPreview, setAutoPreview] = React.useState(true);
  const [filterLogic, setFilterLogic] = React.useState<"AND" | "OR">("AND");
  const [filterExpression, setFilterExpression] = React.useState("");
  const [filterLogicOpen, setFilterLogicOpen] = React.useState(false);
  const [filterActionsOpen, setFilterActionsOpen] = React.useState(false);
  const [rowLimitEditorOpen, setRowLimitEditorOpen] = React.useState(false);
  const [showRowCounts, setShowRowCounts] = React.useState(true);
  const [showDetailRows, setShowDetailRows] = React.useState(true);
  const [showSubtotals, setShowSubtotals] = React.useState(false);
  const [showGrandTotal, setShowGrandTotal] = React.useState(true);
  const [reportFormat, setReportFormat] = React.useState<"TABULAR" | "SUMMARY" | "MATRIX" | "JOINED">("TABULAR");
  const [rowLimit, setRowLimit] = React.useState(10000);
  const [showChart, setShowChart] = React.useState(false);
  const [conditionalFormatting, setConditionalFormatting] = React.useState(false);
  const [historyVersion, setHistoryVersion] = React.useState(0);
  const historyRef = React.useRef<BuilderSnapshot[]>([]);
  const futureRef = React.useRef<BuilderSnapshot[]>([]);
  const previousSnapshotRef = React.useRef<BuilderSnapshot | null>(null);
  const restoringSnapshotRef = React.useRef(false);

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

  const currentSnapshot = React.useMemo<BuilderSnapshot>(() => ({
    selectedFields,
    rowGroups,
    columnGroups,
    filters,
    sortBy,
    sortOrder,
    secondarySortBy,
    secondarySortOrder,
  }), [selectedFields, rowGroups, columnGroups, filters, sortBy, sortOrder, secondarySortBy, secondarySortOrder]);

  React.useEffect(() => {
    if (!previousSnapshotRef.current) {
      previousSnapshotRef.current = currentSnapshot;
      return;
    }
    if (restoringSnapshotRef.current) {
      restoringSnapshotRef.current = false;
      previousSnapshotRef.current = currentSnapshot;
      return;
    }
    if (JSON.stringify(previousSnapshotRef.current) !== JSON.stringify(currentSnapshot)) {
      historyRef.current = [...historyRef.current.slice(-19), previousSnapshotRef.current];
      futureRef.current = [];
      previousSnapshotRef.current = currentSnapshot;
      setHistoryVersion((version) => version + 1);
    }
  }, [currentSnapshot]);

  const restoreSnapshot = (snapshot: BuilderSnapshot) => {
    restoringSnapshotRef.current = true;
    setSelectedFields(snapshot.selectedFields);
    setRowGroups(snapshot.rowGroups);
    setColumnGroups(snapshot.columnGroups);
    setGroupBy(snapshot.rowGroups[0] || "");
    setGroupColumn(snapshot.columnGroups[0] || "");
    setFilters(snapshot.filters);
    setSortBy(snapshot.sortBy);
    setSortOrder(snapshot.sortOrder);
    setSecondarySortBy(snapshot.secondarySortBy);
    setSecondarySortOrder(snapshot.secondarySortOrder);
  };

  const undoBuilderChange = () => {
    const snapshot = historyRef.current.pop();
    if (!snapshot || !previousSnapshotRef.current) return;
    futureRef.current = [...futureRef.current, previousSnapshotRef.current];
    restoreSnapshot(snapshot);
    previousSnapshotRef.current = snapshot;
    setHistoryVersion((version) => version + 1);
  };

  const redoBuilderChange = () => {
    const snapshot = futureRef.current.pop();
    if (!snapshot || !previousSnapshotRef.current) return;
    historyRef.current = [...historyRef.current, previousSnapshotRef.current];
    restoreSnapshot(snapshot);
    previousSnapshotRef.current = snapshot;
    setHistoryVersion((version) => version + 1);
  };

  React.useEffect(() => {
    const handleOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      const pickerTarget = target instanceof Element ? target.closest("[data-group-picker]") : null;
      if (!rowGroupPickerRef.current?.contains(target) && pickerTarget?.getAttribute("data-group-picker") !== "rows") setRowGroupPickerOpen(false);
      if (!columnGroupPickerRef.current?.contains(target) && pickerTarget?.getAttribute("data-group-picker") !== "columns") setColumnGroupPickerOpen(false);
      if (!columnPickerRef.current?.contains(target) && pickerTarget?.getAttribute("data-column-picker") !== "columns") setColumnPickerOpen(false);
      if (!filterFieldPickerRef.current?.contains(target)) setFilterFieldPickerOpen(false);
    };
    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer);
  }, []);

  React.useEffect(() => {
    setRowGroupHighlight(0);
  }, [rowGroupSearch]);

  React.useEffect(() => {
    setColumnGroupHighlight(0);
  }, [columnGroupSearch]);

  React.useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setEditingReportId(new URLSearchParams(window.location.search).get("edit"));
    const requestedFormat = query.get("format");
    if (["TABULAR", "SUMMARY", "MATRIX", "JOINED"].includes(requestedFormat || "")) setReportFormat(requestedFormat as "TABULAR" | "SUMMARY" | "MATRIX" | "JOINED");
    setSelectedFolderId(query.get("folderId"));
    fetch("/api/proxy/api/reports/metadata", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.success)
          throw new Error(body.error || "Unable to load report types");
        const data = (
          Array.isArray(body.data) ? body.data : body.data?.objects || []
        )
          .map((item: any) => ({
            name: item.name || item.objectName || item.object,
            label: item.label || item.name || item.object,
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
        const requestedObject = requested && requested !== "undefined" ? requested : "";
        setSelectedObject(
          data.find((item: ReportObject) => item.name === requestedObject)?.name ||
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
    if (!saveOpen) return;

    fetch("/api/proxy/api/report-folders?view=all", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.success) throw new Error(body.error || "Unable to load folders");
        setFolders(Array.isArray(body.data) ? body.data : []);
      })
      .catch(() => setFolders([]));
  }, [saveOpen]);

  React.useEffect(() => {
    if (!object || !editingReportId || editHydrated.current) return;
    editHydrated.current = true;
    fetch(`/api/proxy/api/reports/${editingReportId}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.success) throw new Error(body.error || "Unable to load report");
        const saved = body.data;
        const savedObjectName = saved.objectName || object.name;
        const savedObject = objects.find((item) => item.name === savedObjectName) || object;
        const savedColumns = Array.isArray(saved.columns)
          ? saved.columns.filter((field: unknown): field is string => typeof field === "string" && savedObject.fields.some((item) => item.key === field))
          : [];
        setReportName(saved.name || "");
        setDescription(saved.description || "");
        if (["TABULAR", "SUMMARY", "MATRIX", "JOINED"].includes(saved.type)) setReportFormat(saved.type);
        setSelectedObject(savedObjectName);
        setSelectedFields(savedColumns.length ? savedColumns : savedObject.fields.slice(0, 3).map((field) => field.key));
        const savedConfig = saved.config && typeof saved.config === "object" ? saved.config : {};
        setColumnLabels(savedConfig.columnLabels || {});
        setHiddenColumns(Array.isArray(savedConfig.hiddenColumns) ? savedConfig.hiddenColumns : []);
        setColumnAggregations(savedConfig.columnAggregations || {});
        setRowLimit(Number(savedConfig.rowLimit) || 10000);
        setShowChart(savedConfig.showChart === true);
        setConditionalFormatting(savedConfig.conditionalFormatting === true);
        setShowRowCounts(savedConfig.showRowCounts !== false);
        setShowDetailRows(savedConfig.showDetailRows !== false);
        setShowSubtotals(savedConfig.showSubtotals === true);
        setShowGrandTotal(savedConfig.showGrandTotal !== false);
        setFilters(Array.isArray(saved.filters) ? saved.filters : []);
        setFilterLogic(saved.filterLogic === "OR" ? "OR" : "AND");
        setFilterExpression(saved.filterExpression || "");
        setCrossFilterObject(saved.crossFilter?.objectName || "");
        setCrossFilterMode(saved.crossFilter?.mode === "without" ? "without" : "with");
        const savedRowGroups = Array.isArray(saved.rowGroups)
          ? saved.rowGroups
          : Array.isArray(savedConfig.rowGroups)
            ? savedConfig.rowGroups
            : saved.groupBy
              ? [saved.groupBy]
              : [];
        const savedColumnGroups = Array.isArray(saved.columnGroups)
          ? saved.columnGroups
          : Array.isArray(savedConfig.columnGroups)
            ? savedConfig.columnGroups
            : saved.groupColumn
              ? [saved.groupColumn]
              : [];
        const normalizedRowGroups = savedRowGroups.filter((field: unknown): field is string => typeof field === "string" && !savedColumnGroups.includes(field));
        const normalizedColumnGroups = normalizedRowGroups.length ? savedColumnGroups : [];
        setGroupBy(saved.groupBy && !normalizedColumnGroups.includes(saved.groupBy) ? saved.groupBy : normalizedRowGroups[0] || "");
        setGroupColumn(saved.groupColumn && normalizedColumnGroups.includes(saved.groupColumn) ? saved.groupColumn : normalizedColumnGroups[0] || "");
        setSelectedFolderId(saved.folderId || saved.folder?.id || null);
        setFolderSearch(saved.folder?.name || "");
        setRowGroups(normalizedRowGroups);
        setColumnGroups(normalizedColumnGroups);
          setGroupDateBuckets(savedConfig.groupDateBuckets || {});
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
      setGroupDateBuckets({});
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
  const columnLabel = (key: string) => columnLabels[key] || fieldLabel(key);
  const allowedAggregations = (key: string): ColumnConfig["aggregation"][] =>
    ["number", "currency", "decimal"].includes(fieldType(key))
      ? ["none", "sum", "avg", "min", "max", "count", "uniqueCount"]
      : ["none", "count", "uniqueCount"];
  const removeFieldFromColumns = (key: string) => {
    setSelectedFields((current) => {
      const next = current.filter((item) => item !== key);
      if (next.length !== current.length && next.length === 0) {
        setResult(null);
        setHasRun(false);
      }
      return next;
    });
  };
  const toggleField = (key: string) => {
    const isSelected = selectedFields.includes(key);
    if (!isSelected) {
      setRowGroups((current) => current.filter((item) => item !== key));
      setColumnGroups((current) => current.filter((item) => item !== key));
      if (groupBy === key) setGroupBy("");
      if (groupColumn === key) setGroupColumn("");
    }
    setSelectedFields((current) => {
      const next = isSelected
        ? current.filter((item) => item !== key)
        : [...current, key];
      if (next.length === 0) {
        setResult(null);
        setHasRun(false);
      }
      return next;
    });
  };
  const clearSelectedFields = () => {
    setSelectedFields([]);
    setResult(null);
    setHasRun(false);
  };
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
    if (!field || rowGroups.includes(field)) {
      if (field) setError(`${fieldLabel(field)} is already grouped.`);
      return;
    }
    const nextRowGroups = rowGroups.filter((item) => item !== field);
    if (nextRowGroups.length >= 2) {
      setError("You can add up to 2 row groupings.");
      return;
    }
    if (columnGroups.includes(field)) {
      setColumnGroups((current) => current.filter((item) => item !== field));
      if (groupColumn === field) setGroupColumn(columnGroups.find((item) => item !== field) || "");
    }
    removeFieldFromColumns(field);
    setRowGroups((current) => [...current.filter((item) => item !== field), field]);
    if (fieldType(field) === "date") setGroupDateBuckets((current) => ({ ...current, [field]: current[field] || "day" }));
    if (!groupBy) setGroupBy(field);
    setRowGroupPickerOpen(false);
    setError("");
  };
  const moveGroup = (groups: string[], setGroups: React.Dispatch<React.SetStateAction<string[]>>, field: string, direction: -1 | 1) => {
    const index = groups.indexOf(field);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= groups.length) return;
    setGroups((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };
  const reorderGroup = (field: string, axis: "rows" | "columns", targetIndex: number) => {
    const setGroups = axis === "rows" ? setRowGroups : setColumnGroups;
    setGroups((current) => {
      const sourceIndex = current.indexOf(field);
      if (sourceIndex < 0 || sourceIndex === targetIndex) return current;
      const next = [...current];
      next.splice(sourceIndex, 1);
      next.splice(Math.min(targetIndex, next.length), 0, field);
      return next;
    });
  };
  const moveColumn = (field: string, direction: -1 | 1) => moveGroup(selectedFields, setSelectedFields, field, direction);
  const removeRowGroup = (field: string) => {
    const nextRowGroups = rowGroups.filter((item) => item !== field);
    setRowGroups(nextRowGroups);
    if (nextRowGroups.length === 0) {
      setColumnGroups([]);
      setGroupColumn("");
    }
    if (groupBy === field)
      setGroupBy(rowGroups.find((item) => item !== field) || "");
    setCollapsedGroups((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };
  const addColumnGroup = (field: string) => {
    if (!field || columnGroups.includes(field)) {
      if (field) setError(`${fieldLabel(field)} is already grouped.`);
      return;
    }
    const nextColumnGroups = columnGroups.filter((item) => item !== field);
    if (nextColumnGroups.length >= 2) {
      setError("You can add up to 2 column groupings.");
      return;
    }
    if (rowGroups.includes(field)) {
      setRowGroups((current) => current.filter((item) => item !== field));
      if (groupBy === field) setGroupBy(rowGroups.find((item) => item !== field) || "");
    }
    removeFieldFromColumns(field);
    setColumnGroups((current) => [...current.filter((item) => item !== field), field]);
    if (fieldType(field) === "date") setGroupDateBuckets((current) => ({ ...current, [field]: current[field] || "day" }));
    if (!groupColumn) setGroupColumn(field);
    setColumnGroupPickerOpen(false);
    setError("");
  };
  const removeColumnGroup = (field: string) => {
    setColumnGroups((current) => current.filter((item) => item !== field));
    if (groupColumn === field) setGroupColumn(columnGroups.find((item) => item !== field) || "");
  };
  const moveGroupBetweenAxes = (field: string, from: "rows" | "columns", to: "rows" | "columns") => {
    if (from === to) return;
    if (to === "rows") {
      if (rowGroups.length >= 2) {
        setError("You can add up to 2 row groupings.");
        return;
      }
      if (rowGroups.includes(field)) return;
      setRowGroups((current) => [...current, field]);
      setColumnGroups((current) => current.filter((item) => item !== field));
      setGroupBy(rowGroups[0] || field);
      if (groupColumn === field) setGroupColumn(columnGroups.find((item) => item !== field) || "");
    } else {
      if (columnGroups.length >= 2) {
        setError("You can add up to 2 column groupings.");
        return;
      }
      if (columnGroups.includes(field)) return;
      setColumnGroups((current) => [...current, field]);
      setRowGroups((current) => current.filter((item) => item !== field));
      setGroupColumn(columnGroups[0] || field);
      if (groupBy === field) setGroupBy(rowGroups.find((item) => item !== field) || "");
    }
    setError("");
  };
  const handleGroupDrop = (event: React.DragEvent, axis: "rows" | "columns") => {
    event.preventDefault();
    const field = event.dataTransfer.getData("text/plain");
    const from = event.dataTransfer.getData("group-axis");
    if (!field) return;
    if (from === "fields") {
      if (axis === "rows") addRowGroup(field);
      else addColumnGroup(field);
    } else if (from === "rows" || from === "columns") {
      moveGroupBetweenAxes(field, from, axis);
    }
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

  const runReport = async (preview = false): Promise<Result | null> => {
    if (!selectedObject || selectedFields.length === 0) {
      setError("Select at least one field before running the report.");
      return null;
    }
    try {
      setRunning(true);
      setError("");
      const response = await fetch("/api/proxy/api/reports/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectName: selectedObject,
          columns: selectedFields.filter((field) => !hiddenColumns.includes(field)),
          filters: validFilters,
          filterExpression: filterExpression.trim() || undefined,
          crossFilter: crossFilterObject ? { objectName: crossFilterObject, mode: crossFilterMode } : null,
          filterLogic,
          groupBy: rowGroups[0] || undefined,
          groupColumn: columnGroups[0] || undefined,
          rowGroups,
          columnGroups,
          groupOptions: Object.fromEntries(Object.entries(groupDateBuckets).map(([field, dateBucket]) => [field, { dateBucket }])),
          sortBy: sortBy || undefined,
          sortOrder,
          sortRules: [sortBy && { field: sortBy, order: sortOrder }, secondarySortBy && { field: secondarySortBy, order: secondarySortOrder }].filter(Boolean),
          limit: preview ? Math.min(rowLimit, 20) : rowLimit,
          aggregates: [...validAggregates, ...selectedFields.filter((field) => !hiddenColumns.includes(field) && columnAggregations[field] && columnAggregations[field] !== "none").map((field) => ({ function: columnAggregations[field] === "uniqueCount" ? "uniqueCount" : columnAggregations[field], field, label: columnLabel(field) }))],
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success)
        throw new Error(body.error || body.message || "Unable to run report");
      setResult(body.data);
      if (!preview) setHasRun(true);
      return body.data;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to run report",
      );
      return null;
    } finally {
      setRunning(false);
    }
  };

  React.useEffect(() => {
    if (closingRef.current || !autoPreview || !selectedObject || selectedFields.length === 0 || loading) return;
    const timer = window.setTimeout(() => void runReport(true), 250);
    return () => window.clearTimeout(timer);
  }, [autoPreview, selectedObject, selectedFields, filters, filterLogic, filterExpression, rowGroups, columnGroups, groupDateBuckets, sortBy, sortOrder, secondarySortBy, secondarySortOrder, rowLimit, loading]);

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
          uniqueName: reportUniqueName.trim() || undefined,
          config: { columnLabels, hiddenColumns, columnAggregations, filterExpression, rowLimit, showChart, conditionalFormatting, reportFormat, showRowCounts, showDetailRows, showSubtotals, showGrandTotal, groupDateBuckets, rowGroups, columnGroups },
          description: description.trim() || undefined,
          type: reportFormat,
          objectName: selectedObject,
          columns: selectedFields.filter((field) => !hiddenColumns.includes(field)),
          filters: validFilters,
          filterExpression: filterExpression.trim() || undefined,
          crossFilter: crossFilterObject ? { objectName: crossFilterObject, mode: crossFilterMode } : null,
          aggregates: [...validAggregates, ...selectedFields.filter((field) => !hiddenColumns.includes(field) && columnAggregations[field] && columnAggregations[field] !== "none").map((field) => ({ function: columnAggregations[field] === "uniqueCount" ? "uniqueCount" : columnAggregations[field], field, label: columnLabel(field) }))],
          groupBy: rowGroups[0] || undefined,
          groupColumn: columnGroups[0] || undefined,
          rowGroups,
          columnGroups,
          groupOptions: Object.fromEntries(Object.entries(groupDateBuckets).map(([field, dateBucket]) => [field, { dateBucket }])),
          filterLogic,
          sortBy: sortBy || undefined,
          sortOrder,
          sortRules: [sortBy && { field: sortBy, order: sortOrder }, secondarySortBy && { field: secondarySortBy, order: secondarySortOrder }].filter(Boolean),
          rowLimit,
          chart: showChart ? { enabled: true } : undefined,
          conditionalFormatting: conditionalFormatting ? { enabled: true } : undefined,
          folderId: selectedFolderId || undefined,
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

  const runAndPreviewReport = async () => {
    setAutoPreview(false);
    const previewResult = await runReport();
    if (!previewResult) return;
    const previewId = editingReportId || "new";
    sessionStorage.setItem(`report-preview:${previewId}`, JSON.stringify({
      result: previewResult,
      report: {
        id: previewId,
        name: reportName || "Untitled Report",
        description,
        type: reportFormat,
        objectName: selectedObject,
        columns: selectedFields.filter((field) => !hiddenColumns.includes(field)),
        filters: validFilters,
        filterLogic,
        aggregates: validAggregates,
        groupBy: rowGroups[0] || null,
        groupColumn: columnGroups[0] || null,
        rowGroups,
        columnGroups,
        crossFilter: crossFilterObject ? { objectName: crossFilterObject, mode: crossFilterMode } : null,
        sortBy: sortBy || null,
        sortOrder,
        config: { showRowCounts, showDetailRows, showSubtotals, showGrandTotal, rowGroups, columnGroups, groupDateBuckets },
      },
    }));
    router.push(editingReportId ? `/reports/${encodeURIComponent(editingReportId)}` : "/reports/preview");
  };

  const closeReportBuilder = () => {
    closingRef.current = true;
    setAutoPreview(false);
    historyRef.current = [];
    futureRef.current = [];
    const destination = editingReportId ? `/reports/${encodeURIComponent(editingReportId)}` : "/reports";
    window.location.replace(destination);
  };

  const filteredFolders = folders.filter((folder) =>
    folder.name.toLowerCase().includes(folderSearch.toLowerCase()),
  );
  const filteredPickerFolders = folders.filter((folder) =>
    folder.name.toLowerCase().includes(folderPickerSearch.toLowerCase()),
  );
  const selectedFolderName =
    folders.find((folder) => folder.id === selectedFolderId)?.name || "Private Reports";
  const pivotColumnHeaders = result?.pivot?.columns.map((column) => ({
    label: column,
    primary: result.pivot?.columnValues?.[column]?.[columnGroups[0]] || column,
    secondary: columnGroups.length > 1 ? result.pivot?.columnValues?.[column]?.[columnGroups[1]] || "(Blank)" : "",
  })) || [];
  const displayGroups = React.useMemo(() => {
    if (!result || !rowGroups.length) return [];
    if (result.groups?.length) return result.groups;
    const grouped = new Map<string, NonNullable<Result["groups"]>[number]>();
    for (const row of result.rows) {
      const groupValues = Object.fromEntries(rowGroups.map((field) => [field, row[field] == null || row[field] === "" ? "(Blank)" : String(row[field])]));
      const group = Object.values(groupValues).join(" / ") || "All records";
      const current = grouped.get(group);
      if (current) {
        current.count += 1;
        current.rows = [...(current.rows || []), row];
      } else {
        grouped.set(group, { group, groupValues, count: 1, summary: {}, rows: [row] });
      }
    }
    return [...grouped.values()];
  }, [result, rowGroups]);
  const groupTree = displayGroups.length && rowGroups.length ? buildGroupTree(displayGroups, rowGroups) : [];
  const renderGroupTree = (nodes: GroupTreeNode[]): React.ReactNode[] => nodes.flatMap((node) => {
    const collapsed = Boolean(collapsedGroups[node.key] || collapsedGroups[node.field]);
    const summaryLabels = Object.keys(node.summary);
    const detailRows = showDetailRows && node.children.length === 0 && !collapsed
      ? node.rows.slice(0, hasRun ? node.rows.length : 20)
      : [];
    return [
      <tr key={node.key} className={`border-b border-slate-200 hover:bg-slate-50 ${node.depth === 0 ? "font-medium" : "text-slate-700"}`}>
        {rowGroups.map((field, index) => <td key={field} className="border-r border-slate-200 px-3 py-2" style={{ paddingLeft: `${12 + (node.depth > 0 && index === node.depth ? 20 : 0)}px` }}>
          {index === node.depth && <button type="button" onClick={() => setCollapsedGroups((current) => ({ ...current, [node.key]: !collapsed }))} className="mr-1 text-[10px]" aria-label={`${collapsed ? "Expand" : "Collapse"} ${node.value}`}>{collapsed ? "▶" : "▼"}</button>}
          {index === node.depth ? formatGroupedValue(field, node.value) : ""}
        </td>)}
        {showRowCounts && <td className="border-r border-slate-200 px-3 py-2 text-center">{node.count}</td>}
        {summaryLabels.map((label) => <td key={label} className="border-r border-slate-200 px-3 py-2 text-center">{node.summary[label] ?? 0}</td>)}
      </tr>,
      ...(!collapsed ? renderGroupTree(node.children) : []),
      ...detailRows.map((row, rowIndex) => <tr key={`${node.key}-detail-${rowIndex}`} className="border-b border-slate-100 bg-slate-50/40">
        <td colSpan={rowGroups.length + (showRowCounts ? 1 : 0) + summaryLabels.length} className="p-0">
          <div className="grid min-w-[700px] border-l-2 border-primary/20 text-xs text-slate-600" style={{ gridTemplateColumns: `repeat(${result?.columns.length || 1}, minmax(120px, 1fr))` }}>
            {result?.columns.map((column) => <div key={column} className="border-r border-slate-100 px-3 py-1.5"><span className="mr-1 text-[10px] font-medium text-slate-400">{fieldLabel(column)}:</span>{row[column] == null ? "-" : String(row[column])}</div>)}
          </div>
        </td>
      </tr>),
      ...(showSubtotals && node.children.length === 0 ? [<tr key={`${node.key}-subtotal`} className="border-b bg-slate-50 font-semibold"><td colSpan={rowGroups.length + (showRowCounts ? 1 : 0)} className="px-3 py-2 text-right">Subtotal</td>{summaryLabels.map((label) => <td key={label} className="px-3 py-2 text-center">{node.summary[label] ?? 0}</td>)}</tr>] : []),
    ];
  });
  const renderTabularGroupTree = (nodes: GroupTreeNode[]): React.ReactNode[] => nodes.flatMap((node) => {
    const collapsed = Boolean(collapsedGroups[node.key] || collapsedGroups[node.field]);
    return [
      <tr key={`${node.key}-header`} className="border-b border-slate-300 bg-primary/5 hover:bg-primary/10">
        {rowGroups.map((field, index) => <td key={field} className="border-r border-slate-200 px-3 py-2 font-semibold text-primary">
          {index === node.depth && <><button type="button" onClick={() => setCollapsedGroups((current) => ({ ...current, [node.key]: !collapsed }))} className="mr-2 text-[10px]" aria-label={`${collapsed ? "Expand" : "Collapse"} ${node.value}`}>{collapsed ? "▶" : "▼"}</button>{node.value}{showRowCounts && <span className="ml-1 font-normal text-muted-foreground">({node.count})</span>}</>}
        </td>)}
        {(result?.columns || []).map((column) => <td key={column} className="border-r border-slate-200 px-3 py-2" />)}
      </tr>,
      ...(!collapsed ? renderTabularGroupTree(node.children) : []),
      ...(!collapsed && showDetailRows && node.children.length === 0 ? node.rows.slice(0, hasRun ? node.rows.length : 20).map((row, rowIndex) => <tr key={`${node.key}-detail-${rowIndex}`} className="border-b border-slate-200 hover:bg-slate-50">
        {rowGroups.map((field) => <td key={field} className="border-r border-slate-200 px-3 py-2" />)}
        {result?.columns.map((column) => <td key={column} className="border-r border-slate-200 px-3 py-2">{row[column] == null ? "-" : String(row[column])}</td>)}
      </tr>) : []),
      ...(showSubtotals && node.children.length === 0 ? [<tr key={`${node.key}-subtotal`} className="border-b bg-slate-50 font-semibold"><td colSpan={rowGroups.length + (result?.columns.length || 0)} className="px-3 py-2 text-right">Subtotal: {node.count}</td></tr>] : []),
    ];
  });
  const renderSummaryGroupRows = (nodes: GroupTreeNode[]): React.ReactElement[] => nodes.flatMap((node) => {
    if (node.children.length) return renderSummaryGroupRows(node.children);
    return [
      <tr key={`${node.key}-summary`} className="border-b border-slate-200 hover:bg-slate-50">
        {rowGroups.map((field) => <td key={field} className="border-r border-slate-200 px-3 py-2 text-primary">{node.values[field] || "(Blank)"}</td>)}
        {showRowCounts && <td className="border-r border-slate-200 px-3 py-2 text-center">{node.count}</td>}
      </tr>,
    ];
  });

  if (loading)
    return (
      <div className="flex min-h-[520px] items-center justify-center text-sm text-muted-foreground">
        Loading report builder...
      </div>
    );

  return (
    <div className="-m-4 flex min-h-[calc(100vh-64px)] flex-col bg-slate-50 md:-m-6">
      <header className="border-b bg-white shadow-sm">
        <div className="flex min-h-[76px] flex-wrap items-center justify-between gap-4 px-5 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="shrink-0">
              <Link href={editingReportId ? `/reports/${encodeURIComponent(editingReportId)}` : "/reports"} aria-label="Back to reports">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>

            <div className="flex min-w-0 items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-bold uppercase text-[#b52d2d]">
                <span>Report</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </div>

              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-800">
                  {reportName || "Untitled Report"}
                </h1>
                <span className="shrink-0 rounded-md bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
                  {object?.name || "Select a Report Type"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <div className="flex overflow-hidden rounded-full border border-slate-400">
              <Button key={`undo-${historyVersion}`} variant="ghost" size="icon" aria-label="Undo" title="Undo" onClick={undoBuilderChange} disabled={historyRef.current.length === 0}><Undo2 className="h-4 w-4" /></Button>
              <Button key={`redo-${historyVersion}`} variant="ghost" size="icon" aria-label="Redo" title="Redo" className="border-l" onClick={redoBuilderChange} disabled={futureRef.current.length === 0}><Redo2 className="h-4 w-4" /></Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => {
                if (editingReportId) {
                  void saveReport();
                } else {
                  setSaveOpen(true);
                }
              }}
              disabled={saving || running || !selectedFields.length}
            >Save &amp; Run</Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => {
                if (editingReportId) {
                  void saveReport();
                } else {
                  setSaveOpen(true);
                }
              }}
              disabled={saving || !selectedFields.length}
            >
              Save {!editingReportId && <ChevronDown className="ml-2 h-3.5 w-3.5" />}
            </Button>
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={closeReportBuilder}>Close</Button>
            <Button type="button" size="sm" className="rounded-full bg-[#d94444] hover:bg-[#bd3636]" onClick={runAndPreviewReport} disabled={running || !selectedFields.length}><Play className="mr-2 h-4 w-4" />{running ? "Running..." : "Run"}</Button>
          </div>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-b bg-white lg:w-72 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b px-3 py-2.5">
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
            <div className="max-h-[calc(100vh-180px)] overflow-y-auto px-4 py-4">
              <section className="relative mb-7">
                <div className="mb-4 flex items-center justify-between text-lg font-semibold text-slate-500">
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
                <div className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-slate-500">
                  <span className="text-base text-slate-500">▤</span> Group Rows
                </div>
                <div ref={rowGroupPickerRef} className="relative">
                  <div
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleGroupDrop(event, "rows")}
                    className={`flex h-9 items-center rounded-md border bg-white ${rowGroupPickerOpen ? "border-primary ring-1 ring-primary/20" : "border-slate-300"}`}
                  >
                    <Search className="ml-2.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <input
                    value={rowGroupSearch}
                    onFocus={() => setRowGroupPickerOpen(true)}
                    onChange={(event) => setRowGroupSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setRowGroupPickerOpen(false);
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setRowGroupHighlight((current) => Math.min(current + 1, Math.max(visibleRowGroupFields.length - 1, 0)));
                      }
                      if (event.key === "ArrowUp") {
                        event.preventDefault();
                        setRowGroupHighlight((current) => Math.max(current - 1, 0));
                      }
                      if (event.key === "Enter" && visibleRowGroupFields[rowGroupHighlight]) {
                        event.preventDefault();
                        addRowGroup(visibleRowGroupFields[rowGroupHighlight].key);
                        setRowGroupSearch("");
                      }
                    }}
                    placeholder="Add group..."
                    aria-label="Search row group fields"
                    className="h-8 min-w-0 flex-1 bg-transparent px-2 text-xs outline-none"
                  />
                  </div>
                </div>
                {rowGroupPickerOpen && (
                  <div data-group-picker="rows" className="absolute z-50 mt-1 max-h-56 w-[calc(100%-1.5rem)] overflow-y-auto rounded-md border bg-white p-1 shadow-lg">
                    {!rowGroupSearch && <div className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Available Fields</div>}
                    {visibleRowGroupFields.length === 0 ? <div className="px-2 py-2 text-xs text-muted-foreground">No matching fields</div> : visibleRowGroupFields.map((field) => (
                      <button key={field.key} type="button" draggable onDragStart={(event) => { event.dataTransfer.setData("text/plain", field.key); event.dataTransfer.setData("group-axis", "fields"); }} onMouseDown={(event) => { event.preventDefault(); addRowGroup(field.key); setRowGroupSearch(""); }} className={`flex w-full items-center rounded px-2 py-1.5 text-left text-xs ${visibleRowGroupFields[rowGroupHighlight]?.key === field.key ? "bg-primary/10" : "hover:bg-primary/10"}`}><span>{field.label}</span></button>
                    ))}
                  </div>
                )}
                {rowGroups.map((field, index) => (
                  <div
                    key={field}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", field);
                      event.dataTransfer.setData("group-axis", "rows");
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const draggedField = event.dataTransfer.getData("text/plain");
                      const from = event.dataTransfer.getData("group-axis") as "rows" | "columns";
                      if (draggedField && from === "rows") reorderGroup(draggedField, "rows", index);
                      if (draggedField && from === "columns") moveGroupBetweenAxes(draggedField, from, "rows");
                    }}
                    className="group mb-2 flex min-h-10 items-center justify-between rounded-xl border border-transparent bg-slate-100 px-3 py-2 text-sm text-[#5c211d] transition-colors hover:bg-slate-200"
                  >
                    <span className="min-w-0 truncate">{fieldLabel(field)}</span>
                    <button
                      title="Remove group"
                      type="button"
                      onClick={() => removeRowGroup(field)}
                      aria-label={`Remove ${fieldLabel(field)} row group`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {rowGroups.length > 0 && <div className="mb-3 mt-8 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-slate-500">
                  <span className="text-base text-slate-500">▥</span> Group Columns
                </div>}
                {rowGroups.length > 0 && <>
                <div ref={columnGroupPickerRef} className="relative">
                  <div
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleGroupDrop(event, "columns")}
                    className={`flex h-9 items-center rounded-md border bg-white ${columnGroupPickerOpen ? "border-primary ring-1 ring-primary/20" : "border-slate-300"}`}
                  >
                    <Search className="ml-2.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <input
                    value={columnGroupSearch}
                    onFocus={() => setColumnGroupPickerOpen(true)}
                    onChange={(event) => setColumnGroupSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setColumnGroupPickerOpen(false);
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setColumnGroupHighlight((current) => Math.min(current + 1, Math.max(visibleColumnGroupFields.length - 1, 0)));
                      }
                      if (event.key === "ArrowUp") {
                        event.preventDefault();
                        setColumnGroupHighlight((current) => Math.max(current - 1, 0));
                      }
                      if (event.key === "Enter" && visibleColumnGroupFields[columnGroupHighlight]) {
                        event.preventDefault();
                        addColumnGroup(visibleColumnGroupFields[columnGroupHighlight].key);
                        setColumnGroupSearch("");
                      }
                    }}
                    placeholder="Add group..."
                    aria-label="Search column group fields"
                    className="h-8 min-w-0 flex-1 bg-transparent px-2 text-xs outline-none"
                  />
                  </div>
                </div>
                {columnGroupPickerOpen && (
                  <div data-group-picker="columns" className="absolute z-50 mt-1 max-h-56 w-[calc(100%-1.5rem)] overflow-y-auto rounded-md border bg-white p-1 shadow-lg">
                    {!columnGroupSearch && <div className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Available Fields</div>}
                    {visibleColumnGroupFields.length === 0 ? <div className="px-2 py-2 text-xs text-muted-foreground">No matching fields</div> : visibleColumnGroupFields.map((field) => (
                      <button key={field.key} type="button" draggable onDragStart={(event) => { event.dataTransfer.setData("text/plain", field.key); event.dataTransfer.setData("group-axis", "fields"); }} onMouseDown={(event) => { event.preventDefault(); addColumnGroup(field.key); setColumnGroupSearch(""); }} className={`flex w-full items-center rounded px-2 py-1.5 text-left text-xs ${visibleColumnGroupFields[columnGroupHighlight]?.key === field.key ? "bg-primary/10" : "hover:bg-primary/10"}`}><span>{field.label}</span></button>
                    ))}
                  </div>
                )}
                {columnGroups.map((field, index) => (
                  <div
                    key={field}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", field);
                      event.dataTransfer.setData("group-axis", "columns");
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const draggedField = event.dataTransfer.getData("text/plain");
                      const from = event.dataTransfer.getData("group-axis") as "rows" | "columns";
                      if (draggedField && from === "columns") reorderGroup(draggedField, "columns", index);
                      if (draggedField && from === "rows") moveGroupBetweenAxes(draggedField, from, "columns");
                    }}
                    className="group mb-2 flex min-h-10 items-center justify-between rounded-xl border border-transparent bg-slate-100 px-3 py-2 text-sm text-[#5c211d] transition-colors hover:bg-slate-200"
                  >
                    <span className="min-w-0 truncate">{fieldLabel(field)}</span>
                    <button type="button" onClick={() => removeColumnGroup(field)} aria-label={`Remove ${fieldLabel(field)} column group`}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                </>}
              </section>
              <section className="mb-4 border-t border-slate-300 pt-7">
                <div className="mb-3 flex items-center justify-between text-lg font-semibold text-slate-500">
                  <span>Columns ({selectedFields.length})</span>
                  <button
                    className="text-primary"
                    onClick={clearSelectedFields}
                  >
                    Clear
                  </button>
                </div>
                <div ref={columnPickerRef} className="relative">
                  <div className={`flex h-9 items-center rounded-md border bg-white ${columnPickerOpen ? "border-primary ring-1 ring-primary/20" : "border-slate-300"}`}>
                    <Search className="ml-2.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <input
                      value={fieldSearch}
                      onFocus={() => setColumnPickerOpen(true)}
                      onChange={(event) => setFieldSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") setColumnPickerOpen(false);
                      }}
                      placeholder="Add column..."
                      aria-label="Search columns"
                      className="h-8 min-w-0 flex-1 bg-transparent px-2 text-xs outline-none"
                    />
                  </div>
                  {columnPickerOpen && (
                  <div data-column-picker="columns" className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-white p-1 shadow-lg">
                    {!fieldSearch && <div className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Available Fields</div>}
                    {visibleFields.filter((field) => !selectedFields.includes(field.key)).length === 0 ? <div className="px-2 py-2 text-xs text-muted-foreground">No matching fields</div> : visibleFields.filter((field) => !selectedFields.includes(field.key)).map((field) => (
                      <button
                        key={field.key}
                        type="button"
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", field.key);
                          event.dataTransfer.setData("group-axis", "fields");
                        }}
                        onClick={() => {
                          toggleField(field.key);
                          setFieldSearch("");
                          setColumnPickerOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-primary/10"
                      >
                        <span>{field.label}</span>
                      </button>
                    ))}
                  </div>
                  )}
                </div>
                {selectedFields.map((key) => (
                  <div key={key} className="mb-2 rounded-xl border border-transparent bg-slate-100 px-3 py-2 text-sm text-[#5c211d]">
                    <div className="flex items-center justify-between gap-1">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{columnLabel(key)}</span>
                      <button type="button" onClick={() => toggleField(key)} aria-label={`Remove ${fieldLabel(key)}`}><X className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
                {selectedFields.length === 0 && !fieldSearch && (
                  <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                    Add columns from the search above.
                  </p>
                )}
              </section>
            </div>
          ) : (
            <div className="max-h-[calc(100vh-180px)] overflow-y-auto p-2">
              <div className="relative mb-4 flex items-center justify-between px-1">
                <div>
                  <h3 className="text-base font-semibold text-slate-500">Filters</h3>
                  <p className="text-xs text-muted-foreground">{filterSummary}</p>
                </div>
                <button type="button" onClick={() => setFilterActionsOpen((current) => !current)} aria-label="Filter actions" className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-500 text-[#b52d2d] hover:bg-slate-100">
                  <ChevronDown className={`h-4 w-4 transition-transform ${filterActionsOpen ? "rotate-180" : ""}`} />
                </button>
                {filterActionsOpen && <div className="absolute right-0 top-11 z-50 w-52 rounded-lg border bg-white p-1 shadow-lg">
                  <button type="button" className="w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100" onClick={() => { setFilterActionsOpen(false); setFilterLogicOpen(true); }}>Add Filter Logic</button>
                  <button type="button" className="w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100" onClick={() => { setFilterActionsOpen(false); setRowLimitEditorOpen(true); }}>Add Row Limit</button>
                </div>}
              </div>
              {rowLimitEditorOpen && (
                <label className="mb-3 block rounded-lg border bg-slate-50 p-2 text-xs font-medium text-muted-foreground">
                  Row Limit
                  <input type="number" min={1} max={10000} value={rowLimit} onChange={(event) => setRowLimit(Math.max(1, Math.min(10000, Number(event.target.value) || 1)))} className="mt-1 h-9 w-full rounded border bg-white px-2 text-sm text-slate-700" aria-label="Row limit" />
                </label>
              )}
              <div ref={filterFieldPickerRef} className="relative mb-3" onMouseLeave={() => setFilterFieldPickerOpen(false)}>
                <div className={`flex h-11 items-center rounded-xl border-2 bg-white ${filterFieldPickerOpen ? "border-primary ring-1 ring-primary/20" : "border-slate-300"}`}>
                  <Search className="ml-3 h-4 w-4 text-muted-foreground" />
                  <input
                    value={filterFieldPicker}
                    onFocus={() => setFilterFieldPickerOpen(true)}
                    onChange={(event) => { setFilterFieldPicker(event.target.value); setFilterFieldPickerOpen(true); }}
                    onKeyDown={(event) => { if (event.key === "Escape") setFilterFieldPickerOpen(false); }}
                    placeholder="Add filter..."
                    aria-label="Add filter"
                    className="h-9 min-w-0 flex-1 bg-transparent px-2 text-base text-slate-600 outline-none"
                  />
                </div>
                {filterFieldPickerOpen && (
                  <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border bg-white p-1 shadow-lg">
                    {fields.filter((field) => `${field.label} ${field.key}`.toLowerCase().includes(filterFieldPicker.toLowerCase())).map((field) => (
                      <button
                        key={field.key}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          addFilter(field.key);
                          setFilterFieldPicker("");
                          setFilterFieldPickerOpen(false);
                        }}
                        className="flex w-full items-center rounded px-3 py-2 text-left text-sm hover:bg-primary/10"
                      >
                        {field.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <label className="mb-3 block text-xs font-medium text-muted-foreground">Advanced Filter Logic
                <input value={filterExpression} onChange={(event) => setFilterExpression(event.target.value)} placeholder="Example: (1 AND 2) OR (3 AND 4)" className="mt-1 h-9 w-full rounded border bg-white px-2 text-xs outline-none focus:border-primary" />
              </label>
              {filters.length === 0 && (
                <p className="rounded-md border border-dashed bg-slate-50 p-3 text-xs text-muted-foreground">
                  No filters. All records will be included.
                </p>
              )}
              {filters.map((filter, index) => (
                <div
                  key={index}
                  className="mb-2 rounded-xl border-2 border-slate-300 bg-white p-2.5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-muted-foreground">
                    <span className="truncate text-sm font-semibold text-slate-500">{fieldLabel(filter.field)}</span>
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
                  <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-1.5">
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
                      className="h-9 min-w-0 rounded border bg-white px-2 text-sm"
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
                      className="h-9 min-w-0 rounded border bg-white px-2 text-sm"
                    >
                      {fieldType(filter.field).includes("date") && (
                        <optgroup label="Relative dates">
                          {relativeDateOperators.map((operator) => <option key={operator.value} value={operator.value}>{operator.label}</option>)}
                        </optgroup>
                      )}
                      <optgroup label="Comparison">
                        {getAvailableOperators(fieldType(filter.field)).map((operator) => <option key={operator} value={operator}>{operator}</option>)}
                      </optgroup>
                    </select>
                  </div>
                  {filter.operator === "isBlank" || filter.operator === "isNotBlank" ? (
                    <p className="mt-1.5 rounded border bg-slate-50 px-2 py-1.5 text-sm text-muted-foreground">Checks whether this field has a value.</p>
                  ) : filter.operator === "customRange" ? (
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5"><input type="date" value={typeof filter.value === "object" ? filter.value.start : ""} onChange={(event) => setFilters((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, value: { start: event.target.value, end: typeof item.value === "object" ? item.value.end : "" } } : item))} className="h-8 rounded border px-2 text-xs" /><input type="date" value={typeof filter.value === "object" ? filter.value.end : ""} onChange={(event) => setFilters((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, value: { start: typeof item.value === "object" ? item.value.start : "", end: event.target.value } } : item))} className="h-8 rounded border px-2 text-xs" /></div>
                  ) : relativeDateOperators.some((operator) => operator.value === filter.operator) ? (
                    <p className="mt-1.5 rounded border bg-slate-50 px-2 py-1.5 text-xs text-muted-foreground">Uses the current calendar range.</p>
                  ) : (
                    <input
                      value={typeof filter.value === "object" ? "" : filter.value}
                      onChange={(event) =>
                        setFilters((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))
                      }
                      placeholder="Enter a value"
                      className="mt-1.5 h-8 w-full rounded border px-2 text-xs"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </aside>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex min-h-8 items-center justify-between border-b bg-slate-100 px-2 text-xs text-slate-700">
            <div className="flex min-w-0 items-center gap-2">
              {result && !hasRun && result.totalRows > 20 && <><span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">✓</span><span className="truncate font-semibold">Previewing a limited number of records. Run the report to see everything.</span></>}
            </div>
            <label className="ml-3 flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap">
              <span>Update Preview Automatically</span>
              <input type="checkbox" checked={autoPreview} onChange={(event) => setAutoPreview(event.target.checked)} className="peer sr-only" aria-label="Update Preview Automatically" />
              <span className="relative h-5 w-9 rounded-full bg-slate-400 transition-colors peer-checked:bg-red-500 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
            </label>
          </div>
          {error && (
            <div className="m-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-auto bg-white p-0">
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
            ) : rowGroups.length > 0 && !columnGroups.length ? (
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700">Summary</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">Grouped by {rowGroups.map(fieldLabel).join(" · ")}</p>
                  </div>
                  <Badge variant="secondary">{result.totalRows} records</Badge>
                </div>
                <div className="overflow-x-auto rounded-sm border border-slate-300">
                  <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                    <thead><tr className="border-b border-slate-300 bg-slate-50">
                      {rowGroups.map((field) => <th key={field} className="border-r border-slate-300 px-3 py-2 font-semibold text-primary">{fieldLabel(field)}</th>)}
                      {showDetailRows && result.columns.map((column) => <th key={column} className="border-r border-slate-300 px-3 py-2 font-semibold">{fieldLabel(column)}</th>)}
                      {!showDetailRows && showRowCounts && <th className="border-r border-slate-300 px-3 py-2 text-center font-semibold">Record Count</th>}
                    </tr></thead>
                    <tbody>
                      {showDetailRows ? renderTabularGroupTree(groupTree) : renderSummaryGroupRows(groupTree)}
                      {showGrandTotal && <tr className="bg-slate-100 font-semibold"><td colSpan={rowGroups.length + (showDetailRows ? result.columns.length : showRowCounts ? 1 : 0)} className="px-3 py-2">Grand Total: {result.totalRows} records</td></tr>}
                    </tbody>
                  </table>
                </div>
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
                        {columnGroups.length > 1 ? <>
                          <tr className="border-b bg-slate-50">
                            <th rowSpan={2} className="whitespace-nowrap px-3 py-2 font-semibold">{rowGroups.map(fieldLabel).join(" / ") || "Group"}</th>
                            {pivotColumnHeaders.reduce<{ label: string; span: number }[]>((headers, column) => {
                              const existing = headers.find((header) => header.label === column.primary);
                              if (existing) existing.span += 1;
                              else headers.push({ label: column.primary, span: 1 });
                              return headers;
                            }, []).map((header) => <th key={header.label} colSpan={header.span} className="whitespace-nowrap border-l px-3 py-2 text-center font-semibold">{header.label}</th>)}
                            {showSubtotals && <th rowSpan={2} className="whitespace-nowrap px-3 py-2 text-center font-semibold">Total</th>}
                          </tr>
                          <tr className="border-b bg-slate-50/80">{pivotColumnHeaders.map((column) => <th key={column.label} className="whitespace-nowrap border-l px-3 py-1.5 text-center text-xs font-medium text-muted-foreground">{column.secondary}</th>)}</tr>
                        </> : <tr className="border-b bg-slate-50">
                          <th className="whitespace-nowrap px-3 py-2 font-semibold">{rowGroups.map(fieldLabel).join(" / ") || "Group"}</th>
                          {result.pivot.columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-2 text-center font-semibold">{column}</th>)}
                          {showSubtotals && <th className="whitespace-nowrap px-3 py-2 text-center font-semibold">Total</th>}
                        </tr>}
                      </thead>
                      <tbody>
                        {result.pivot.rows.map((row, rowIndex) => {
                          const total = result.pivot!.columns.reduce((sum, column) => sum + Number(row.values[column] || 0), 0);
                          const rowKey = `pivot-${row.group}-${rowIndex}`;
                          const collapsed = Boolean(collapsedGroups[rowKey]);
                          return <React.Fragment key={rowKey}><tr className="border-b hover:bg-slate-50"><td className="px-3 py-2 font-medium text-primary"><button type="button" onClick={() => setCollapsedGroups((current) => ({ ...current, [rowKey]: !collapsed }))} className="mr-1 text-[10px]" aria-label={`${collapsed ? "Expand" : "Collapse"} ${row.group}`}>{collapsed ? "▶" : "▼"}</button>{rowGroups.map((field) => row.groupValues?.[field] || "(Blank)").join(" / ") || row.group}{showRowCounts && <span className="ml-1 font-normal text-muted-foreground">({total})</span>}</td>{result.pivot!.columns.map((column) => <td key={column} className="px-3 py-2 text-center">{row.values[column] || 0}</td>)}{showSubtotals && <td className="px-3 py-2 text-center font-semibold">{total}</td>}</tr></React.Fragment>;
                        })}
                        {showGrandTotal && <tr className="bg-slate-50 font-semibold">
                          <td className="px-3 py-2">Total</td>
                          {result.pivot.columns.map((column) => <td key={column} className="px-3 py-2 text-center">{result.pivot!.rows.reduce((sum, row) => sum + Number(row.values[column] || 0), 0)}</td>)}
                          {showSubtotals && <td className="px-3 py-2 text-center">{result.pivot.rows.reduce((sum, row) => sum + Object.values(row.values).reduce((rowSum, value) => rowSum + Number(value || 0), 0), 0)}</td>}
                        </tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
                {showDetailRows && <section>
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
                        {result.rows.slice(0, hasRun ? result.rows.length : 20).map((row, index) => <tr key={index} className="border-b hover:bg-slate-50">{result.columns.map((column) => <td key={column} className="whitespace-nowrap px-3 py-2">{row[column] == null ? "-" : String(row[column])}</td>)}</tr>)}
                      </tbody>
                    </table>
                  </div>
                </section>}
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
                        ...(showDetailRows ? (group.rows || []).slice(0, hasRun ? group.rows?.length : 20) : [null]).map((row, rowIndex) => (
                          <tr key={`group-${groupIndex}-row-${rowIndex}`} className="border-b hover:bg-slate-50">
                            {result.columns.map((column) => (
                              <td key={column} className="whitespace-nowrap px-3 py-2">
                                {row?.[column] == null ? "-" : String(row[column])}
                              </td>
                            ))}
                          </tr>
                        )),
                      ])
                    : result.rows.slice(0, hasRun ? result.rows.length : 20).map((row, index) => (
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
          </div>
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
        </div>
        <span className="hidden lg:inline">
          {selectedFields.length} columns · {validFilters.length} filters ·{" "}
          {groupBy ? `Grouped by ${fieldLabel(groupBy)}` : "No grouping"}
          {groupColumn ? ` · Columns: ${fieldLabel(groupColumn)}` : ""}
        </span>
      </footer>
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
      {saveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-[22px] border border-slate-200 bg-[#f4f4f4] shadow-[0_20px_45px_rgba(15,23,42,0.15)]">
            <div className="flex items-center justify-center border-b border-slate-200 px-6 py-4">
              <h2 className="text-4xl font-semibold tracking-tight text-slate-800">Save Report</h2>
            </div>

            <div className="space-y-5 p-6">
              <label className="block text-[1.05rem] font-semibold text-slate-800">
                <span className="text-red-600">*</span> Report Name
                <input
                  value={reportName}
                  onChange={(event) => setReportName(event.target.value)}
                  placeholder="New Notes With leads Report"
                  className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block text-[1.05rem] font-semibold text-slate-800">
                Report Unique Name
                <div className="relative mt-2">
                  <input
                    value={reportUniqueName}
                    onChange={(event) => setReportUniqueName(event.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                    i
                  </span>
                </div>
              </label>

              <label className="block text-[1.05rem] font-semibold text-slate-800">
                Report Description
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  className="mt-2 h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <div className="block text-[1.05rem] font-semibold text-slate-800">
                <span>Folder</span>
                <div className="mt-2 flex gap-3">
                  <input
                    value={selectedFolderName}
                    readOnly
                    placeholder="Private Reports"
                    className="h-12 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-lg text-slate-800 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFolderPicker(true)}
                    className="h-12 min-w-[140px] rounded-xl border border-red-500 bg-white px-4 text-lg font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    Select Folder
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 bg-[#f4f4f4] px-6 py-4">
              <button
                type="button"
                onClick={() => setShowFolderPicker(true)}
                className="h-12 min-w-[140px] rounded-xl border border-slate-300 bg-white px-4 text-lg font-medium text-slate-700 transition hover:bg-slate-100"
              >
                New Folder
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSaveOpen(false)}
                  className="h-12 min-w-[120px] rounded-xl border border-slate-300 bg-white px-4 text-lg font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveReport()}
                  disabled={saving}
                  className="h-12 min-w-[120px] rounded-xl bg-red-600 px-4 text-lg font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFolderPicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-4xl overflow-hidden rounded-[22px] border border-slate-200 bg-[#f4f4f4] shadow-[0_25px_60px_rgba(15,23,42,0.2)]">
            <div className="flex items-center justify-center border-b border-slate-200 px-6 py-5">
              <h2 className="text-4xl font-semibold tracking-tight text-slate-800">Select Folder</h2>
            </div>

            <div className="px-6 py-4">
              <div className="mb-4 rounded-xl border border-slate-300 bg-white p-3">
                <div className="flex items-center gap-3">
                  <Search className="h-4 w-4 text-slate-500" />
                  <input
                    value={folderPickerSearch}
                    onChange={(event) => setFolderPickerSearch(event.target.value)}
                    placeholder="Search folders..."
                    className="w-full border-0 bg-transparent text-base text-slate-700 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid min-h-[420px] grid-cols-[260px_minmax(0,1fr)] overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="border-r border-slate-200 bg-slate-100/70 p-2">
                  {[
                    { key: "all", label: "All Folders" },
                    { key: "createdByMe", label: "Created by Me" },
                    { key: "sharedWithMe", label: "Shared with Me" },
                    { key: "private", label: "Private Reports" },
                    { key: "public", label: "Public Reports" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setFolderPickerSearch("")}
                      className={`flex w-full items-center justify-between rounded-md px-4 py-3 text-left text-lg font-semibold transition ${tab.key === "all" ? "bg-white text-red-700 shadow-sm" : "text-slate-700 hover:bg-white/70"}`}
                    >
                      <span>{tab.label}</span>
                      <span className="text-slate-400">›</span>
                    </button>
                  ))}
                </div>

                <div className="bg-white p-0">
                  {filteredPickerFolders.length === 0 ? (
                    <div className="flex min-h-[360px] items-center justify-center text-base text-slate-500">
                      No folders found
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {filteredPickerFolders.map((folder) => (
                        <button
                          key={folder.id}
                          type="button"
                          onClick={() => {
                            setSelectedFolderId(folder.id);
                            setFolderSearch(folder.name);
                            setShowFolderPicker(false);
                          }}
                          className={`flex w-full items-center justify-between px-4 py-4 text-left transition hover:bg-slate-50 ${selectedFolderId === folder.id ? "bg-blue-50/60" : ""}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-slate-200 text-[10px] text-slate-600">
                              <span>▣</span>
                            </div>
                            <span className="text-xl font-semibold text-red-700">{folder.name}</span>
                          </div>
                          <span className="text-slate-400">›</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 bg-[#f4f4f4] px-6 py-4">
              <button
                type="button"
                onClick={() => setShowFolderPicker(false)}
                className="h-12 min-w-[140px] rounded-xl border border-slate-300 bg-white px-4 text-lg font-medium text-slate-700 transition hover:bg-slate-100"
              >
                New Folder
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowFolderPicker(false)}
                  className="h-12 min-w-[120px] rounded-xl border border-slate-300 bg-white px-4 text-lg font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setShowFolderPicker(false)}
                  className="h-12 min-w-[120px] rounded-xl bg-red-600 px-4 text-lg font-semibold text-white shadow-sm transition hover:bg-red-700"
                >
                  Select
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
