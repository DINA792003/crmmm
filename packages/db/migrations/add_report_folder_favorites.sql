CREATE TABLE IF NOT EXISTS "ReportFolderFavorite" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "folderId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReportFolderFavorite_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReportFolderFavorite_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "ReportFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ReportFolderFavorite_folderId_userId_key" ON "ReportFolderFavorite"("folderId", "userId");
CREATE INDEX IF NOT EXISTS "ReportFolderFavorite_tenantId_userId_idx" ON "ReportFolderFavorite"("tenantId", "userId");