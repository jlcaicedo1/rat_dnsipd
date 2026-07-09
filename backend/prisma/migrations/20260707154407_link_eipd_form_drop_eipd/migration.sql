-- Drop old Eipd table (was a disconnected duplicate of EipdFormDoc)
DROP TABLE IF EXISTS "Eipd";

-- Link EipdFormDoc directly to ActividadVersion
ALTER TABLE "EipdFormDoc"
  ADD COLUMN "actividadVersionId" INTEGER;

ALTER TABLE "EipdFormDoc"
  ADD CONSTRAINT "EipdFormDoc_actividadVersionId_fkey"
  FOREIGN KEY ("actividadVersionId")
  REFERENCES "ActividadVersion"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE UNIQUE INDEX "EipdFormDoc_actividadVersionId_key"
  ON "EipdFormDoc"("actividadVersionId");
