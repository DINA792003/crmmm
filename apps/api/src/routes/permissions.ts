import { Router, Response } from 'express';
import { prisma } from '@dct-crm/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';

const router = Router();
router.use(authenticate);

router.get('/', requirePermission('PERMISSION_SET_READ'), async (req: AuthRequest, res: Response) => {
  try {
    const { module } = req.query;

    const where: any = { isActive: true };
    if (module) where.module = module as string;

    const permissions = await prisma.permission.findMany({
      where,
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });

    const byModule: Record<string, any[]> = {};
    for (const perm of permissions) {
      if (!byModule[perm.module]) byModule[perm.module] = [];
      byModule[perm.module].push(perm);
    }

    res.json({ success: true, data: permissions, byModule });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch permissions' });
  }
});

router.get('/modules', requirePermission('PERMISSION_SET_READ'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await prisma.permission.groupBy({
      by: ['module'],
      where: { isActive: true },
      _count: { id: true },
      orderBy: { module: 'asc' },
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get permission modules error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch permission modules' });
  }
});

export { router as permissionRoutes };
