import { Router, Response } from 'express';
import { prisma } from '@dct-crm/db';
import { leadSchema } from '@dct-crm/shared';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/authorization';
import { canTransitionStatus, getAllowedStatuses } from '../services/workflow';

const router = Router();

router.use(authenticate);

router.get('/', authorize('Lead', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status, source, ownerId, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { tenantId: req.tenantId! };
    if (status) where.status = status;
    if (source) where.source = source;
    if (ownerId) where.ownerId = ownerId;
    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } },
        { company: { contains: search as string, mode: 'insensitive' } },
        { title: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const userProfile = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { profile: { select: { name: true } } },
    });
    const profileName = userProfile?.profile?.name || 'Admin';

    if (profileName !== 'Admin' && profileName !== 'Manager' && profileName !== 'CRM Admin') {
      const allowedStatuses = getAllowedStatuses(profileName);
      if (allowedStatuses.length > 0) {
        where.status = { in: allowedStatuses };
      }
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          owner: { select: { id: true, firstName: true, lastName: true } },
          project: { select: { id: true, name: true } },
          _count: { select: { siteVisits: true, opportunities: true, activities: true } },
        },
        skip,
        take: Number(limit),
        orderBy: { [sortBy as string]: sortOrder },
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({
      success: true,
      data: leads,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leads' });
  }
});

router.get('/:id', authorize('Lead', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
        siteVisits: {
          include: { assignee: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { scheduledAt: 'desc' },
        },
        opportunities: {
          include: { owner: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        followUps: {
          orderBy: { dueDate: 'asc' },
          take: 10,
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    res.json({ success: true, data: lead });
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch lead' });
  }
});

router.post('/', authorize('Lead', 'create'), async (req: AuthRequest, res: Response) => {
  try {
    const data = leadSchema.parse(req.body);

    const lead = await prisma.lead.create({
      data: {
        tenantId: req.tenantId!,
        creatorId: req.user!.id,
        firstName: data.firstName || undefined,
        lastName: data.lastName,
        salutation: data.salutation || undefined,
        title: data.title || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        mobile: data.mobile || undefined,
        website: data.website || undefined,
        company: data.company,
        industry: data.industry || undefined,
        annualRevenue: data.annualRevenue || undefined,
        numberOfEmployees: data.numberOfEmployees || undefined,
        source: data.source,
        status: data.status || 'NEW',
        rating: data.rating || undefined,
        description: data.description || undefined,
        street: data.street || undefined,
        city: data.city || undefined,
        stateProvince: data.stateProvince || undefined,
        country: data.country || undefined,
        postalCode: data.postalCode || undefined,
        score: data.score || 0,
        budget: data.budget || undefined,
        ownerId: data.ownerId || req.user!.id,
        projectId: data.projectId || undefined,
      },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: req.tenantId!,
        userId: req.user!.id,
        leadId: lead.id,
        action: 'CREATE',
        objectType: 'Lead',
        objectId: lead.id,
        newValues: data,
      },
    });

    res.status(201).json({ success: true, data: lead });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    console.error('Create lead error:', error);
    res.status(500).json({ success: false, error: 'Failed to create lead' });
  }
});

router.put('/:id', authorize('Lead', 'edit'), async (req: AuthRequest, res: Response) => {
  try {
    const existingLead = await prisma.lead.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
    });

    if (!existingLead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const data = leadSchema.partial().parse(req.body);

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
        salutation: data.salutation || undefined,
        title: data.title || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        mobile: data.mobile || undefined,
        website: data.website || undefined,
        company: data.company || undefined,
        industry: data.industry || undefined,
        annualRevenue: data.annualRevenue || undefined,
        numberOfEmployees: data.numberOfEmployees || undefined,
        source: data.source || undefined,
        status: data.status || undefined,
        rating: data.rating || undefined,
        description: data.description || undefined,
        street: data.street || undefined,
        city: data.city || undefined,
        stateProvince: data.stateProvince || undefined,
        country: data.country || undefined,
        postalCode: data.postalCode || undefined,
        score: data.score || undefined,
        budget: data.budget || undefined,
        ownerId: data.ownerId || undefined,
        projectId: data.projectId || undefined,
      },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: req.tenantId!,
        userId: req.user!.id,
        leadId: lead.id,
        action: 'UPDATE',
        objectType: 'Lead',
        objectId: lead.id,
        oldValues: existingLead,
        newValues: data,
      },
    });

    res.json({ success: true, data: lead });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    console.error('Update lead error:', error);
    res.status(500).json({ success: false, error: 'Failed to update lead' });
  }
});

router.delete('/:id', authorize('Lead', 'delete'), async (req: AuthRequest, res: Response) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
    });

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    await prisma.lead.delete({ where: { id: req.params.id } });

    await prisma.auditLog.create({
      data: {
        tenantId: req.tenantId!,
        userId: req.user!.id,
        action: 'DELETE',
        objectType: 'Lead',
        objectId: req.params.id,
        oldValues: lead,
      },
    });

    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete lead' });
  }
});

router.put('/:id/status', authorize('Lead', 'edit'), async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
    });

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const userProfile = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { profile: { select: { name: true } } },
    });
    const profileName = userProfile?.profile?.name || 'Admin';

    if (profileName !== 'Admin' && profileName !== 'Manager' && profileName !== 'CRM Admin') {
      if (!canTransitionStatus(profileName, lead.status, status)) {
        return res.status(403).json({
          success: false,
          error: `Your profile (${profileName}) does not have permission to change lead status from ${lead.status} to ${status}`,
        });
      }
    }

    const updatedLead = await prisma.lead.update({
      where: { id: req.params.id },
      data: { status },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: req.tenantId!,
        userId: req.user!.id,
        leadId: lead.id,
        action: 'STATUS_CHANGE',
        objectType: 'Lead',
        objectId: lead.id,
        oldValues: { status: lead.status },
        newValues: { status },
      },
    });

    res.json({ success: true, data: updatedLead });
  } catch (error) {
    console.error('Update lead status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update lead status' });
  }
});

router.post('/:id/recovery', authorize('Lead', 'edit'), async (req: AuthRequest, res: Response) => {
  try {
    const { recoveryReason, note } = req.body;

    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
    });

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const userProfile = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { profile: { select: { name: true } } },
    });
    const profileName = userProfile?.profile?.name || 'Admin';

    if (profileName !== 'Admin' && profileName !== 'Manager' && profileName !== 'CRM Admin') {
      if (!canTransitionStatus(profileName, lead.status, 'LOST')) {
        return res.status(403).json({
          success: false,
          error: `Your profile (${profileName}) does not have permission to move this lead to recovery`,
        });
      }
    }

    const updatedLead = await prisma.lead.update({
      where: { id: req.params.id },
      data: { status: 'LOST' },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: req.tenantId!,
        userId: req.user!.id,
        leadId: lead.id,
        action: 'STATUS_CHANGE',
        objectType: 'Lead',
        objectId: lead.id,
        oldValues: { status: lead.status },
        newValues: { status: 'LOST', recoveryReason, recoveryNote: note, profile: profileName },
      },
    });

    res.json({ success: true, data: updatedLead });
  } catch (error) {
    console.error('Recovery lead error:', error);
    res.status(500).json({ success: false, error: 'Failed to move lead to recovery' });
  }
});

router.put('/:id/assign', authorize('Lead', 'edit'), async (req: AuthRequest, res: Response) => {
  try {
    const { ownerId } = req.body;
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
    });

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const updatedLead = await prisma.lead.update({
      where: { id: req.params.id },
      data: { ownerId },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: req.tenantId!,
        userId: req.user!.id,
        leadId: lead.id,
        action: 'ASSIGN',
        objectType: 'Lead',
        objectId: lead.id,
        oldValues: { ownerId: lead.ownerId },
        newValues: { ownerId },
      },
    });

    res.json({ success: true, data: updatedLead });
  } catch (error) {
    console.error('Assign lead error:', error);
    res.status(500).json({ success: false, error: 'Failed to assign lead' });
  }
});

export { router as leadRoutes };
