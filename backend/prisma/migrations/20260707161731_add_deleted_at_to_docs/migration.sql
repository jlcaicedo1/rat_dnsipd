-- AlterTable
ALTER TABLE "ChecklistDpd" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "EipdFormDoc" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ChecklistDpd_deletedAt_idx" ON "ChecklistDpd"("deletedAt");

-- CreateIndex
CREATE INDEX "EipdFormDoc_deletedAt_idx" ON "EipdFormDoc"("deletedAt");
