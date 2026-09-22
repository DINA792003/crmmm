import { Router, Response } from 'express';
import { prisma } from '@dct-crm/db';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/authorization';
import { canAccessDashboardForUser, canAccessReportForUser, runReport } from '../reports/report-engine';

const router = Router();

router.use(authenticate);

const widgetSchema = z.object({
  id: z.string(),
  type: z.enum(['kpi', 'metric', 'chart', 'table', 'funnel', 'leaderboard', 'trend', 'gauge']),
  title: z.string(),
  metric: z.string().optional(),
  config: z.record(z.any()).optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  }),
});

const dashboardSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  layout: z.array(widgetSchema),
  isDefault: z.boolean().optional(),
});

const updateDashboardSchema = dashboardSchema.partial();

function ensureDashboardAccess(dashboard: { createdBy?: string | null; isDefault?: boolean | null; tenantId?: string | null } | null, req: AuthRequest) {
  if (!dashboard) {
    return false;
  }

  const permissions = req.effectivePermissions?.map((perm) => perm.name) || [];
  return canAccessDashboardForUser(dashboard, {
    id: req.user!.id,
    tenantId: req.user!.tenantId,
    isSuperAdmin: req.user!.isSuperAdmin,
  }, permissions);
}

router.get('/', authorize('Dashboard', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, isDefault, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { tenantId: req.tenantId! };
    if (isDefault !== undefined) where.isDefault = isDefault === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [dashboards, total] = await Promise.all([
      prisma.dashboard.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy as string]: sortOrder },
      }),
      prisma.dashboard.count({ where }),
    ]);

    res.json({
      success: true,
      data: dashboards,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get dashboards error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboards' });
  }
});

router.get('/default', authorize('Dashboard', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const dashboard = await prisma.dashboard.findFirst({
      where: { tenantId: req.tenantId!, isDefault: true },
    });

    if (!dashboard) {
      return res.status(404).json({ success: false, error: 'No default dashboard found' });
    }

    if (!ensureDashboardAccess(dashboard, req)) {
      return res.status(403).json({ success: false, error: 'Access denied: dashboard is not visible to you' });
    }

    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('Get default dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch default dashboard' });
  }
});

router.get('/:id', authorize('Dashboard', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const dashboard = await prisma.dashboard.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
    });

    if (!dashboard) {
      return res.status(404).json({ success: false, error: 'Dashboard not found' });
    }

    if (!ensureDashboardAccess(dashboard, req)) {
      return res.status(403).json({ success: false, error: 'Access denied: dashboard is not visible to you' });
    }

    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard' });
  }
});

router.post('/', authorize('Dashboard', 'create'), async (req: AuthRequest, res: Response) => {
  try {
    const data = dashboardSchema.parse(req.body);

    if (data.isDefault) {
      await prisma.dashboard.updateMany({
        where: { tenantId: req.tenantId!, isDefault: true },
        data: { isDefault: false },
      });
    }

    const dashboard = await prisma.dashboard.create({
      data: {
        tenantId: req.tenantId!,
        createdBy: req.user!.id,
        name: data.name,
        description: data.description,
        layout: data.layout,
        isDefault: data.isDefault || false,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: req.tenantId!,
        userId: req.user!.id,
        action: 'CREATE',
        objectType: 'Dashboard',
        objectId: dashboard.id,
        newValues: { name: data.name },
      },
    });

    res.status(201).json({ success: true, data: dashboard });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    console.error('Create dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to create dashboard' });
  }
});

router.put('/:id', authorize('Dashboard', 'edit'), async (req: AuthRequest, res: Response) => {
  try {
    const existingDashboard = await prisma.dashboard.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
    });

    if (!existingDashboard) {
      return res.status(404).json({ success: false, error: 'Dashboard not found' });
    }

    if (existingDashboard.createdBy !== req.user!.id && !req.user?.isSuperAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied: you can only update your own dashboard' });
    }

    const data = updateDashboardSchema.parse(req.body);

    if (data.isDefault) {
      await prisma.dashboard.updateMany({
        where: { tenantId: req.tenantId!, isDefault: true, id: { not: req.params.id } },
        data: { isDefault: false },
      });
    }

    const dashboard = await prisma.dashboard.update({
      where: { id: req.params.id },
      data,
    });

    await prisma.auditLog.create({
      data: {
        tenantId: req.tenantId!,
        userId: req.user!.id,
        action: 'UPDATE',
        objectType: 'Dashboard',
        objectId: dashboard.id,
        oldValues: existingDashboard,
        newValues: data,
      },
    });

    res.json({ success: true, data: dashboard });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    console.error('Update dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to update dashboard' });
  }
});

router.delete('/:id', authorize('Dashboard', 'delete'), async (req: AuthRequest, res: Response) => {
  try {
    const dashboard = await prisma.dashboard.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
    });

    if (!dashboard) {
      return res.status(404).json({ success: false, error: 'Dashboard not found' });
    }

    if (dashboard.createdBy !== req.user!.id && !req.user?.isSuperAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied: you can only delete your own dashboard' });
    }

    if (dashboard.isDefault) {
      return res.status(400).json({ success: false, error: 'Cannot delete default dashboard' });
    }

    await prisma.dashboard.delete({ where: { id: req.params.id } });

    await prisma.auditLog.create({
      data: {
        tenantId: req.tenantId!,
        userId: req.user!.id,
        action: 'DELETE',
        objectType: 'Dashboard',
        objectId: req.params.id,
        oldValues: dashboard,
      },
    });

    res.json({ success: true, message: 'Dashboard deleted successfully' });
  } catch (error) {
    console.error('Delete dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete dashboard' });
  }
});

router.post('/:id/widgets/:widgetId/data', authorize('Dashboard', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const dashboard = await prisma.dashboard.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
    });

    if (!dashboard) {
      return res.status(404).json({ success: false, error: 'Dashboard not found' });
    }

    if (!ensureDashboardAccess(dashboard, req)) {
      return res.status(403).json({ success: false, error: 'Access denied: dashboard is not visible to you' });
    }

    const layout = dashboard.layout as any[];
    const widget = layout.find((w: any) => w.id === req.params.widgetId);

    if (!widget) {
      return res.status(404).json({ success: false, error: 'Widget not found' });
    }

    const metricMap: Record<string, () => Promise<any>> = {
      totalLeads: async () => prisma.lead.count({ where: { tenantId: req.tenantId! } }),
      totalOpportunities: async () => prisma.opportunity.count({ where: { tenantId: req.tenantId! } }),
      totalBookings: async () => prisma.booking.count({ where: { tenantId: req.tenantId! } }),
      totalRevenue: async () => {
        const result = await prisma.payment.aggregate({
          where: { tenantId: req.tenantId!, status: 'COMPLETED' },
          _sum: { amount: true },
        });
        return result._sum.amount || 0;
      },
      leadsByStatus: async () => {
        const statuses = ['NEW', 'PROSPECT', 'SITE_VISIT_SCHEDULED', 'SALES', 'BOOKED', 'LOST'];
        const results = await Promise.all(
          statuses.map(async (status) => ({
            status,
            count: await prisma.lead.count({ where: { tenantId: req.tenantId!, status: status as any } }),
          }))
        );
        return results;
      },
      opportunitiesByStage: async () => {
        const stages = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
        const results = await Promise.all(
          stages.map(async (stage) => ({
            stage,
            count: await prisma.opportunity.count({ where: { tenantId: req.tenantId!, stage: stage as any } }),
            amount: await prisma.opportunity.aggregate({
              where: { tenantId: req.tenantId!, stage: stage as any },
              _sum: { amount: true },
            }).then((r) => r._sum.amount || 0),
          }))
        );
        return results;
      },
      recentActivities: async () =>
        prisma.activity.findMany({
          where: { tenantId: req.tenantId! },
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      topOwners: async () => {
        const owners = await prisma.lead.groupBy({
          by: ['ownerId'],
          where: { tenantId: req.tenantId!, ownerId: { not: null } },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        });
        const ownerIds = owners.map((o) => o.ownerId!);
        const users = await prisma.user.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, firstName: true, lastName: true },
        });
        return owners.map((o) => ({
          ...o,
          user: users.find((u) => u.id === o.ownerId),
        }));
      },
    };

    const reportId = (widget as any).reportId || widget.config?.reportId;
    if (reportId) {
      const report = await prisma.report.findFirst({ where: { id: String(reportId), tenantId: req.tenantId!, deletedAt: null } });
      const permissions = req.effectivePermissions?.map((permission) => permission.name) || [];
      const roleIds = (await prisma.userRole.findMany({ where: { userId: req.user!.id }, select: { roleId: true } })).map((role) => role.roleId);
      const explicitShare = report ? await prisma.reportShare.findFirst({ where: { reportId: report.id, tenantId: req.tenantId!, OR: [{ userId: req.user!.id }, ...(roleIds.length ? [{ roleId: { in: roleIds } }] : [])] } }) : null;
      if (!report || (!canAccessReportForUser(report, { id: req.user!.id, tenantId: req.tenantId!, isSuperAdmin: req.user!.isSuperAdmin }, permissions) && !explicitShare)) {
        return res.status(403).json({ success: false, error: 'Access denied: report is not available to this dashboard user' });
      }
      const result = await runReport({ tenantId: req.tenantId!, objectName: report.objectName, columns: Array.isArray(report.columns) ? report.columns as string[] : [], filters: Array.isArray(report.filters) ? report.filters as any[] : [], groupBy: report.groupBy || undefined, sortBy: report.sortBy || undefined, limit: Number(widget.config?.rowLimit) || 1000 });
      return res.json({ success: true, data: { widget, data: result } });
    }

    const metric = widget.metric || widget.config?.metric;
    let data: any = null;

    if (metric && metricMap[metric]) {
      data = await metricMap[metric]();
    } else {
      data = { message: 'No data source configured for this widget' };
    }

    res.json({ success: true, data: { widget, data } });
  } catch (error) {
    console.error('Get widget data error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch widget data' });
  }
});

export { router as dashboardRoutes };
