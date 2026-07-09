-- CreateTable
CREATE TABLE "EipdFormDoc" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "formFields" JSONB,
    "s2State" JSONB,
    "s3State" JSONB,
    "datosRows" JSONB,
    "activosRows" JSONB,
    "s4Rows" JSONB,
    "s5Rows" JSONB,
    "s6Rows" JSONB,
    "createdById" INTEGER NOT NULL,
    "updatedById" INTEGER,
    "dependenciaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EipdFormDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistDpd" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "formData" JSONB,
    "controles" JSONB,
    "planRows" JSONB,
    "createdById" INTEGER NOT NULL,
    "updatedById" INTEGER,
    "dependenciaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistDpd_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EipdFormDoc_codigo_key" ON "EipdFormDoc"("codigo");

-- CreateIndex
CREATE INDEX "EipdFormDoc_createdById_idx" ON "EipdFormDoc"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistDpd_codigo_key" ON "ChecklistDpd"("codigo");

-- CreateIndex
CREATE INDEX "ChecklistDpd_createdById_idx" ON "ChecklistDpd"("createdById");
