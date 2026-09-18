import { prisma } from "@dct-crm/db";
import { REPORT_OBJECTS, ReportField } from "./report-metadata";

export type AggregateFunction =
  | "count"
  | "sum"
  | "avg"
  | "min"
  | "max";

export interface ReportAggregate {
  function: AggregateFunction;
  field?: string;
  label?: string;
}

type ReportFilterOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "gt"
  | "gte"
  | "lt"
  | "lte";

export interface ReportFilter {
  field: string;
  operator: ReportFilterOperator | string;
  value: unknown;
}

export interface RunReportInput {
  tenantId: string;
  objectName: string;
  columns: string[];
  filters?: ReportFilter[];
  crossFilter?: {
    objectName: string;
    mode: "with" | "without";
  };
  filterLogic?: "AND" | "OR";
  groupBy?: string;
  groupColumn?: string;
  rowGroups?: string[];
  columnGroups?: string[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  aggregates?: ReportAggregate[];
}

interface DynamicObjectConfig {
  label: string;
  model: "customRecord";
  fields: Record<string, ReportField>;
}

interface ResultGroup {
  key: string;
  groupValues: Record<string, string>;
  count: number;
  summary: Record<string, number>;
  rows: Record<string, unknown>[];
}

interface GroupedDetailRow {
  groupValues: Record<string, string>;
  groupCounts: Record<string, number>;
  values: Record<string, unknown>;
}

interface PivotRow {
  group: string;
  groupValues: Record<string, string>;
  values: Record<string, number>;
}

const relativeDateOperators = new Set([
  "today",
  "yesterday",
  "thisWeek",
  "lastWeek",
  "thisMonth",
  "lastMonth",
  "thisYear",
  "last90Days",
]);

function dateRange(
  operator: string,
  now = new Date(),
): { gte: Date; lt: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);

  switch (operator) {
    case "today":
      end.setDate(end.getDate() + 1);
      break;

    case "yesterday":
      start.setDate(start.getDate() - 1);
      end.setTime(start.getTime());
      end.setDate(end.getDate() + 1);
      break;

    case "thisWeek": {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      end.setTime(start.getTime());
      end.setDate(end.getDate() + 7);
      break;
    }

    case "lastWeek": {
      const day = start.getDay();
      start.setDate(start.getDate() - day - 7);
      end.setTime(start.getTime());
      end.setDate(end.getDate() + 7);
      break;
    }

    case "thisMonth":
      end.setMonth(end.getMonth() + 1, 1);
      break;

    case "lastMonth":
      start.setMonth(start.getMonth() - 1, 1);
      end.setTime(new Date(
        start.getFullYear(),
        start.getMonth() + 1,
        1,
      ).getTime());
      break;

    case "thisYear":
      end.setFullYear(end.getFullYear() + 1, 0, 1);
      break;

    case "last90Days":
      start.setDate(start.getDate() - 89);
      end.setDate(end.getDate() + 1);
      break;
  }

  return { gte: start, lt: end };
}

function getNestedValue(source: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((value, key) => {
      if (value == null || typeof value !== "object") {
        return undefined;
      }

      return (value as Record<string, unknown>)[key];
    }, source);
}

function addSelectPath(select: Record<string, any>, path: string) {
  const parts = path.split(".");
  let current = select;

  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];

    if (!current[part]) {
      current[part] = { select: {} };
    }

    current = current[part].select;
  }

  current[parts[parts.length - 1]] = true;
}

function convertValue(value: unknown, field: ReportField) {
  if (value === undefined || value === null || value === "") {
    return value;
  }

  switch (field.type) {
    case "number":
      return Number(value);

    case "date":
      return new Date(String(value));

    case "enum":
      return String(value);

    default:
      return value;
  }
}

function createCondition(
  field: ReportField,
  operator: string,
  value: unknown,
) {
  if (
    field.type === "date" &&
    relativeDateOperators.has(operator)
  ) {
    return dateRange(operator);
  }

  const convertedValue = convertValue(value, field);

  switch (operator) {
    case "equals":
      return convertedValue;

    case "notEquals":
      return { not: convertedValue };

    case "contains":
      return {
        contains: String(convertedValue ?? ""),
        mode: "insensitive",
      };

    case "startsWith":
      return {
        startsWith: String(convertedValue ?? ""),
        mode: "insensitive",
      };

    case "endsWith":
      return {
        endsWith: String(convertedValue ?? ""),
        mode: "insensitive",
      };

    case "gt":
      return { gt: convertedValue };

    case "gte":
      return { gte: convertedValue };

    case "lt":
      return { lt: convertedValue };

    case "lte":
      return { lte: convertedValue };

    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}

function buildNestedObject(path: string, value: unknown) {
  const parts = path.split(".");
  let result: Record<string, unknown> = value as Record<string, unknown>;

  for (let index = parts.length - 1; index >= 0; index -= 1) {
    result = { [parts[index]]: result };
  }

  return result;
}

function buildWhere(
  objectConfig: { fields: Record<string, ReportField> },
  tenantId: string,
  filters: ReportFilter[],
  filterLogic: "AND" | "OR" = "AND",
) {
  if (filters.length === 0) {
    return { tenantId };
  }

  const filterConditions = filters.map((filter) => {
    const field = objectConfig.fields[filter.field];

    if (!field) {
      throw new Error(`Unknown report field: ${filter.field}`);
    }

    return buildNestedObject(
      field.path,
      createCondition(field, filter.operator, filter.value),
    );
  });

  if (filterLogic === "OR") {
    return {
      AND: [
        { tenantId },
        { OR: filterConditions },
      ],
    };
  }

  return {
    AND: [
      { tenantId },
      ...filterConditions,
    ],
  };
}

const relationMap: Record<string, Record<string, string>> = {
  Lead: {
    Contact: "contacts",
    SiteVisit: "siteVisits",
    Opportunity: "opportunities",
    Quotation: "quotations",
    Booking: "bookings",
    Task: "tasks",
    Customer: "customer",
  },
  Account: {
    Contact: "contacts",
    Customer: "customers",
  },
  Opportunity: {
    Quotation: "quotations",
    Booking: "bookings",
    Task: "tasks",
    Activity: "activities",
  },
  SiteVisit: {
    Task: "tasks",
    Activity: "activities",
  },
  Quotation: {
    Booking: "bookings",
    Approval: "approvals",
    QuotationItem: "items",
  },
  Booking: {
    Payment: "payments",
    Activity: "activities",
  },
  Project: {
    Lead: "leads",
    SiteVisit: "siteVisits",
    Opportunity: "opportunities",
    Quotation: "quotations",
    Booking: "bookings",
    Unit: "units",
  },
};

function applyCrossFilter(
  where: any,
  objectName: string,
  crossFilter?: RunReportInput["crossFilter"],
) {
  if (!crossFilter) {
    return where;
  }

  const relation = relationMap[objectName]?.[crossFilter.objectName];

  if (!relation) {
    throw new Error(
      `Unsupported cross filter: ${objectName} ${crossFilter.mode} ${crossFilter.objectName}`,
    );
  }

  return {
    ...where,
    [relation]: crossFilter.mode === "with"
      ? { some: {} }
      : { none: {} },
  };
}

function matchesFilter(
  record: unknown,
  field: ReportField,
  operator: string,
  value: unknown,
) {
  const actual = getNestedValue(record, field.path);

  if (
    field.type === "date" &&
    relativeDateOperators.has(operator)
  ) {
    if (actual == null) {
      return false;
    }

    const timestamp = new Date(String(actual)).getTime();
    const range = dateRange(operator);

    return (
      timestamp >= range.gte.getTime() &&
      timestamp < range.lt.getTime()
    );
  }

  const expected = convertValue(value, field);

  switch (operator) {
    case "equals":
      return String(actual ?? "").toLowerCase() ===
        String(expected ?? "").toLowerCase();

    case "notEquals":
      return String(actual ?? "").toLowerCase() !==
        String(expected ?? "").toLowerCase();

    case "contains":
      return String(actual ?? "").toLowerCase().includes(
        String(expected ?? "").toLowerCase(),
      );

    case "startsWith":
      return String(actual ?? "").toLowerCase().startsWith(
        String(expected ?? "").toLowerCase(),
      );

    case "endsWith":
      return String(actual ?? "").toLowerCase().endsWith(
        String(expected ?? "").toLowerCase(),
      );

    case "gt":
      return actual != null && expected != null && actual > expected;

    case "gte":
      return actual != null && expected != null && actual >= expected;

    case "lt":
      return actual != null && expected != null && actual < expected;

    case "lte":
      return actual != null && expected != null && actual <= expected;

    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}

function calculateAggregate(
  records: any[],
  aggregate: ReportAggregate,
  objectConfig: { fields: Record<string, ReportField> },
): number {
  if (aggregate.function === "count") {
    return records.length;
  }

  if (!aggregate.field) {
    return 0;
  }

  const field = objectConfig.fields[aggregate.field];

  if (!field) {
    throw new Error(`Unknown aggregate field: ${aggregate.field}`);
  }

  if (field.type !== "number") {
    throw new Error(
      `Aggregate field must be numeric: ${aggregate.field}`,
    );
  }

  const values = records
    .map((record) => Number(getNestedValue(record, field.path)))
    .filter(Number.isFinite);

  if (values.length === 0) {
    return 0;
  }

  switch (aggregate.function) {
    case "sum":
      return values.reduce((total, value) => total + value, 0);

    case "avg":
      return (
        values.reduce((total, value) => total + value, 0) /
        values.length
      );

    case "min":
      return Math.min(...values);

    case "max":
      return Math.max(...values);

    default:
      return 0;
  }
}

function getAggregateLabel(
  aggregate: ReportAggregate,
  objectConfig: { fields: Record<string, ReportField> },
) {
  if (aggregate.label) {
    return aggregate.label;
  }

  if (aggregate.function === "count") {
    return "Record Count";
  }

  const field = aggregate.field
    ? objectConfig.fields[aggregate.field]
    : undefined;

  const fieldLabel = field?.label || aggregate.field || "Value";
  const functionLabel =
    aggregate.function.charAt(0).toUpperCase() +
    aggregate.function.slice(1);

  return `${functionLabel} ${fieldLabel}`;
}

function calculateAggregates(
  records: any[],
  aggregates: ReportAggregate[],
  objectConfig: { fields: Record<string, ReportField> },
) {
  const summary: Record<string, number> = {};

  for (const aggregate of aggregates) {
    summary[getAggregateLabel(aggregate, objectConfig)] = calculateAggregate(
      records,
      aggregate,
      objectConfig,
    );
  }

  return summary;
}

function buildRows(
  records: any[],
  columns: string[],
  objectConfig: { fields: Record<string, ReportField> },
) {
  return records.map((record) => {
    const row: Record<string, unknown> = {};

    for (const column of columns) {
      const field = objectConfig.fields[column];

      if (!field) {
        throw new Error(`Unknown report column: ${column}`);
      }

      row[column] = getNestedValue(record, field.path);
    }

    return row;
  });
}

function groupValue(
  record: any,
  fieldNames: string[],
  objectConfig: { fields: Record<string, ReportField> },
) {
  const values: Record<string, string> = {};

  for (const fieldName of fieldNames) {
    const field = objectConfig.fields[fieldName];

    if (!field) {
      throw new Error(`Unknown group field: ${fieldName}`);
    }

    const raw = getNestedValue(record, field.path);
    values[fieldName] = raw == null || raw === "" ? "(Blank)" : String(raw);
  }

  return values;
}

function groupKey(groupValues: Record<string, string>, fields: string[]) {
  return fields
    .map((field) => `${field}=${groupValues[field]}`)
    .join("||");
}

function displayGroupKey(groupValues: Record<string, string>, fields: string[]) {
  return fields.map((field) => groupValues[field]).join(" / ");
}

export async function runReport(input: RunReportInput) {
  const rowGroups = input.rowGroups?.length
    ? [...input.rowGroups]
    : input.groupBy
      ? [input.groupBy]
      : [];

  const columnGroups = input.columnGroups?.length
    ? [...input.columnGroups]
    : input.groupColumn
      ? [input.groupColumn]
      : [];

  let objectConfig: ReportObjectConfig = REPORT_OBJECTS[input.objectName];
  let dynamicRecords: any[] | null = null;

  if (!objectConfig) {
    const definition = await prisma.objectDefinition.findFirst({
      where: {
        tenantId: input.tenantId,
        name: {
          equals: input.objectName,
          mode: "insensitive",
        },
        isActive: true,
      },
      include: {
        fields: {
          where: {
            isActive: true,
            visible: true,
          },
          orderBy: {
            displayOrder: "asc",
          },
        },
      },
    });

    if (!definition) {
      throw new Error(
        `Unsupported report object: ${input.objectName}`,
      );
    }

    const dynamicConfig: DynamicObjectConfig = {
      label: definition.pluralLabel || definition.label,
      model: "customRecord",
      fields: Object.fromEntries(
        definition.fields.map((field) => [
          field.name,
          {
            label: field.label,
            path: field.name,
            type:
              ["number", "currency", "decimal"].includes(field.fieldType)
                ? "number"
                : ["date", "dateTime"].includes(field.fieldType)
                  ? "date"
                  : field.fieldType === "picklist"
                    ? "enum"
                    : "string",
          } satisfies ReportField,
        ]),
      ),
    };

    objectConfig = dynamicConfig;

    const customRecords = await prisma.customRecord.findMany({
      where: {
        tenantId: input.tenantId,
        objectId: definition.id,
        isActive: true,
      },
    });

    dynamicRecords = customRecords.map((record) => ({
      ...(record.data as Record<string, unknown>),
      id: record.id,
      recordNumber: record.recordNumber,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));
  }

  const delegate = (prisma as any)[objectConfig.model];

  if (!delegate && !dynamicRecords) {
    throw new Error(`Prisma model not found: ${objectConfig.model}`);
  }

  if (!input.columns?.length) {
    throw new Error("At least one report column is required");
  }

  const select: Record<string, any> = {};

  for (const column of input.columns) {
    const field = objectConfig.fields[column];
    if (!field) {
      throw new Error(`Unknown report column: ${column}`);
    }
    addSelectPath(select, field.path);
  }

  for (const fieldName of rowGroups) {
    const field = objectConfig.fields[fieldName];
    if (!field) {
      throw new Error(`Unknown row group field: ${fieldName}`);
    }
    addSelectPath(select, field.path);
  }

  for (const fieldName of columnGroups) {
    const field = objectConfig.fields[fieldName];
    if (!field) {
      throw new Error(`Unknown column group field: ${fieldName}`);
    }
    addSelectPath(select, field.path);
  }

  if (input.sortBy) {
    const sortField = objectConfig.fields[input.sortBy];
    if (!sortField) {
      throw new Error(`Unknown sort field: ${input.sortBy}`);
    }
    addSelectPath(select, sortField.path);
  }

  const aggregates =
    input.aggregates?.length
      ? input.aggregates
      : [{ function: "count" as const }];

  for (const aggregate of aggregates) {
    if (aggregate.function === "count" || !aggregate.field) {
      continue;
    }

    const aggregateField = objectConfig.fields[aggregate.field];
    if (!aggregateField) {
      throw new Error(
        `Unknown aggregate field: ${aggregate.field}`,
      );
    }

    addSelectPath(select, aggregateField.path);
  }

  const fetchedRecords = dynamicRecords ||
    await delegate.findMany({
      where: applyCrossFilter(
        buildWhere(
          objectConfig,
          input.tenantId,
          input.filters || [],
          input.filterLogic || "AND",
        ),
        input.objectName,
        input.crossFilter,
      ),
      select,
    });

  const workingRecords = dynamicRecords
    ? fetchedRecords.filter((record: any) => {
        const filters = input.filters || [];

        if (filters.length === 0) {
          return true;
        }

        const matches = filters.map((filter) => {
          const field = objectConfig.fields[filter.field];

          if (!field) {
            throw new Error(`Unknown report field: ${filter.field}`);
          }

          return matchesFilter(
            record,
            field,
            filter.operator,
            filter.value,
          );
        });

        return input.filterLogic === "OR"
          ? matches.some(Boolean)
          : matches.every(Boolean);
      })
    : fetchedRecords;

  if (input.sortBy) {
    const sortField = objectConfig.fields[input.sortBy];

    workingRecords.sort((a: any, b: any) => {
      const aValue = getNestedValue(a, sortField.path);
      const bValue = getNestedValue(b, sortField.path);

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      const comparison = aValue === bValue
        ? 0
        : aValue > bValue
          ? 1
          : -1;

      return input.sortOrder === "asc"
        ? comparison
        : -comparison;
    });
  }

  const totalRows = workingRecords.length;

  const summary = calculateAggregates(
    workingRecords,
    aggregates,
    objectConfig,
  );

  /*
   * limit is ONLY the number of detail rows returned to the UI.
   * Summary/group counts/pivot calculations use ALL matching records.
   */
  const limit =
    typeof input.limit === "number" && input.limit > 0
      ? Math.floor(input.limit)
      : 1000;

  const limitedRecords = workingRecords.slice(0, limit);
  const rows = buildRows(
    limitedRecords,
    input.columns,
    objectConfig,
  );

  let groups: ResultGroup[] | undefined;
  let groupedDetailRows: GroupedDetailRow[] | undefined;

  if (rowGroups.length > 0) {
    const allGroups = new Map<
      string,
      {
        groupValues: Record<string, string>;
        records: any[];
      }
    >();

    for (const record of workingRecords) {
      const values = groupValue(record, rowGroups, objectConfig);
      const key = groupKey(values, rowGroups);
      const existing = allGroups.get(key);

      if (existing) {
        existing.records.push(record);
      } else {
        allGroups.set(key, {
          groupValues: values,
          records: [record],
        });
      }
    }

    const groupCountsByKey = new Map<string, number>();

    for (const [key, value] of allGroups) {
      groupCountsByKey.set(key, value.records.length);
    }

    const previewRecordsByGroup = new Map<string, any[]>();

    for (const record of limitedRecords) {
      const values = groupValue(record, rowGroups, objectConfig);
      const key = groupKey(values, rowGroups);
      const list = previewRecordsByGroup.get(key) || [];
      list.push(record);
      previewRecordsByGroup.set(key, list);
    }

    groups = [...allGroups.entries()].map(([key, value]) => ({
      key,
      groupValues: value.groupValues,
      count: value.records.length,
      summary: calculateAggregates(
        value.records,
        aggregates,
        objectConfig,
      ),
      rows: buildRows(
        previewRecordsByGroup.get(key) || [],
        input.columns,
        objectConfig,
      ),
    }));

    groupedDetailRows = limitedRecords.map((record: any) => {
      const values = groupValue(record, rowGroups, objectConfig);
      const key = groupKey(values, rowGroups);
      const counts: Record<string, number> = {};
      const totalCount = groupCountsByKey.get(key) || 0;

      for (const field of rowGroups) {
        counts[field] = totalCount;
      }

      const normalValues = buildRows(
        [record],
        input.columns,
        objectConfig,
      )[0] || {};

      return {
        groupValues: values,
        groupCounts: counts,
        values: normalValues,
      };
    });
  }

  let columnGroupResults:
    | { group: string; groupValues: Record<string, string>; count: number }[]
    | undefined;

  let pivot:
    | {
        rowGroups: string[];
        columnGroups: string[];
        aggregateLabel: string;
        columns: string[];
        columnValues: Record<string, Record<string, string>>;
        rows: PivotRow[];
      }
    | undefined;

  if (columnGroups.length > 0) {
    const distinctColumnGroups = new Map<
      string,
      Record<string, string>
    >();

    for (const record of workingRecords) {
      const values = groupValue(record, columnGroups, objectConfig);
      const key = groupKey(values, columnGroups);

      if (!distinctColumnGroups.has(key)) {
        distinctColumnGroups.set(key, values);
      }
    }

    columnGroupResults = [];

    for (const [key, groupValues] of distinctColumnGroups) {
      const count = workingRecords.filter((record: any) => {
        const current = groupValue(record, columnGroups, objectConfig);
        return groupKey(current, columnGroups) === key;
      }).length;

      columnGroupResults.push({
        group: displayGroupKey(groupValues, columnGroups),
        groupValues,
        count,
      });
    }

    if (rowGroups.length > 0) {
      const pivotMap = new Map<
        string,
        {
          groupValues: Record<string, string>;
          cells: Map<string, any[]>;
        }
      >();

      for (const record of workingRecords) {
        const rowValues = groupValue(record, rowGroups, objectConfig);
        const columnValues = groupValue(record, columnGroups, objectConfig);

        const rowKey = groupKey(rowValues, rowGroups);
        const columnKey = groupKey(columnValues, columnGroups);

        let rowEntry = pivotMap.get(rowKey);

        if (!rowEntry) {
          rowEntry = {
            groupValues: rowValues,
            cells: new Map<string, any[]>(),
          };
          pivotMap.set(rowKey, rowEntry);
        }

        const records = rowEntry.cells.get(columnKey) || [];
        records.push(record);
        rowEntry.cells.set(columnKey, records);
      }

      const firstAggregate = aggregates[0] || {
        function: "count" as const,
      };

      const pivotColumns = [...distinctColumnGroups.entries()].map(
        ([key, groupValues]) => ({
          key,
          label: displayGroupKey(groupValues, columnGroups),
        }),
      );

      pivot = {
        rowGroups,
        columnGroups,
        aggregateLabel: getAggregateLabel(
          firstAggregate,
          objectConfig,
        ),
        columns: pivotColumns.map((item) => item.label),
        columnValues: Object.fromEntries(
          pivotColumns.map((item) => [item.label, distinctColumnGroups.get(item.key)!]),
        ),
        rows: [...pivotMap.values()].map((entry) => ({
          group: displayGroupKey(entry.groupValues, rowGroups),
          groupValues: entry.groupValues,
          values: Object.fromEntries(
            pivotColumns.map((column: { key: string; label: string }) => [
              column.label,
              calculateAggregate(
                entry.cells.get(column.key) || [],
                firstAggregate,
                objectConfig,
              ),
            ]),
          ),
        })),
      };
    }
  }

  return {
    objectName: input.objectName,
    columns: input.columns,
    totalRows,
    rows,
    groupedDetailRows,
    summary,
    groups,
    columnGroups: columnGroupResults,
    pivot,
  };
}

type ReportObjectConfig = {
  label: string;
  category?: string;
  model: string;
  fields: Record<string, ReportField>;
};