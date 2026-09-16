import { Request, Response, NextFunction } from 'express';
import { prisma } from '@dct-crm/db';
import { AuthRequest } from './auth';

export interface TenantContext {
  id: string;
  name: string;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

export const tenantContext = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant context required' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, isActive: true },
    });

    if (!tenant) {
      return res.status(403).json({ success: false, error: 'Tenant not found' });
    }

    if (!tenant.isActive && !req.user?.isSuperAdmin) {
      return res.status(403).json({ success: false, error: 'Tenant is inactive' });
    }

    req.tenant = tenant;
    next();
  } catch (error) {
    console.error('Tenant context error:', error);
    return res.status(500).json({ success: false, error: 'Tenant validation failed' });
  }
};

export const requireTenantAccess = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  if (!req.user.tenantId) {
    return res.status(403).json({ success: false, error: 'No tenant associated with user' });
  }

  next();
};

export const validateTenantAccess = (userTenantId: string, resourceTenantId: string): boolean => {
  return userTenantId === resourceTenantId;
};

export const ensureTenantIsolation = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  if (req.user.isSuperAdmin) {
    return next();
  }

  const bodyTenantId = req.body?.tenantId;
  if (bodyTenantId && bodyTenantId !== req.user.tenantId) {
    delete req.body.tenantId;
  }

  next();
};
