-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RoleCode" ADD VALUE 'ADMIN_TECNICO';
ALTER TYPE "RoleCode" ADD VALUE 'ADMIN_FUNCIONAL';
ALTER TYPE "RoleCode" ADD VALUE 'OPERADOR';
ALTER TYPE "RoleCode" ADD VALUE 'REVISOR';
ALTER TYPE "RoleCode" ADD VALUE 'APROBADOR_FUNCIONAL';

-- AlterTable
ALTER TABLE "ActivoInformacion" ADD COLUMN     "activoPadreId" INTEGER,
ADD COLUMN     "ambienteId" INTEGER,
ADD COLUMN     "areaCustodio" TEXT,
ADD COLUMN     "bajaProgramadaId" INTEGER,
ADD COLUMN     "clasificacionInfoId" INTEGER,
ADD COLUMN     "codigoActivoPadreExterno" TEXT,
ADD COLUMN     "confidencialidad" INTEGER,
ADD COLUMN     "controlesExistentes" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "custodio" TEXT,
ADD COLUMN     "datosPersonalesId" INTEGER,
ADD COLUMN     "dependenciaId" INTEGER,
ADD COLUMN     "dependenciaNombreFuente" TEXT,
ADD COLUMN     "direccionIpUrl" TEXT,
ADD COLUMN     "disponibilidad" INTEGER,
ADD COLUMN     "fechaLevantamiento" TIMESTAMP(3),
ADD COLUMN     "fuenteActivoId" INTEGER,
ADD COLUMN     "historico" TEXT,
ADD COLUMN     "impactoId" INTEGER,
ADD COLUMN     "integridad" INTEGER,
ADD COLUMN     "macroproceso" TEXT,
ADD COLUMN     "nivelId" INTEGER,
ADD COLUMN     "observaciones" TEXT,
ADD COLUMN     "proceso" TEXT,
ADD COLUMN     "propiedadIntelectualId" INTEGER,
ADD COLUMN     "propietarioActivo" TEXT,
ADD COLUMN     "siglaDependenciaFuente" TEXT,
ADD COLUMN     "subproceso" TEXT,
ADD COLUMN     "tipoActivoId" INTEGER,
ADD COLUMN     "ubicacion" TEXT,
ADD COLUMN     "unidadPropietariaActivo" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "usoOtrasAreasProcesos" TEXT,
ADD COLUMN     "valorActivo" DOUBLE PRECISION,
ADD COLUMN     "version" TEXT,
ADD COLUMN     "visibleInternetId" INTEGER;

-- AlterTable
ALTER TABLE "Catalogo" ADD COLUMN     "dominio" TEXT NOT NULL DEFAULT 'GENERAL';

-- CreateTable
CREATE TABLE "ParametroSistema" (
    "id" SERIAL NOT NULL,
    "modulo" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "valor" JSONB NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParametroSistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivoFuenteUsuario" (
    "id" SERIAL NOT NULL,
    "activoId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivoFuenteUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParametroSistema_modulo_clave_key" ON "ParametroSistema"("modulo", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "ActivoFuenteUsuario_activoId_nombre_key" ON "ActivoFuenteUsuario"("activoId", "nombre");

-- CreateIndex
CREATE INDEX "ActivoInformacion_dependenciaId_idx" ON "ActivoInformacion"("dependenciaId");

-- CreateIndex
CREATE INDEX "ActivoInformacion_activoPadreId_idx" ON "ActivoInformacion"("activoPadreId");

-- CreateIndex
CREATE INDEX "ActivoInformacion_tipoActivoId_idx" ON "ActivoInformacion"("tipoActivoId");

-- CreateIndex
CREATE INDEX "ActivoInformacion_impactoId_idx" ON "ActivoInformacion"("impactoId");

-- AddForeignKey
ALTER TABLE "ActivoInformacion" ADD CONSTRAINT "ActivoInformacion_dependenciaId_fkey" FOREIGN KEY ("dependenciaId") REFERENCES "OrgDependencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivoInformacion" ADD CONSTRAINT "ActivoInformacion_activoPadreId_fkey" FOREIGN KEY ("activoPadreId") REFERENCES "ActivoInformacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivoInformacion" ADD CONSTRAINT "ActivoInformacion_tipoActivoId_fkey" FOREIGN KEY ("tipoActivoId") REFERENCES "Catalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivoInformacion" ADD CONSTRAINT "ActivoInformacion_nivelId_fkey" FOREIGN KEY ("nivelId") REFERENCES "Catalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivoInformacion" ADD CONSTRAINT "ActivoInformacion_ambienteId_fkey" FOREIGN KEY ("ambienteId") REFERENCES "Catalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivoInformacion" ADD CONSTRAINT "ActivoInformacion_clasificacionInfoId_fkey" FOREIGN KEY ("clasificacionInfoId") REFERENCES "Catalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivoInformacion" ADD CONSTRAINT "ActivoInformacion_datosPersonalesId_fkey" FOREIGN KEY ("datosPersonalesId") REFERENCES "Catalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivoInformacion" ADD CONSTRAINT "ActivoInformacion_visibleInternetId_fkey" FOREIGN KEY ("visibleInternetId") REFERENCES "Catalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivoInformacion" ADD CONSTRAINT "ActivoInformacion_fuenteActivoId_fkey" FOREIGN KEY ("fuenteActivoId") REFERENCES "Catalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivoInformacion" ADD CONSTRAINT "ActivoInformacion_bajaProgramadaId_fkey" FOREIGN KEY ("bajaProgramadaId") REFERENCES "Catalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivoInformacion" ADD CONSTRAINT "ActivoInformacion_propiedadIntelectualId_fkey" FOREIGN KEY ("propiedadIntelectualId") REFERENCES "Catalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivoInformacion" ADD CONSTRAINT "ActivoInformacion_impactoId_fkey" FOREIGN KEY ("impactoId") REFERENCES "Catalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivoFuenteUsuario" ADD CONSTRAINT "ActivoFuenteUsuario_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "ActivoInformacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
