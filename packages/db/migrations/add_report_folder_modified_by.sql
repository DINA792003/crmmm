ALTER TABLE "ReportFolder" ADD COLUMN IF NOT EXISTS "modifiedBy" TEXT;
ALTER TABLE "ReportFolder" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "ReportFolder_tenantId_deletedAt_idx" ON "ReportFolder"("tenantId", "deletedAt");