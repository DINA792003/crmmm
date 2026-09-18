import { Router, Response } from 'express';
import { prisma } from '@dct-crm/db';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/authorization';
import { auditLog } from '../middleware/audit';
import { REPORT_OBJECTS } from '../reports/report-metadata';
import { runReport } from '../reports/report-engine';

const router = Router();
export const reportFolderRouter = Router();

router.use(authenticate);

router.get('/metadata', authorize('Report', 'read'), async (req: AuthRequest, res: Response) => {
  const staticObjects = Object.entries(REPORT_OBJECTS).map(([name, object]) => ({
    name,
    label: object.label,
    category: object.category || object.label,
    fields: Object.entries(object.fields).map(([key, field]) => ({ key, label: field.label, type: field.type })),
  }));

  const definedObjects = await prisma.objectDefinition.findMany({
    where: { tenantId: req.user!.tenantId, isActive: true },
    include: {
      fields: {
        where: { isActive: true, visible: true },
        orderBy: { displayOrder: 'asc' },
      },
    },
    orderBy: { label: 'asc' },
  });

  const staticNames = new Set(staticObjects.map((object) => object.name.toLowerCase()));
  const dynamicObjects = definedObjects
    .filter((object) => !staticNames.has(object.name.toLowerCase()))
    .map((object) => ({
      name: object.name,
      label: object.pluralLabel || object.label,
      category: object.pluralLabel || object.label,
      fields: object.fields.map((field) => ({
        key: field.name,
        label: field.label,
        type: field.fieldType,
      })),
    }));

  const objects = [...staticObjects, ...dynamicObjects];
  res.json({ success: true, data: objects });
});

router.post('/run', authorize('Report', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const { objectName, columns, filters, crossFilter, filterLogic, aggregates, groupBy, groupColumn, rowGroups, columnGroups, sortBy, sortOrder, limit } = req.body;
    if (!objectName || !Array.isArray(columns) || columns.length === 0) {
      return res.status(400).json({ success: false, error: 'objectName and at least one column are required' });
    }
    const data = await runReport({ tenantId: req.user!.tenantId, objectName, columns, filters, crossFilter, filterLogic, aggregates, groupBy, groupColumn, rowGroups, columnGroups, sortBy, sortOrder, limit });
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Run report error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to run report' });
  }
});

const reportSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.string().min(1),
  objectName: z.string().min(1),
  columns: z.array(z.string()).min(1),
  filters: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.any(),
  })).optional(),
  groupBy: z.string().optional(),
  sortBy: z.string().optional(),
  folderId: z.string().nullable().optional(),
  isShared: z.boolean().optional(),
});

const updateReportSchema = reportSchema.partial();

router.get('/', authorize('Report', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id: userId } = req.user!;
    const { page = 1, limit = 50, type, objectName, isShared, search, view = 'recent', folderId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { tenantId };
    if (type) where.type = type;
    if (objectName) where.objectName = objectName;
    if (isShared !== undefined) where.isShared = isShared === 'true';
    if (view === 'createdByMe' || view === 'private') where.createdBy = userId;
    if (view === 'private') where.isShared = false;
    if (view === 'public') where.isShared = true;
    if (folderId) where.folderId = folderId;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: view === 'recent' ? Math.min(Number(limit), 50) : Number(limit),
        include: {
          folder: { select: { id: true, name: true } },
        },
        orderBy: { [sortBy as string]: sortOrder },
      }),
      prisma.report.count({ where }),
    ]);

    res.json({
      success: true,
      data: reports,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reports' });
  }
});

router.get('/:id', authorize('Report', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId } = req.user!;

    const report = await prisma.report.findFirst({
      where: { id: req.params.id, tenantId },
    });

    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch report' });
  }
});

router.post('/', authorize('Report', 'create'), async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, id: userId } = req.user!;
    const data = reportSchema.parse(req.body);

    const report = await prisma.report.create({
      data: {
        tenantId,
        createdBy: userId,
        name: data.name,
        description: data.description,
        type: data.type,
        objectName: data.objectName,
        columns: data.columns,
        filters: data.filters || undefined,
        groupBy: data.groupBy,
        sortBy: data.sortBy,
        folderId: data.folderId || null,
        isShared: data.isShared || false,
      },
    });

    await auditLog(tenantId, userId, 'CREATE', 'Report', report.id, null, { name: data.name, objectName: data.objectName });

    res.status(201).json({ success: true, data: report });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    console.error('Create report error:', error);
    res.status(500).json({ success: false, error: 'Failed to create report' });
  }
});

router.patch('/:id/move', authorize('Report', 'edit'), async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const folderId = req.body.folderId || null;
    const report = await prisma.report.findFirst({ where: { id: req.params.id, tenantId } });
    if (!report) return res.status(404).json({ success: false, error: 'Report not found' });
    if (folderId) {
      const folder = await prisma.reportFolder.findFirst({ where: { id: folderId, tenantId } });
      if (!folder) return res.status(404).json({ success: false, error: 'Folder not found' });
    }
    const updated = await prisma.report.update({ where: { id: report.id }, data: { folderId } });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Move report error:', error);
    res.status(500).json({ success: false, error: 'Failed to move report' });
  }
});

router.get('/:id/export', authorize('Report', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const report = await prisma.report.findFirst({ where: { id: req.params.id, tenantId } });
    if (!report) return res.status(404).json({ success: false, error: 'Report not found' });

    const result = await runReport({
      tenantId,
      objectName: report.objectName,
      columns: Array.isArray(report.columns) ? report.columns as string[] : [],
      filters: Array.isArray(report.filters) ? report.filters as any[] : [],
      sortBy: report.sortBy || undefined,
      limit: 10000,
    });

    const escapeCsv = (value: unknown) => {
      if (value === null || value === undefined) return '';
      const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };
    const columns = result.columns || [];
    const rows = result.rows || [];
    const csv = [
      columns.map(escapeCsv).join(','),
      ...rows.map((row: Record<string, unknown>) => columns.map((column: string) => escapeCsv(row[column])).join(',')),
    ].join('\n');
    const safeName = report.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'report';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({ success: false, error: 'Failed to export report' });
  }
});

reportFolderRouter.use(authenticate);

reportFolderRouter.get('/', authorize('Report', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, id: userId } = req.user!;
    const view = String(req.query.view || 'all');
    const where: any = { tenantId };
    if (view === 'createdByMe') where.createdBy = userId;
    if (view === 'sharedWithMe') {
      where.isShared = true;
      where.NOT = { createdBy: userId };
    }
    const folders = await prisma.reportFolder.findMany({
      where,
      include: { _count: { select: { reports: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: folders });
  } catch (error) {
    console.error('Get report folders error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch report folders' });
  }
});

reportFolderRouter.post('/', authorize('Report', 'create'), async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, id: userId } = req.user!;
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name) return res.status(400).json({ success: false, error: 'Folder name is required' });
    const folder = await prisma.reportFolder.create({
      data: {
        tenantId,
        createdBy: userId,
        name,
        isShared: Boolean(req.body.isShared),
      },
    });
    res.status(201).json({ success: true, data: folder });
  } catch (error: any) {
    if (error?.code === 'P2002') return res.status(409).json({ success: false, error: 'A folder with this name already exists' });
    console.error('Create report folder error:', error);
    res.status(500).json({ success: false, error: 'Failed to create report folder' });
  }
});

router.put('/:id', authorize('Report', 'edit'), async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, id: userId } = req.user!;

    const existing = await prisma.report.findFirst({
      where: { id: req.params.id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    const data = updateReportSchema.parse(req.body);

    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: {
        ...data,
        filters: data.filters || undefined,
      },
    });

    await auditLog(tenantId, userId, 'UPDATE', 'Report', report.id, existing, report);

    res.json({ success: true, data: report });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    console.error('Update report error:', error);
    res.status(500).json({ success: false, error: 'Failed to update report' });
  }
});

router.delete('/:id', authorize('Report', 'delete'), async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, id: userId } = req.user!;

    const existing = await prisma.report.findFirst({
      where: { id: req.params.id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    await prisma.report.delete({ where: { id: req.params.id } });

    await auditLog(tenantId, userId, 'DELETE', 'Report', existing.id, existing, null);

    res.json({ success: true, data: null });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete report' });
  }
});

router.post('/:id/execute', authorize('Report', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId } = req.user!;

    const report = await prisma.report.findFirst({
      where: { id: req.params.id, tenantId },
    });

    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    const filters = (report.filters as Record<string, any>) || {};
    const columns = report.columns as string[];
    const groupBy = report.groupBy;

    const modelMap: Record<string, any> = {
      Lead: prisma.lead,
      SiteVisit: prisma.siteVisit,
      Opportunity: prisma.opportunity,
      Quotation: prisma.quotation,
      Booking: prisma.booking,
      Payment: prisma.payment,
      Project: prisma.project,
      Unit: prisma.unit,
      Task: prisma.task,
      Activity: prisma.activity,
      Customer: prisma.customer,
    };

    const model = modelMap[report.objectName];
    if (!model) {
      return res.status(400).json({ success: false, error: `Unsupported object type: ${report.objectName}` });
    }

    const where: any = { tenantId, ...filters };

    const data = await model.findMany({
      where,
      select: columns.length > 0 ? columns.reduce((acc: any, col: string) => ({ ...acc, [col]: true }), { id: true }) : undefined,
      orderBy: report.sortBy ? { [report.sortBy]: 'desc' } : undefined,
      take: 1000,
    });

    let result = data;

    if (groupBy) {
      const grouped: Record<string, any[]> = {};
      for (const item of data) {
        const key = String(item[groupBy] || 'Unknown');
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
      }
      result = Object.entries(grouped).map(([key, items]) => ({
        group: key,
        count: items.length,
        items,
      }));
    }

    res.json({ success: true, data: result, report });
  } catch (error) {
    console.error('Execute report error:', error);
    res.status(500).json({ success: false, error: 'Failed to execute report' });
  }
});

export default router;
