/**
 * Strips tenant-controlled fields from parsed input data
 * to prevent client-side override of server-set security fields.
 */
export function sanitizeInput<T extends Record<string, any>>(data: T): Omit<T, 'tenantId' | 'id' | 'createdAt' | 'updatedAt'> {
  const { tenantId, id, createdAt, updatedAt, ...rest } = data as any;
  return rest;
}
