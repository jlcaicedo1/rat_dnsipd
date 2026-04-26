import { PrismaClient, RoleCode } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const tipoProceso = await prisma.orgTipoProceso.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nombre: "Procesos sustantivos",
      descripcion: "Procesos misionales",
    },
  });

  const dependencia = await prisma.orgDependencia.upsert({
    where: { id: 1 },
    update: {},
    create: {
      tipoProcesoId: tipoProceso.id,
      nombre: "Direccion Nacional de Afiliacion y Cobertura",
      sigla: "DNAC",
      responsable: "Director Nacional",
    },
  });

  const subdireccion = await prisma.orgSubdireccion.upsert({
    where: { id: 1 },
    update: {},
    create: {
      dependenciaId: dependencia.id,
      nombre: "Subdireccion Nacional de Afiliacion y Cobertura",
      sigla: "SNAC",
      responsable: "Subdirector Nacional",
    },
  });

  await prisma.catalogo.upsert({
    where: { tipo_codigo: { tipo: "BASE_LICITUD", codigo: "OBLIGACION_LEGAL" } },
    update: { nombre: "Obligacion legal", activo: true },
    create: {
      tipo: "BASE_LICITUD",
      codigo: "OBLIGACION_LEGAL",
      nombre: "Obligacion legal",
    },
  });

  await prisma.catalogo.upsert({
    where: { tipo_codigo: { tipo: "TIPO_ACTIVO", codigo: "APLICACION" } },
    update: { nombre: "Aplicacion", activo: true },
    create: {
      tipo: "TIPO_ACTIVO",
      codigo: "APLICACION",
      nombre: "Aplicacion",
    },
  });

  await prisma.catalogo.upsert({
    where: { tipo_codigo: { tipo: "CLASIFICACION_INFORMACION", codigo: "ALTA" } },
    update: { nombre: "Alta", activo: true },
    create: {
      tipo: "CLASIFICACION_INFORMACION",
      codigo: "ALTA",
      nombre: "Alta",
    },
  });

  const passwordHash = await bcrypt.hash("Admin1234*", 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      nombre: "Administrador",
      email: "admin@sistema.local",
      passwordHash,
      role: RoleCode.ADMIN,
      dependenciaId: dependencia.id,
      subdireccionId: subdireccion.id,
      activo: true,
    },
    create: {
      nombre: "Administrador",
      email: "admin@sistema.local",
      username: "admin",
      passwordHash,
      role: RoleCode.ADMIN,
      dependenciaId: dependencia.id,
      subdireccionId: subdireccion.id,
      activo: true,
    },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
