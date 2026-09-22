ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Report_tenantId_deletedAt_idx" ON "Report"("tenantId", "deletedAt");