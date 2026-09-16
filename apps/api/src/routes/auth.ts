import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '@dct-crm/db';
import { loginSchema } from '@dct-crm/shared';
import { generateToken, setAuthCookie, authenticate, AuthRequest } from '../middleware/auth';
import { EffectivePermissionService } from '../services/effectivePermissions';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: { email, isActive: true },
      include: {
        tenant: { select: { id: true, name: true, slug: true, isActive: true } },
        profile: { select: { id: true, name: true, description: true, leadStatusAccess: true } },
        roles: {
          include: {
            role: {
              include: {
                permissionSets: {
                  include: { permissionSet: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    if (!user.tenant.isActive) {
      return res.status(403).json({ success: false, error: 'Tenant is inactive' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      isSuperAdmin: user.isSuperAdmin,
    });

    setAuthCookie(res, token);

    const effectivePerms = await EffectivePermissionService.getEffectivePermissions(user.id);

    const hasFullAccess = effectivePerms.some((p) => p.name === 'FULL_SYSTEM_ACCESS');
    const granularPermissions: Record<string, string[]> = {};
    for (const perm of effectivePerms) {
      if (!granularPermissions[perm.module]) granularPermissions[perm.module] = [];
      granularPermissions[perm.module].push(perm.name);
    }

    const legacyPermissions: Record<string, any> = {};
    for (const userRole of user.roles) {
      for (const rolePerm of userRole.role.permissionSets) {
        const objName = rolePerm.permissionSet.objectName;
        if (!legacyPermissions[objName]) {
          legacyPermissions[objName] = rolePerm.permissionSet.permissions;
        }
      }
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          isSuperAdmin: user.isSuperAdmin,
        },
        profile: user.profile,
        tenant: user.tenant,
        roles: user.roles.map((ur) => ur.role.name),
        permissions: legacyPermissions,
        effectivePermissions: effectivePerms.map((p) => p.name),
        effectivePermissionsByModule: granularPermissions,
        hasFullAccess,
      },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  res.cookie('token', '', { httpOnly: true, expires: new Date(0) });
  res.json({ success: true, message: 'Logged out successfully' });
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
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
        isSuperAdmin: true,
        tenant: { select: { id: true, name: true, slug: true } },
        profile: { select: { id: true, name: true, description: true, leadStatusAccess: true } },
        roles: {
          include: {
            role: {
              include: {
                permissionSets: {
                  include: { permissionSet: true },
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

    const effectivePerms = await EffectivePermissionService.getEffectivePermissions(user.id);

    const hasFullAccess = effectivePerms.some((p) => p.name === 'FULL_SYSTEM_ACCESS');
    const granularPermissions: Record<string, string[]> = {};
    for (const perm of effectivePerms) {
      if (!granularPermissions[perm.module]) granularPermissions[perm.module] = [];
      granularPermissions[perm.module].push(perm.name);
    }

    const legacyPermissions: Record<string, any> = {};
    for (const userRole of user.roles) {
      for (const rolePerm of userRole.role.permissionSets) {
        const objName = rolePerm.permissionSet.objectName;
        if (!legacyPermissions[objName]) {
          legacyPermissions[objName] = rolePerm.permissionSet.permissions;
        }
      }
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          avatar: user.avatar,
          isSuperAdmin: user.isSuperAdmin,
        },
        profile: user.profile,
        tenant: user.tenant,
        roles: user.roles.map((ur) => ur.role.name),
        permissions: legacyPermissions,
        effectivePermissions: effectivePerms.map((p) => p.name),
        effectivePermissionsByModule: granularPermissions,
        hasFullAccess,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Failed to get user' });
  }
});

export { router as authRoutes };
