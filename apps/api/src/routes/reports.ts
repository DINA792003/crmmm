import { Router, Response } from 'express';
import { prisma } from '@dct-crm/db';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/authorization';
import { auditLog } from '../middleware/audit';

const router = Router();

router.use(authenticate);

const reportSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.string().min(1),
  objectName: z.string().min(1),
  columns: z.array(z.string()).min(1),
  filters: z.record(z.any()).optional(),
  groupBy: z.string().optional(),
  sortBy: z.string().optional(),
  isShared: z.boolean().optional(),
});

const updateReportSchema = reportSchema.partial();

router.get('/', authorize('Report', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { page = 1, limit = 20, type, objectName, isShared, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { tenantId };
    if (type) where.type = type;
    if (objectName) where.objectName = objectName;
    if (isShared !== undefined) where.isShared = isShared === 'true';
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
        take: Number(limit),
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
