import { Request, Response, NextFunction } from 'express';
import { prisma } from '@dct-crm/db';

export const tenantContext = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant context required' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, isActive: true },
    });

    if (!tenant || !tenant.isActive) {
      return res.status(403).json({ success: false, error: 'Invalid or inactive tenant' });
    }

    (req as any).tenant = tenant;
    next();
  } catch (error) {
    console.error('Tenant context error:', error);
    return res.status(500).json({ success: false, error: 'Tenant validation failed' });
  }
};

export const validateTenantAccess = (tenantId: string, resourceTenantId: string): boolean => {
  return tenantId === resourceTenantId;
};
