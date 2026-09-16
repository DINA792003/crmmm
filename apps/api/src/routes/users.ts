import { Router, Response } from 'express';
import { prisma } from '@dct-crm/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/authorization';

const router = Router();

router.use(authenticate);

const inviteUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  roleIds: z.array(z.string()).min(1),
  password: z.string().min(8).optional(),
  profileId: z.string().optional(),
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  profileId: z.string().nullable().optional(),
});

router.get('/', authorize('User', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, isActive, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { tenantId: req.tenantId! };
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          profileId: true,
          profile: { select: { id: true, name: true } },
          roles: {
            include: {
              role: { select: { id: true, name: true } },
            },
          },
          _count: { select: { tasks: true, activities: true } },
        },
        skip,
        take: Number(limit),
        orderBy: { [sortBy as string]: sortOrder },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

router.get('/me', authorize('User', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        tenant: { select: { id: true, name: true, slug: true, logo: true, settings: true } },
        roles: {
          include: {
            role: {
              include: {
                permissionSets: {
                  include: {
                    permissionSet: { select: { objectName: true, permissions: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
  }
});

router.get('/:id', authorize('User', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        profileId: true,
        profile: { select: { id: true, name: true } },
        roles: {
          include: {
            role: { select: { id: true, name: true } },
          },
        },
        _count: { select: { tasks: true, activities: true, assignedLeads: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

router.post('/', authorize('User', 'create'), async (req: AuthRequest, res: Response) => {
  try {
    const data = inviteUserSchema.parse(req.body);

    const existingUser = await prisma.user.findFirst({
      where: { tenantId: req.tenantId!, email: data.email },
    });

    if (existingUser) {
      return res.status(409).json({ success: false, error: 'User with this email already exists in this tenant' });
    }

    const password = data.password || Math.random().toString(36).slice(-12);
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        tenantId: req.tenantId!,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        passwordHash,
        profileId: data.profileId || undefined,
        roles: {
          create: data.roleIds.map((roleId) => ({ roleId })),
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        createdAt: true,
        profileId: true,
        profile: { select: { id: true, name: true } },
        roles: {
          include: {
            role: { select: { id: true, name: true } },
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: req.tenantId!,
        userId: req.user!.id,
        action: 'CREATE',
        objectType: 'User',
        objectId: user.id,
        newValues: { email: data.email, firstName: data.firstName, lastName: data.lastName },
      },
    });

    res.status(201).json({ success: true, data: user });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    console.error('Create user error:', error);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

router.put('/:id', authorize('User', 'edit'), async (req: AuthRequest, res: Response) => {
  try {
    const existingUser = await prisma.user.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
    });

    if (!existingUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const data = updateUserSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        profileId: true,
        profile: { select: { id: true, name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: req.tenantId!,
        userId: req.user!.id,
        action: 'UPDATE',
        objectType: 'User',
        objectId: user.id,
        oldValues: existingUser,
        newValues: data,
      },
    });

    res.json({ success: true, data: user });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

router.put('/:id/deactivate', authorize('User', 'edit'), async (req: AuthRequest, res: Response) => {
  try {
    const existingUser = await prisma.user.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
    });

    if (!existingUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (req.params.id === req.user!.id) {
      return res.status(400).json({ success: false, error: 'Cannot deactivate your own account' });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: req.tenantId!,
        userId: req.user!.id,
        action: 'STATUS_CHANGE',
        objectType: 'User',
        objectId: user.id,
        oldValues: { isActive: true },
        newValues: { isActive: false },
      },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ success: false, error: 'Failed to deactivate user' });
  }
});

router.put('/:id/activate', authorize('User', 'edit'), async (req: AuthRequest, res: Response) => {
  try {
    const existingUser = await prisma.user.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
    });

    if (!existingUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: true },
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: req.tenantId!,
        userId: req.user!.id,
        action: 'STATUS_CHANGE',
        objectType: 'User',
        objectId: user.id,
        oldValues: { isActive: false },
        newValues: { isActive: true },
      },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ success: false, error: 'Failed to activate user' });
  }
});

router.put('/:id/roles', authorize('User', 'edit'), async (req: AuthRequest, res: Response) => {
  try {
    const { roleIds } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
    });

    if (!existingUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await prisma.userRole.deleteMany({ where: { userId: req.params.id } });

    if (roleIds && roleIds.length > 0) {
      await prisma.userRole.createMany({
        data: roleIds.map((roleId: string) => ({ userId: req.params.id, roleId })),
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profileId: true,
        profile: { select: { id: true, name: true } },
        roles: {
          include: {
            role: { select: { id: true, name: true } },
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: req.tenantId!,
        userId: req.user!.id,
        action: 'UPDATE',
        objectType: 'User',
        objectId: req.params.id,
        newValues: { roleIds },
      },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Update user roles error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user roles' });
  }
});

router.put('/:id/profile', authorize('User', 'edit'), async (req: AuthRequest, res: Response) => {
  try {
    const { profileId } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
    });

    if (!existingUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { profileId: profileId || null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profileId: true,
        profile: { select: { id: true, name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: req.tenantId!,
        userId: req.user!.id,
        action: 'UPDATE',
        objectType: 'User',
        objectId: user.id,
        oldValues: { profileId: existingUser.profileId },
        newValues: { profileId },
      },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user profile' });
  }
});

router.delete('/:id', authorize('User', 'delete'), async (req: AuthRequest, res: Response) => {
  try {
    const existingUser = await prisma.user.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
    });

    if (!existingUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (req.params.id === req.user!.id) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
    }

    await prisma.userRole.deleteMany({ where: { userId: req.params.id } });
    await prisma.user.delete({ where: { id: req.params.id } });

    await prisma.auditLog.create({
      data: {
        tenantId: req.tenantId!,
        userId: req.user!.id,
        action: 'DELETE',
        objectType: 'User',
        objectId: req.params.id,
        oldValues: existingUser,
      },
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

export { router as userRoutes };
