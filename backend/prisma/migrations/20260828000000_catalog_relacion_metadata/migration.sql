-- AlterTable: add metadata column to Catalogo
ALTER TABLE "Catalogo" ADD COLUMN "metadata" JSONB;

-- CreateTable: CatalogoRelacion (many-to-many between catalogs)
CREATE TABLE "CatalogoRelacion" (
    "id" SERIAL NOT NULL,
    "origenId" INTEGER NOT NULL,
    "destinoId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CatalogoRelacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogoRelacion_origenId_destinoId_tipo_key" ON "CatalogoRelacion"("origenId", "destinoId", "tipo");

CREATE INDEX "CatalogoRelacion_origenId_tipo_idx" ON "CatalogoRelacion"("origenId", "tipo");

CREATE INDEX "CatalogoRelacion_destinoId_tipo_idx" ON "CatalogoRelacion"("destinoId", "tipo");

-- AddForeignKey
ALTER TABLE "CatalogoRelacion" ADD CONSTRAINT "CatalogoRelacion_origenId_fkey" FOREIGN KEY ("origenId") REFERENCES "Catalogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CatalogoRelacion" ADD CONSTRAINT "CatalogoRelacion_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES "Catalogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
