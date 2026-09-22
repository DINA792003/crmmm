import { prisma } from '@dct-crm/db';

export type ReportFieldType = 'string' | 'number' | 'date' | 'enum';

export interface ReportField {
  label: string;
  path: string;
  type: ReportFieldType;
  filterable?: boolean;
  sortable?: boolean;
  groupable?: boolean;
  aggregatable?: boolean;
  dateFilterable?: boolean;
  visibleTo?: string[];
  displayPath?: string;
}

export interface ReportObject {
  label: string;
  category?: string;
  model: string;
  fields: Record<string, ReportField>;
}

export interface MetadataFieldDefinition {
  name: string;
  label: string;
  type: string;
  filterable: boolean;
  sortable: boolean;
  groupable: boolean;
  aggregatable: boolean;
  dateFilterable: boolean;
  visibleTo: string[];
}

export interface MetadataObjectDefinition {
  object: string;
  label: string;
  category: string;
  fields: MetadataFieldDefinition[];
}

export const REPORT_OBJECTS: Record<string, ReportObject> = {
  Lead: {
    label: 'Leads',
    category: 'Leads',
    model: 'lead',
    fields: {
      id: { label: 'Lead ID', path: 'id', type: 'string' },
      firstName: { label: 'First Name', path: 'firstName', type: 'string' },
      lastName: { label: 'Last Name', path: 'lastName', type: 'string' },
      email: { label: 'Email', path: 'email', type: 'string' },
      phone: { label: 'Phone', path: 'phone', type: 'string' },
      status: { label: 'Status', path: 'status', type: 'enum' },
      source: { label: 'Lead Source', path: 'source', type: 'enum' },
      score: { label: 'Score', path: 'score', type: 'number' },
      budget: { label: 'Budget', path: 'budget', type: 'number' },
      requirements: { label: 'Requirements', path: 'requirements', type: 'string' },
      notes: { label: 'Notes', path: 'notes', type: 'string' },
      createdAt: { label: 'Created Date', path: 'createdAt', type: 'date' },
      updatedAt: { label: 'Updated Date', path: 'updatedAt', type: 'date' },
      ownerName: { label: 'Owner', path: 'owner.firstName', type: 'string' },
      projectName: { label: 'Project', path: 'project.name', type: 'string' },
    },
  },
  Contact: {
    label: 'Contacts',
    category: 'Contacts',
    model: 'contact',
    fields: {
      id: { label: 'Contact ID', path: 'id', type: 'string' },
      firstName: { label: 'First Name', path: 'firstName', type: 'string' },
      lastName: { label: 'Last Name', path: 'lastName', type: 'string' },
      email: { label: 'Email', path: 'email', type: 'string' },
      phone: { label: 'Phone', path: 'phone', type: 'string' },
      title: { label: 'Title', path: 'title', type: 'string' },
      department: { label: 'Department', path: 'department', type: 'string' },
      isPrimary: { label: 'Primary Contact', path: 'isPrimary', type: 'enum' },
      createdAt: { label: 'Created Date', path: 'createdAt', type: 'date' },
      updatedAt: { label: 'Updated Date', path: 'updatedAt', type: 'date' },
    },
  },
  Account: {
    label: 'Accounts',
    category: 'Accounts',
    model: 'account',
    fields: {
      id: { label: 'Account ID', path: 'id', type: 'string' },
      name: { label: 'Account Name', path: 'name', type: 'string' },
      industry: { label: 'Industry', path: 'industry', type: 'string' },
      website: { label: 'Website', path: 'website', type: 'string' },
      phone: { label: 'Phone', path: 'phone', type: 'string' },
      email: { label: 'Email', path: 'email', type: 'string' },
      address: { label: 'Address', path: 'address', type: 'string' },
      createdAt: { label: 'Created Date', path: 'createdAt', type: 'date' },
      updatedAt: { label: 'Updated Date', path: 'updatedAt', type: 'date' },
    },
  },
  Opportunity: {
    label: 'Opportunities',
    category: 'Opportunities',
    model: 'opportunity',
    fields: {
      id: { label: 'Opportunity ID', path: 'id', type: 'string' },
      name: { label: 'Opportunity Name', path: 'name', type: 'string' },
      stage: { label: 'Stage', path: 'stage', type: 'enum' },
      amount: { label: 'Amount', path: 'amount', type: 'number' },
      expectedCloseDate: { label: 'Expected Close Date', path: 'expectedCloseDate', type: 'date' },
      probability: { label: 'Probability', path: 'probability', type: 'number' },
      description: { label: 'Description', path: 'description', type: 'string' },
      createdAt: { label: 'Created Date', path: 'createdAt', type: 'date' },
      updatedAt: { label: 'Updated Date', path: 'updatedAt', type: 'date' },
    },
  },
  SiteVisit: {
    label: 'Site Visits',
    category: 'Site Visits',
    model: 'siteVisit',
    fields: {
      id: { label: 'Site Visit ID', path: 'id', type: 'string' },
      scheduledAt: { label: 'Scheduled Date', path: 'scheduledAt', type: 'date' },
      completedAt: { label: 'Completed Date', path: 'completedAt', type: 'date' },
      status: { label: 'Status', path: 'status', type: 'enum' },
      feedback: { label: 'Feedback', path: 'feedback', type: 'string' },
      rating: { label: 'Rating', path: 'rating', type: 'number' },
      notes: { label: 'Notes', path: 'notes', type: 'string' },
      createdAt: { label: 'Created Date', path: 'createdAt', type: 'date' },
    },
  },
  Quotation: {
    label: 'Quotations',
    category: 'Quotations',
    model: 'quotation',
    fields: {
      id: { label: 'Quotation ID', path: 'id', type: 'string' },
      number: { label: 'Quotation Number', path: 'number', type: 'string' },
      status: { label: 'Status', path: 'status', type: 'enum' },
      totalAmount: { label: 'Total Amount', path: 'totalAmount', type: 'number' },
      taxAmount: { label: 'Tax Amount', path: 'taxAmount', type: 'number' },
      discount: { label: 'Discount', path: 'discount', type: 'number' },
      validUntil: { label: 'Valid Until', path: 'validUntil', type: 'date' },
      createdAt: { label: 'Created Date', path: 'createdAt', type: 'date' },
    },
  },
  Booking: {
    label: 'Bookings',
    category: 'Bookings',
    model: 'booking',
    fields: {
      id: { label: 'Booking ID', path: 'id', type: 'string' },
      number: { label: 'Booking Number', path: 'number', type: 'string' },
      status: { label: 'Status', path: 'status', type: 'enum' },
      bookingDate: { label: 'Booking Date', path: 'bookingDate', type: 'date' },
      totalAmount: { label: 'Total Amount', path: 'totalAmount', type: 'number' },
      createdAt: { label: 'Created Date', path: 'createdAt', type: 'date' },
    },
  },
  Payment: {
    label: 'Payments',
    category: 'Payments',
    model: 'payment',
    fields: {
      id: { label: 'Payment ID', path: 'id', type: 'string' },
      amount: { label: 'Amount', path: 'amount', type: 'number' },
      status: { label: 'Status', path: 'status', type: 'enum' },
      paymentDate: { label: 'Payment Date', path: 'paymentDate', type: 'date' },
      reference: { label: 'Reference', path: 'reference', type: 'string' },
      createdAt: { label: 'Created Date', path: 'createdAt', type: 'date' },
    },
  },
  Project: {
    label: 'Projects',
    category: 'Projects',
    model: 'project',
    fields: {
      id: { label: 'Project ID', path: 'id', type: 'string' },
      name: { label: 'Project Name', path: 'name', type: 'string' },
      description: { label: 'Description', path: 'description', type: 'string' },
      address: { label: 'Address', path: 'address', type: 'string' },
      city: { label: 'City', path: 'city', type: 'string' },
      state: { label: 'State', path: 'state', type: 'string' },
      totalUnits: { label: 'Total Units', path: 'totalUnits', type: 'number' },
      isActive: { label: 'Active', path: 'isActive', type: 'enum' },
      createdAt: { label: 'Created Date', path: 'createdAt', type: 'date' },
    },
  },
  Task: {
    label: 'Tasks',
    category: 'Tasks',
    model: 'task',
    fields: {
      id: { label: 'Task ID', path: 'id', type: 'string' },
      title: { label: 'Title', path: 'title', type: 'string' },
      description: { label: 'Description', path: 'description', type: 'string' },
      status: { label: 'Status', path: 'status', type: 'enum' },
      priority: { label: 'Priority', path: 'priority', type: 'enum' },
      dueDate: { label: 'Due Date', path: 'dueDate', type: 'date' },
      completedAt: { label: 'Completed Date', path: 'completedAt', type: 'date' },
      createdAt: { label: 'Created Date', path: 'createdAt', type: 'date' },
    },
  },
};

function normalizeMetadataField(fieldName: string, field: ReportField): MetadataFieldDefinition {
  return {
    name: fieldName,
    label: field.label,
    type: field.type,
    filterable: field.filterable ?? true,
    sortable: field.sortable ?? true,
    groupable: field.groupable ?? true,
    aggregatable: field.aggregatable ?? (field.type === 'number'),
    dateFilterable: field.dateFilterable ?? (field.type === 'date'),
    visibleTo: field.visibleTo ?? ['all'],
  };
}

export async function getReportMetadataRegistry(tenantId?: string, objectName?: string) {
  const staticObjects = Object.entries(REPORT_OBJECTS).map(([name, object]) => ({
    object: name,
    label: object.label,
    category: object.category || object.label,
    fields: Object.entries(object.fields).map(([fieldName, field]) => normalizeMetadataField(fieldName, field)),
  }));

  let dynamicObjects: MetadataObjectDefinition[] = [];

  if (tenantId) {
    const definitions = await prisma.objectDefinition.findMany({
      where: { tenantId, isActive: true },
      include: {
        fields: {
          where: { isActive: true, visible: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { label: 'asc' },
    });

    const staticNames = new Set(staticObjects.map((object) => object.object.toLowerCase()));
    dynamicObjects = definitions
      .filter((definition) => !staticNames.has(definition.name.toLowerCase()))
      .map((definition) => ({
        object: definition.name,
        label: definition.pluralLabel || definition.label,
        category: definition.pluralLabel || definition.label,
        fields: definition.fields.map((field) => ({
          name: field.name,
          label: field.label,
          type: field.fieldType,
          filterable: true,
          sortable: true,
          groupable: true,
          aggregatable: ['number', 'currency', 'decimal'].includes(field.fieldType),
          dateFilterable: ['date', 'dateTime'].includes(field.fieldType),
          visibleTo: ['all'],
        })),
      }));
  }

  const registry = [...staticObjects, ...dynamicObjects];

  if (!objectName) {
    return { objects: registry };
  }

  const match = registry.find((item) => item.object.toLowerCase() === objectName.toLowerCase());
  if (!match) {
    throw new Error(`Unknown report object: ${objectName}`);
  }

  return { object: match.object, label: match.label, category: match.category, fields: match.fields };
}