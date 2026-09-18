import { Router, Response } from 'express';
import multer from 'multer';
import { prisma } from '@dct-crm/db';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireSuperAdmin } from '../middleware/superAdmin';
import { auditLog } from '../middleware/audit';
import {
  validateFile,
  generateSafeFilename,
  deleteFile,
  getLogoPath,
  serveLogo,
  UPLOAD_DIR,
  MAX_FILE_SIZE,
  ALLOWED_MIMES,
} from '../services/fileUpload';

const router = Router();

router.use(authenticate);
router.use(requireSuperAdmin);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => cb(null, generateSafeFilename(file.originalname)),
  }),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

const WROTE_FIELDS = [
  'name', 'companyCode', 'email', 'phone', 'website',
  'address', 'city', 'state', 'country', 'postalCode',
  'timezone', 'currency', 'description', 'domain', 'settings',
] as const;

const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(200),
  companyCode: z.string().min(1, 'Company code is required').max(50).regex(/^[A-Za-z0-9_-]+$/, 'Company code must be alphanumeric with hyphens or underscores'),
  email: z.string().email('Valid email is required').min(1, 'Email is required'),
  phone: z.string().min(1, 'Phone is required').max(30),
  website: z.string().url('Invalid URL').min(1, 'Website is required'),
  address: z.string().max(500).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
  postalCode: z.string().max(20).optional().or(z.literal('')),
  timezone: z.string().max(50).optional().or(z.literal('')),
  currency: z.string().max(10).optional().or(z.literal('')),
  description: z.string().max(2000).optional().or(z.literal('')),
  domain: z.string().max(200).optional().or(z.literal('')),
});

const updateCompanySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  companyCode: z.string().min(1).max(50).regex(/^[A-Za-z0-9_-]+$/).optional(),
  email: z.string().email('Valid email is required').min(1, 'Email is required'),
  phone: z.string().min(1, 'Phone is required').max(30),
  website: z.string().url('Invalid URL').min(1, 'Website is required'),
  address: z.string().max(500).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
  postalCode: z.string().max(20).optional().or(z.literal('')),
  timezone: z.string().max(50).optional().or(z.literal('')),
  currency: z.string().max(10).optional().or(z.literal('')),
  description: z.string().max(2000).optional().or(z.literal('')),
  domain: z.string().max(200).optional().or(z.literal('')),
}).refine(Object.keys, { message: 'At least one field must be provided' });

const ALLOWED_SORT_FIELDS = ['name', 'companyCode', 'createdAt', 'updatedAt', 'isActive'];
const ALLOWED_SORT_ORDERS = ['asc', 'desc'];

function sanitizeCompanyCreate(data: any) {
  const sanitized: any = {};
  for (const field of WROTE_FIELDS) {
    if (data[field] !== undefined && data[field] !== null) {
      sanitized[field] = data[field] === '' ? null : data[field];
    }
  }
  return sanitized;
}

function sanitizeCompanyUpdate(data: any) {
  const sanitized: any = {};
  const protectedFields = ['id', 'createdAt', 'updatedAt', 'createdBy', 'isSuperAdmin'];
  for (const [key, value] of Object.entries(data)) {
    if (!protectedFields.includes(key) && WROTE_FIELDS.includes(key as any)) {
      sanitized[key] = value === '' ? null : value;
    }
  }
  return sanitized;
}

router.get('/companies', async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const sortField = ALLOWED_SORT_FIELDS.includes(sortBy as string) ? sortBy as string : 'createdAt';
    const sortDir = ALLOWED_SORT_ORDERS.includes(sortOrder as string) ? sortOrder as 'asc' | 'desc' : 'desc';

    const where: any = {};
    if (isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { companyCode: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { country: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        include: {
          _count: { select: { users: true } },
        },
        skip,
        take: limitNum,
        orderBy: { [sortField]: sortDir },
      }),
      prisma.tenant.count({ where }),
    ]);

    res.json({
      success: true,
      data: tenants,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch companies' });
  }
});

router.get('/companies/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || id.includes('..') || id.includes('/') || id.includes('\\')) {
      return res.status(400).json({ success: false, error: 'Invalid company ID' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            roles: true,
            leads: true,
            opportunities: true,
            bookings: true,
            projects: true,
          },
        },
      },
    });

    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    res.json({ success: true, data: tenant });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch company' });
  }
});

router.post('/companies', async (req: AuthRequest, res: Response) => {
  try {
    const rawData = createCompanySchema.parse(req.body);

    const cleanData = sanitizeCompanyCreate(rawData);

    const existingBySlug = await prisma.tenant.findUnique({
      where: { slug: cleanData.companyCode.toLowerCase().replace(/[_\s]+/g, '-') },
    });
    if (existingBySlug) {
      return res.status(409).json({ success: false, error: 'A company with this code already exists (slug conflict)' });
    }

    const existingByCode = await prisma.tenant.findUnique({
      where: { companyCode: cleanData.companyCode },
    });
    if (existingByCode) {
      return res.status(409).json({ success: false, error: 'Company code already exists' });
    }

    const slug = cleanData.companyCode.toLowerCase().replace(/[_\s]+/g, '-');

    const tenant = await prisma.tenant.create({
      data: {
        name: cleanData.name,
        slug,
        companyCode: cleanData.companyCode,
        email: cleanData.email || null,
        phone: cleanData.phone || null,
        website: cleanData.website || null,
        address: cleanData.address || null,
        city: cleanData.city || null,
        state: cleanData.state || null,
        country: cleanData.country || null,
        postalCode: cleanData.postalCode || null,
        timezone: cleanData.timezone || null,
        currency: cleanData.currency || null,
        description: cleanData.description || null,
        domain: cleanData.domain || null,
        createdBy: req.user!.id,
      },
    });

    await auditLog(
      tenant.id,
      req.user!.id,
      'CREATE',
      'Tenant',
      tenant.id,
      undefined,
      { name: tenant.name, companyCode: tenant.companyCode },
      req.ip,
    );

    res.status(201).json({ success: true, data: tenant });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    console.error('Create company error:', error);
    res.status(500).json({ success: false, error: 'Failed to create company' });
  }
});

router.put('/companies/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || id.includes('..') || id.includes('/') || id.includes('\\')) {
      return res.status(400).json({ success: false, error: 'Invalid company ID' });
    }

    const existingTenant = await prisma.tenant.findUnique({ where: { id } });
    if (!existingTenant) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    const rawData = updateCompanySchema.parse(req.body);
    const cleanData = sanitizeCompanyUpdate(rawData);

    if (Object.keys(cleanData).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    if (cleanData.companyCode && cleanData.companyCode !== existingTenant.companyCode) {
      const dup = await prisma.tenant.findUnique({ where: { companyCode: cleanData.companyCode } });
      if (dup) {
        return res.status(409).json({ success: false, error: 'Company code already exists' });
      }
    }

    if (cleanData.companyCode) {
      cleanData.slug = cleanData.companyCode.toLowerCase().replace(/[_\s]+/g, '-');
    }

    cleanData.updatedBy = req.user!.id;

    const tenant = await prisma.tenant.update({
      where: { id },
      data: cleanData,
    });

    await auditLog(
      req.user!.tenantId,
      req.user!.id,
      'UPDATE',
      'Tenant',
      tenant.id,
      existingTenant,
      cleanData,
      req.ip,
    );

    res.json({ success: true, data: tenant });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    console.error('Update company error:', error);
    res.status(500).json({ success: false, error: 'Failed to update company' });
  }
});

router.put('/companies/:id/activate', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || id.includes('..') || id.includes('/') || id.includes('\\')) {
      return res.status(400).json({ success: false, error: 'Invalid company ID' });
    }

    const existingTenant = await prisma.tenant.findUnique({ where: { id } });
    if (!existingTenant) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    if (existingTenant.isActive) {
      return res.status(400).json({ success: false, error: 'Company is already active' });
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: { isActive: true, updatedBy: req.user!.id },
    });

    await auditLog(
      req.user!.tenantId,
      req.user!.id,
      'STATUS_CHANGE',
      'Tenant',
      tenant.id,
      { isActive: false },
      { isActive: true },
      req.ip,
    );

    res.json({ success: true, data: tenant });
  } catch (error) {
    console.error('Activate company error:', error);
    res.status(500).json({ success: false, error: 'Failed to activate company' });
  }
});

router.put('/companies/:id/deactivate', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || id.includes('..') || id.includes('/') || id.includes('\\')) {
      return res.status(400).json({ success: false, error: 'Invalid company ID' });
    }

    const existingTenant = await prisma.tenant.findUnique({ where: { id } });
    if (!existingTenant) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    if (!existingTenant.isActive) {
      return res.status(400).json({ success: false, error: 'Company is already inactive' });
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: { isActive: false, updatedBy: req.user!.id },
    });

    await auditLog(
      req.user!.tenantId,
      req.user!.id,
      'STATUS_CHANGE',
      'Tenant',
      tenant.id,
      { isActive: true },
      { isActive: false },
      req.ip,
    );

    res.json({ success: true, data: tenant });
  } catch (error) {
    console.error('Deactivate company error:', error);
    res.status(500).json({ success: false, error: 'Failed to deactivate company' });
  }
});

router.delete('/companies/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || id.includes('..') || id.includes('/') || id.includes('\\')) {
      return res.status(400).json({ success: false, error: 'Invalid company ID' });
    }

    const existingTenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            leads: true,
            contacts: true,
            accounts: true,
            customers: true,
            opportunities: true,
            quotations: true,
            bookings: true,
            payments: true,
            projects: true,
            tasks: true,
            activities: true,
            auditLogs: true,
            reports: true,
            dashboards: true,
            workflows: true,
            automations: true,
            notifications: true,
            roles: true,
            profiles: true,
            queues: true,
            followUps: true,
            aiConversations: true,
            objectDefinitions: true,
            customRecords: true,
            newPermissionSets: true,
            permissionSets: true,
            approvals: true,
            siteVisits: true,
            units: true,
          },
        },
      },
    });

    if (!existingTenant) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    const totalRecords = Object.values(existingTenant._count).reduce((a, b) => a + b, 0);
    if (totalRecords > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete company with ${totalRecords} associated record(s). Deactivate instead.`,
      });
    }

    if (existingTenant.logo) {
      deleteFile(getLogoPath(existingTenant.logo));
    }

    await prisma.tenant.delete({ where: { id } });

    res.json({ success: true, message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete company' });
  }
});

router.post('/companies/:id/logo', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || id.includes('..') || id.includes('/') || id.includes('\\')) {
      return res.status(400).json({ success: false, error: 'Invalid company ID' });
    }

    const existingTenant = await prisma.tenant.findUnique({ where: { id } });
    if (!existingTenant) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    const uploadSingle = upload.single('logo');
    uploadSingle(req, res, async (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, error: 'File size exceeds 5MB limit' });
          }
          return res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
        }
        return res.status(400).json({ success: false, error: err.message || 'File upload failed' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file provided' });
      }

      const validation = validateFile(req.file);
      if (!validation.valid) {
        deleteFile(req.file.path);
        return res.status(400).json({ success: false, error: validation.error });
      }

      if (existingTenant.logo) {
        deleteFile(getLogoPath(existingTenant.logo));
      }

      const tenant = await prisma.tenant.update({
        where: { id },
        data: { logo: req.file.filename, updatedBy: req.user!.id },
      });

      await auditLog(
        req.user!.tenantId,
        req.user!.id,
        existingTenant.logo ? 'LOGO_REPLACE' : 'LOGO_UPLOAD',
        'Tenant',
        tenant.id,
        { logo: existingTenant.logo },
        { logo: req.file.filename },
        req.ip,
      );

      res.json({ success: true, data: { logo: req.file.filename } });
    });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload logo' });
  }
});

router.delete('/companies/:id/logo', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || id.includes('..') || id.includes('/') || id.includes('\\')) {
      return res.status(400).json({ success: false, error: 'Invalid company ID' });
    }

    const existingTenant = await prisma.tenant.findUnique({ where: { id } });
    if (!existingTenant) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    if (!existingTenant.logo) {
      return res.status(400).json({ success: false, error: 'No logo to remove' });
    }

    deleteFile(getLogoPath(existingTenant.logo));

    const tenant = await prisma.tenant.update({
      where: { id },
      data: { logo: null, updatedBy: req.user!.id },
    });

    await auditLog(
      req.user!.tenantId,
      req.user!.id,
      'LOGO_REMOVE',
      'Tenant',
      tenant.id,
      { logo: existingTenant.logo },
      { logo: null },
      req.ip,
    );

    res.json({ success: true, message: 'Logo removed successfully' });
  } catch (error) {
    console.error('Remove logo error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove logo' });
  }
});

router.get('/logos/:filename', async (req: AuthRequest, res: Response) => {
  serveLogo(req, res);
});

router.get('/companies/:id/capacity', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || id.includes('..') || id.includes('/') || id.includes('\\')) {
      return res.status(400).json({ success: false, error: 'Invalid company ID' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    const activeUsers = await prisma.user.count({
      where: { tenantId: id, isActive: true, isSuperAdmin: false },
    });

    const profiles = await prisma.profile.findMany({
      where: { tenantId: id },
      select: { id: true, name: true, isAdmin: true },
    });

    const profileBreakdown = await Promise.all(
      profiles.map(async (profile) => {
        const count = await prisma.user.count({
          where: { tenantId: id, profileId: profile.id, isActive: true, isSuperAdmin: false },
        });
        return { profileId: profile.id, profileName: profile.name, isAdmin: profile.isAdmin, count };
      })
    );

    const adminUsers = profileBreakdown
      .filter((p) => p.isAdmin)
      .reduce((sum, p) => sum + p.count, 0);

    const noProfileUsers = activeUsers - profileBreakdown.reduce((sum, p) => sum + p.count, 0);

    res.json({
      success: true,
      data: {
        maxTotalUsers: tenant.maxTotalUsers,
        maxAdminUsers: tenant.maxAdminUsers,
        currentTotalUsers: activeUsers,
        currentAdminUsers: adminUsers,
        availableSlots: Math.max(0, tenant.maxTotalUsers - activeUsers),
        availableAdminSlots: Math.max(0, tenant.maxAdminUsers - adminUsers),
        profileBreakdown: profileBreakdown.filter((p) => p.count > 0),
        noProfileUsers,
        package: {
          name: tenant.packageName,
          status: tenant.packageStatus,
          startDate: tenant.packageStartDate,
          expiryDate: tenant.packageExpiryDate,
          notes: tenant.packageNotes,
        },
      },
    });
  } catch (error) {
    console.error('Get capacity error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch capacity' });
  }
});

const updateCapacitySchema = z.object({
  maxTotalUsers: z.number().int().min(1).max(10000).optional(),
  maxAdminUsers: z.number().int().min(0).max(10000).optional(),
});

router.put('/companies/:id/capacity', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || id.includes('..') || id.includes('/') || id.includes('\\')) {
      return res.status(400).json({ success: false, error: 'Invalid company ID' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    const data = updateCapacitySchema.parse(req.body);

    const updateData: Record<string, any> = {};
    if (data.maxTotalUsers !== undefined) updateData.maxTotalUsers = data.maxTotalUsers;
    if (data.maxAdminUsers !== undefined) updateData.maxAdminUsers = data.maxAdminUsers;

    const updated = await prisma.tenant.update({ where: { id }, data: updateData });

    await prisma.auditLog.create({
      data: {
        tenantId: id,
        userId: req.user!.id,
        action: 'UPDATE',
        objectType: 'Tenant',
        objectId: id,
        oldValues: { maxTotalUsers: tenant.maxTotalUsers, maxAdminUsers: tenant.maxAdminUsers },
        newValues: updateData,
      },
    });

    res.json({
      success: true,
      data: {
        maxTotalUsers: updated.maxTotalUsers,
        maxAdminUsers: updated.maxAdminUsers,
      },
      message: data.maxTotalUsers !== undefined && data.maxTotalUsers < tenant.maxTotalUsers
        ? 'Current users may exceed the new limit. New user creation is blocked until usage is within the configured limit.'
        : undefined,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    console.error('Update capacity error:', error);
    res.status(500).json({ success: false, error: 'Failed to update capacity' });
  }
});

const updatePackageSchema = z.object({
  packageName: z.string().nullable().optional(),
  packageStatus: z.enum(['active', 'inactive', 'trial', 'expired']).optional(),
  packageStartDate: z.string().nullable().optional(),
  packageExpiryDate: z.string().nullable().optional(),
  packageNotes: z.string().nullable().optional(),
});

router.put('/companies/:id/package', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || id.includes('..') || id.includes('/') || id.includes('\\')) {
      return res.status(400).json({ success: false, error: 'Invalid company ID' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    const rawData = updatePackageSchema.parse(req.body);
    const updateData: Record<string, any> = {};
    if (rawData.packageName !== undefined) updateData.packageName = rawData.packageName;
    if (rawData.packageStatus !== undefined) updateData.packageStatus = rawData.packageStatus;
    if (rawData.packageStartDate !== undefined) updateData.packageStartDate = rawData.packageStartDate ? new Date(rawData.packageStartDate) : null;
    if (rawData.packageExpiryDate !== undefined) updateData.packageExpiryDate = rawData.packageExpiryDate ? new Date(rawData.packageExpiryDate) : null;
    if (rawData.packageNotes !== undefined) updateData.packageNotes = rawData.packageNotes;

    const updated = await prisma.tenant.update({ where: { id }, data: updateData });

    await prisma.auditLog.create({
      data: {
        tenantId: id,
        userId: req.user!.id,
        action: 'UPDATE',
        objectType: 'Tenant',
        objectId: id,
        oldValues: { packageName: tenant.packageName, packageStatus: tenant.packageStatus },
        newValues: updateData,
      },
    });

    res.json({
      success: true,
      data: {
        packageName: updated.packageName,
        packageStatus: updated.packageStatus,
        packageStartDate: updated.packageStartDate,
        packageExpiryDate: updated.packageExpiryDate,
        packageNotes: updated.packageNotes,
      },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    console.error('Update package error:', error);
    res.status(500).json({ success: false, error: 'Failed to update package' });
  }
});

export { router as companyRoutes };
