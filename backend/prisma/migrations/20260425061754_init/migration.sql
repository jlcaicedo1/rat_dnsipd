-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('ADMIN', 'RESPONSABLE_DEPENDENCIA', 'RESPONSABLE_SUBDIRECCION', 'EDITOR_OPERATIVO', 'REVISOR_PROTECCION_DATOS', 'REVISOR_SEGURIDAD', 'AUDITOR');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "RoleCode" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "dependenciaId" INTEGER,
    "subdireccionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Catalogo" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Catalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rat" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estadoGeneral" TEXT NOT NULL DEFAULT 'EN_CONSTRUCCION',
    "fechaProximaRevision" TIMESTAMP(3),
    "dependenciaId" INTEGER NOT NULL,
    "subdireccionId" INTEGER,

    CONSTRAINT "Rat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatVersion" (
    "id" SERIAL NOT NULL,
    "numeroVersion" TEXT NOT NULL,
    "estadoVersion" TEXT NOT NULL,
    "motivoVersion" TEXT,
    "ratId" INTEGER NOT NULL,

    CONSTRAINT "RatVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActividadTratamiento" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "ratId" INTEGER NOT NULL,
    "estadoGeneral" TEXT NOT NULL DEFAULT 'EN_CONSTRUCCION',

    CONSTRAINT "ActividadTratamiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActividadVersion" (
    "id" SERIAL NOT NULL,
    "numeroVersion" TEXT NOT NULL,
    "estadoVersion" TEXT NOT NULL DEFAULT 'BORRADOR',
    "finalidad" TEXT,
    "plazoConservacion" TEXT,
    "actividadId" INTEGER NOT NULL,
    "baseLicitudId" INTEGER,
    "esGranEscala" BOOLEAN NOT NULL DEFAULT false,
    "fechaProximaRevision" TIMESTAMP(3),
    "motivoActualizacion" TEXT,
    "observacionLicitud" TEXT,
    "puntajeMtge" DOUBLE PRECISION,
    "requiereEipd" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ActividadVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivoInformacion" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ActivoInformacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActividadActivo" (
    "id" SERIAL NOT NULL,
    "actividadVersionId" INTEGER NOT NULL,
    "activoId" INTEGER NOT NULL,

    CONSTRAINT "ActividadActivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MtgeEvaluacion" (
    "id" SERIAL NOT NULL,
    "actividadVersionId" INTEGER NOT NULL,
    "puntajeTotal" DOUBLE PRECISION NOT NULL,
    "esGranEscala" BOOLEAN NOT NULL,
    "alcanceGeografico" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duracionTratamiento" INTEGER NOT NULL,
    "observaciones" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "variedadCategorias" INTEGER NOT NULL,
    "versionMetodologia" TEXT NOT NULL DEFAULT 'MTGE-1.0',
    "volumenTitulares" INTEGER NOT NULL,

    CONSTRAINT "MtgeEvaluacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiesgoEvaluacion" (
    "id" SERIAL NOT NULL,
    "actividadVersionId" INTEGER NOT NULL,
    "nivelRiesgo" TEXT NOT NULL,
    "controlesExistentes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'IDENTIFICADO',
    "impacto" INTEGER NOT NULL,
    "impactoResidual" INTEGER,
    "nivelResidual" TEXT,
    "nombre" TEXT NOT NULL,
    "probabilidad" INTEGER NOT NULL,
    "probabilidadResidual" INTEGER,
    "tratamiento" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiesgoEvaluacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevisionObservacion" (
    "id" SERIAL NOT NULL,
    "actividadVersionId" INTEGER NOT NULL,
    "comentario" TEXT NOT NULL,
    "campo" TEXT,
    "autor" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atendida" BOOLEAN NOT NULL DEFAULT false,
    "comentarioSubsanacion" TEXT,
    "fechaSubsanacion" TIMESTAMP(3),
    "subsanadoPor" TEXT,

    CONSTRAINT "RevisionObservacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "modulo" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" TEXT NOT NULL DEFAULT 'system',
    "actorRole" TEXT,
    "descripcion" TEXT,
    "detalleAntes" JSONB,
    "detalleDespues" JSONB,
    "entidadId" TEXT,
    "metadata" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Eipd" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "actividadVersionId" INTEGER NOT NULL,
    "conclusion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'PRE_EVALUACION',
    "fechaEvaluacion" TIMESTAMP(3),
    "medidasMitigacion" TEXT,
    "requiereConsultaPrevia" BOOLEAN NOT NULL DEFAULT false,
    "resumen" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Eipd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgDependencia" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "sigla" TEXT,
    "responsable" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "tipoProcesoId" INTEGER NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "OrgDependencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgSubdireccion" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "sigla" TEXT,
    "responsable" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "dependenciaId" INTEGER NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "OrgSubdireccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgTipoProceso" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "OrgTipoProceso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Catalogo_tipo_codigo_key" ON "Catalogo"("tipo", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Rat_codigo_key" ON "Rat"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "RatVersion_ratId_numeroVersion_key" ON "RatVersion"("ratId", "numeroVersion");

-- CreateIndex
CREATE UNIQUE INDEX "ActividadTratamiento_ratId_codigo_key" ON "ActividadTratamiento"("ratId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ActividadVersion_actividadId_numeroVersion_key" ON "ActividadVersion"("actividadId", "numeroVersion");

-- CreateIndex
CREATE UNIQUE INDEX "ActivoInformacion_codigo_key" ON "ActivoInformacion"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ActividadActivo_actividadVersionId_activoId_key" ON "ActividadActivo"("actividadVersionId", "activoId");

-- CreateIndex
CREATE UNIQUE INDEX "MtgeEvaluacion_actividadVersionId_key" ON "MtgeEvaluacion"("actividadVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "Eipd_codigo_key" ON "Eipd"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Eipd_actividadVersionId_key" ON "Eipd"("actividadVersionId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_dependenciaId_fkey" FOREIGN KEY ("dependenciaId") REFERENCES "OrgDependencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_subdireccionId_fkey" FOREIGN KEY ("subdireccionId") REFERENCES "OrgSubdireccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rat" ADD CONSTRAINT "Rat_dependenciaId_fkey" FOREIGN KEY ("dependenciaId") REFERENCES "OrgDependencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rat" ADD CONSTRAINT "Rat_subdireccionId_fkey" FOREIGN KEY ("subdireccionId") REFERENCES "OrgSubdireccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatVersion" ADD CONSTRAINT "RatVersion_ratId_fkey" FOREIGN KEY ("ratId") REFERENCES "Rat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActividadTratamiento" ADD CONSTRAINT "ActividadTratamiento_ratId_fkey" FOREIGN KEY ("ratId") REFERENCES "Rat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActividadVersion" ADD CONSTRAINT "ActividadVersion_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "ActividadTratamiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActividadVersion" ADD CONSTRAINT "ActividadVersion_baseLicitudId_fkey" FOREIGN KEY ("baseLicitudId") REFERENCES "Catalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActividadActivo" ADD CONSTRAINT "ActividadActivo_actividadVersionId_fkey" FOREIGN KEY ("actividadVersionId") REFERENCES "ActividadVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActividadActivo" ADD CONSTRAINT "ActividadActivo_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "ActivoInformacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MtgeEvaluacion" ADD CONSTRAINT "MtgeEvaluacion_actividadVersionId_fkey" FOREIGN KEY ("actividadVersionId") REFERENCES "ActividadVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiesgoEvaluacion" ADD CONSTRAINT "RiesgoEvaluacion_actividadVersionId_fkey" FOREIGN KEY ("actividadVersionId") REFERENCES "ActividadVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionObservacion" ADD CONSTRAINT "RevisionObservacion_actividadVersionId_fkey" FOREIGN KEY ("actividadVersionId") REFERENCES "ActividadVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Eipd" ADD CONSTRAINT "Eipd_actividadVersionId_fkey" FOREIGN KEY ("actividadVersionId") REFERENCES "ActividadVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgDependencia" ADD CONSTRAINT "OrgDependencia_tipoProcesoId_fkey" FOREIGN KEY ("tipoProcesoId") REFERENCES "OrgTipoProceso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgSubdireccion" ADD CONSTRAINT "OrgSubdireccion_dependenciaId_fkey" FOREIGN KEY ("dependenciaId") REFERENCES "OrgDependencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
