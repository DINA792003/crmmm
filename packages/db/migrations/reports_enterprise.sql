ALTER TABLE "ReportFolder"
  ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
  ADD COLUMN IF NOT EXISTS "modifiedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "Report"
  ADD COLUMN IF NOT EXISTS "filterLogic" TEXT NOT NULL DEFAULT 'AND',
  ADD COLUMN IF NOT EXISTS "crossFilter" JSONB,
  ADD COLUMN IF NOT EXISTS "aggregates" JSONB,
  ADD COLUMN IF NOT EXISTS "groupColumn" TEXT,
  ADD COLUMN IF NOT EXISTS "rowGroups" JSONB,
  ADD COLUMN IF NOT EXISTS "columnGroups" JSONB,
  ADD COLUMN IF NOT EXISTS "sortOrder" TEXT NOT NULL DEFAULT 'desc',
  ADD COLUMN IF NOT EXISTS "format" TEXT NOT NULL DEFAULT 'TABULAR',
  ADD COLUMN IF NOT EXISTS "modifiedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Report_tenantId_deletedAt_idx" ON "Report"("tenantId", "deletedAt");

CREATE TABLE IF NOT EXISTS "ReportShare" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "reportId" TEXT NOT NULL REFERENCES "Report"("id") ON DELETE CASCADE,
  "userId" TEXT,
  "roleId" TEXT,
  "accessLevel" TEXT NOT NULL DEFAULT 'VIEWER',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "ReportShare_reportId_userId_roleId_key" ON "ReportShare"("reportId", "userId", "roleId");
CREATE INDEX IF NOT EXISTS "ReportShare_tenantId_userId_idx" ON "ReportShare"("tenantId", "userId");
CREATE INDEX IF NOT EXISTS "ReportShare_tenantId_roleId_idx" ON "ReportShare"("tenantId", "roleId");

CREATE TABLE IF NOT EXISTS "ReportFolderShare" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "folderId" TEXT NOT NULL REFERENCES "ReportFolder"("id") ON DELETE CASCADE,
  "userId" TEXT,
  "roleId" TEXT,
  "accessLevel" TEXT NOT NULL DEFAULT 'VIEWER',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "ReportFolderShare_folderId_userId_roleId_key" ON "ReportFolderShare"("folderId", "userId", "roleId");
CREATE INDEX IF NOT EXISTS "ReportFolderShare_tenantId_userId_idx" ON "ReportFolderShare"("tenantId", "userId");
CREATE INDEX IF NOT EXISTS "ReportFolderShare_tenantId_roleId_idx" ON "ReportFolderShare"("tenantId", "roleId");

CREATE TABLE IF NOT EXISTS "ReportFavorite" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "reportId" TEXT NOT NULL REFERENCES "Report"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "ReportFavorite_reportId_userId_key" ON "ReportFavorite"("reportId", "userId");
CREATE INDEX IF NOT EXISTS "ReportFavorite_tenantId_userId_idx" ON "ReportFavorite"("tenantId", "userId");

CREATE TABLE IF NOT EXISTS "ReportFolderFavorite" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "folderId" TEXT NOT NULL REFERENCES "ReportFolder"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "ReportFolderFavorite_folderId_userId_key" ON "ReportFolderFavorite"("folderId", "userId");
CREATE INDEX IF NOT EXISTS "ReportFolderFavorite_tenantId_userId_idx" ON "ReportFolderFavorite"("tenantId", "userId");