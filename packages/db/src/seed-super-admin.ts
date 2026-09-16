import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 12);

  // Create a dedicated platform tenant for Super Admin
  let platformTenant = await prisma.tenant.findUnique({ where: { slug: 'platform' } });
  if (!platformTenant) {
    platformTenant = await prisma.tenant.create({
      data: {
        name: 'Platform',
        slug: 'platform',
        settings: { type: 'platform' },
      },
    });
    console.log('Created platform tenant');
  }

  // Check if Super Admin already exists
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { email: 'superadmin@dctcrm.com' },
  });

  if (!existingSuperAdmin) {
    const superAdmin = await prisma.user.create({
      data: {
        tenantId: platformTenant.id,
        email: 'superadmin@dctcrm.com',
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        isSuperAdmin: true,
        isActive: true,
      },
    });
    console.log(`Created Super Admin user: ${superAdmin.email} (ID: ${superAdmin.id})`);
    console.log('Login credentials: superadmin@dctcrm.com / password123');
  } else {
    console.log('Super Admin user already exists');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
