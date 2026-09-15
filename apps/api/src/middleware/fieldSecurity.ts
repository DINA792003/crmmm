import { Response, NextFunction } from 'express';
import { prisma } from '@dct-crm/db';
import { AuthRequest } from './auth';

export const filterResponseFields = (objectName: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return next();

    const originalJson = res.json.bind(res);
    (res as any).json = async (body: any) => {
      try {
        if (!body || !body.success || !body.data) {
          return originalJson(body);
        }

        const object = await prisma.objectDefinition.findFirst({
          where: { tenantId: req.tenantId!, name: { equals: objectName, mode: 'insensitive' } },
        });
        if (!object) return originalJson(body);

        const userRoles = await prisma.userRole.findMany({
          where: { userId: req.user!.id },
          select: { roleId: true },
        });

        if (userRoles.length === 0) return originalJson(body);

        const roleIds = userRoles.map(ur => ur.roleId);

        const fieldPerms = await prisma.fieldPermission.findMany({
          where: {
            roleId: { in: roleIds },
            field: { objectId: object.id },
          },
          include: {
            field: { select: { name: true } },
          },
        });

        if (fieldPerms.length === 0) return originalJson(body);

        const hiddenFields = new Set<string>();
        for (const fp of fieldPerms) {
          if (!fp.canRead) {
            hiddenFields.add(fp.field.name);
          }
        }

        if (hiddenFields.size === 0) return originalJson(body);

        const filterData = (data: any): any => {
          if (Array.isArray(data)) {
            return data.map(filterData);
          }
          if (data && typeof data === 'object' && data.data) {
            const filteredData: Record<string, any> = {};
            for (const [key, value] of Object.entries(data.data)) {
              if (!hiddenFields.has(key)) {
                filteredData[key] = value;
              }
            }
            return { ...data, data: filteredData };
          }
          if (data && typeof data === 'object') {
            const filtered: Record<string, any> = {};
            for (const [key, value] of Object.entries(data)) {
              if (!hiddenFields.has(key)) {
                filtered[key] = value;
              }
            }
            return filtered;
          }
          return data;
        };

        const filteredBody = filterData(body);
        return originalJson(filteredBody);
      } catch (error) {
        return originalJson(body);
      }
    };

    next();
  };
};

export const checkFieldEditPermission = (
  objectName: string,
  fieldName: string
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return next();

    try {
      const object = await prisma.objectDefinition.findFirst({
        where: { tenantId: req.tenantId!, name: { equals: objectName, mode: 'insensitive' } },
      });
      if (!object) return next();

      const field = await prisma.fieldDefinition.findFirst({
        where: { objectId: object.id, name: fieldName },
      });
      if (!field) return next();

      const userRoles = await prisma.userRole.findMany({
        where: { userId: req.user.id },
        select: { roleId: true },
      });

      if (userRoles.length === 0) return next();

      const roleIds = userRoles.map(ur => ur.roleId);

      const fieldPerm = await prisma.fieldPermission.findFirst({
        where: {
          roleId: { in: roleIds },
          field: { objectId: object.id, name: fieldName },
        },
      });

      if (fieldPerm && !fieldPerm.canEdit) {
        return res.status(403).json({
          success: false,
          error: `Insufficient permissions to edit field: ${fieldName}`,
        });
      }

      next();
    } catch (error) {
      next();
    }
  };
};
