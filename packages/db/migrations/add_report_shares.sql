CREATE TABLE IF NOT EXISTS "ReportShare" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "userId" TEXT,
  "roleId" TEXT,
  "accessLevel" TEXT NOT NULL DEFAULT 'VIEWER',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReportShare_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReportShare_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReportShare_target_check" CHECK (("userId" IS NOT NULL) OR ("roleId" IS NOT NULL)
));
CREATE UNIQUE INDEX IF NOT EXISTS "ReportShare_reportId_userId_roleId_key" ON "ReportShare"("reportId", "userId", "roleId");
CREATE INDEX IF NOT EXISTS "ReportShare_tenantId_userId_idx" ON "ReportShare"("tenantId", "userId");
CREATE INDEX IF NOT EXISTS "ReportShare_tenantId_roleId_idx" ON "ReportShare"("tenantId", "roleId");