CREATE TABLE IF NOT EXISTS "ReportFavorite" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReportFavorite_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReportFavorite_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ReportFavorite_reportId_userId_key" ON "ReportFavorite"("reportId", "userId");
CREATE INDEX IF NOT EXISTS "ReportFavorite_tenantId_userId_idx" ON "ReportFavorite"("tenantId", "userId");