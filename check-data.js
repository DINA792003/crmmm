const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) { console.log('NO TENANT FOUND'); return; }
  console.log('Tenant:', tenant.id, tenant.name);

  const counts = await Promise.all([
    prisma.lead.count({ where: { tenantId: tenant.id } }),
    prisma.customer.count({ where: { tenantId: tenant.id } }),
    prisma.project.count({ where: { tenantId: tenant.id } }),
    prisma.booking.count({ where: { tenantId: tenant.id } }),
    prisma.payment.count({ where: { tenantId: tenant.id } }),
    prisma.contact.count({ where: { tenantId: tenant.id } }),
    prisma.opportunity.count({ where: { tenantId: tenant.id } }),
    prisma.siteVisit.count({ where: { tenantId: tenant.id } }),
    prisma.unit.count({ where: { tenantId: tenant.id } }),
    prisma.user.count({ where: { tenantId: tenant.id } }),
    prisma.task.count({ where: { tenantId: tenant.id } }),
  ]);

  console.log('\n=== TOTAL RECORDS ===');
  console.log('Leads:', counts[0]);
  console.log('Customers:', counts[1]);
  console.log('Projects:', counts[2]);
  console.log('Bookings:', counts[3]);
  console.log('Payments:', counts[4]);
  console.log('Contacts:', counts[5]);
  console.log('Opportunities:', counts[6]);
  console.log('SiteVisits:', counts[7]);
  console.log('Units:', counts[8]);
  console.log('Users:', counts[9]);
  console.log('Tasks:', counts[10]);

  // Check date ranges of leads
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const todayLeads = await prisma.lead.count({ where: { tenantId: tenant.id, createdAt: { gte: todayStart } } });
  const weekLeads = await prisma.lead.count({ where: { tenantId: tenant.id, createdAt: { gte: weekStart } } });
  const monthLeads = await prisma.lead.count({ where: { tenantId: tenant.id, createdAt: { gte: monthStart } } });

  console.log('\n=== LEADS BY DATE ===');
  console.log('Today:', todayLeads);
  console.log('This Week:', weekLeads);
  console.log('This Month:', monthLeads);

  // Check date ranges of bookings
  const todayBookings = await prisma.booking.count({ where: { tenantId: tenant.id, createdAt: { gte: todayStart } } });
  const monthBookings = await prisma.booking.count({ where: { tenantId: tenant.id, createdAt: { gte: monthStart } } });
  const allBookings = await prisma.booking.aggregate({ where: { tenantId: tenant.id }, _sum: { totalAmount: true } });

  console.log('\n=== BOOKINGS BY DATE ===');
  console.log('Today:', todayBookings);
  console.log('This Month:', monthBookings);
  console.log('All Booking Value:', allBookings._sum.totalAmount || 0);

  // Check lead creation dates (sample)
  const sampleLeads = await prisma.lead.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, firstName: true, createdAt: true },
    take: 5,
    orderBy: { createdAt: 'desc' },
  });
  console.log('\n=== SAMPLE LEAD DATES (latest 5) ===');
  sampleLeads.forEach(l => console.log(`${l.firstName}: ${l.createdAt.toISOString()}`));

  // Check sample booking dates
  const sampleBookings = await prisma.booking.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, number: true, createdAt: true, totalAmount: true },
    take: 5,
    orderBy: { createdAt: 'desc' },
  });
  console.log('\n=== SAMPLE BOOKING DATES (latest 5) ===');
  sampleBookings.forEach(b => console.log(`${b.number}: ${b.createdAt.toISOString()} - ${b.totalAmount}`));

  // Check sample payment data
  const samplePayments = await prisma.payment.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, amount: true, status: true, createdAt: true },
    take: 5,
    orderBy: { createdAt: 'desc' },
  });
  console.log('\n=== SAMPLE PAYMENTS (latest 5) ===');
  samplePayments.forEach(p => console.log(`${p.status}: ${p.amount} - ${p.createdAt.toISOString()}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
