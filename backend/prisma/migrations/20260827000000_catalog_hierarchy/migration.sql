-- Catalog hierarchy: add parentId, orden; drop unique constraint in favor of index

-- AlterTable
ALTER TABLE "Catalogo"
  ADD COLUMN "parentId" INTEGER,
  ADD COLUMN "orden"    INTEGER NOT NULL DEFAULT 0;

-- Drop old unique constraint (replaced by index + application-level check)
DROP INDEX IF EXISTS "Catalogo_tipo_codigo_key";

-- AddForeignKey for self-referential hierarchy
ALTER TABLE "Catalogo"
  ADD CONSTRAINT "Catalogo_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Catalogo"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex for performance (replaces unique constraint)
CREATE INDEX "Catalogo_tipo_codigo_idx" ON "Catalogo"("tipo", "codigo");
CREATE INDEX "Catalogo_dominio_idx"     ON "Catalogo"("dominio");
CREATE INDEX "Catalogo_parentId_idx"    ON "Catalogo"("parentId");
