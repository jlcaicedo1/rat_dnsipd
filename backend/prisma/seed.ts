import { PrismaClient, RoleCode } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

type OrgSeedNode = {
  codigo: string;
  nombre: string;
  tipo: string;
  orden: number;
  esContenedorRat: boolean;
  children?: OrgSeedNode[];
};

type DependenciaSeed = {
  nombre: string;
  sigla: string | null;
  descripcion: string | null;
  subdirecciones: SubdireccionSeed[];
};

type SubdireccionSeed = {
  nombre: string;
  sigla: string | null;
  descripcion: string | null;
};

const DEPENDENCIA_SIGLAS: Record<string, string> = {
  "Direccion Actuarial, de Investigacion y Estadistica": "DAIE",
  "Direccion Nacional de Afiliacion y Cobertura": "DNAC",
  "Direccion Nacional de Comunicacion Social": "DNCS",
  "Direccion Nacional de Cooperacion y Relaciones Internacionales": "DNCRI",
  "Direccion Nacional de Fondos de Terceros y Seguro de Desempleo": "DNFTSD",
  "Direccion Nacional de Gestion Financiera": "DNGF",
  "Direccion Nacional de Planificacion": "DNPL",
  "Direccion Nacional de Procesos": "DNPR",
  "Direccion Nacional de Recaudacion y Gestion de Cartera": "DNRGC",
  "Direccion Nacional de Servicios Corporativos": "DNSC",
  "Direccion Nacional de Servicios de Atencion al Ciudadano": "DNSAC",
  "Direccion Nacional de Tecnologias de la Informacion": "DNTI",
  "Direccion del Seguro General de Riesgos del Trabajo": "DSGRT",
  "Direccion del Seguro General de Salud Individual y Familiar": "DSGSIF",
  "Direccion del Seguro Social Campesino": "DSSC",
  "Direccion del Sistema de Pensiones": "DSP",
  "Procuraduria General": "PG",
};

const TIPO_PROCESO_ALIASES: Record<string, string[]> = {
  "Procesos sustantivos dependientes de la Direccion General": ["Procesos sustantivos"],
};

async function main() {
  const estructura = loadStructure();
  const dependenciasBySigla = new Map<string, number>();

  for (const bloque of estructura.children ?? []) {
    const tipoProceso = await upsertTipoProceso(bloque.nombre);
    const dependencias = mapDependenciasFromBlock(bloque);

    for (const dependenciaSeed of dependencias) {
      const dependencia = await upsertDependencia(tipoProceso.id, dependenciaSeed);

      if (dependencia.sigla) {
        dependenciasBySigla.set(dependencia.sigla, dependencia.id);
      }

      for (const subdireccionSeed of dependenciaSeed.subdirecciones) {
        await upsertSubdireccion(dependencia.id, subdireccionSeed);
      }
    }
  }

  await seedCatalogos();
  await seedAdminUser(dependenciasBySigla);
}

function loadStructure() {
  const filePath = join(__dirname, "iess-estructura-organica.base.json");
  const raw = readFileSync(filePath, "utf-8");

  return JSON.parse(raw) as OrgSeedNode;
}

function mapDependenciasFromBlock(block: OrgSeedNode) {
  return (block.children ?? []).map<DependenciaSeed>((node) => ({
    nombre: node.nombre,
    sigla: DEPENDENCIA_SIGLAS[node.nombre] ?? null,
    descripcion: block.nombre,
    subdirecciones: (node.children ?? []).map((child) => ({
      nombre: child.nombre,
      sigla: null,
      descripcion: `Unidad ejecutora de ${node.nombre}`,
    })),
  }));
}

async function upsertTipoProceso(nombre: string) {
  const aliases = TIPO_PROCESO_ALIASES[nombre] ?? [];
  const candidates = await prisma.orgTipoProceso.findMany({
    where: {
      OR: [{ nombre }, ...aliases.map((alias) => ({ nombre: alias }))],
    },
    orderBy: { id: "asc" },
  });
  const canonical = candidates[0];

  if (canonical) {
    for (const duplicate of candidates.slice(1)) {
      await prisma.orgDependencia.updateMany({
        where: { tipoProcesoId: duplicate.id },
        data: { tipoProcesoId: canonical.id },
      });

      await prisma.orgTipoProceso.delete({
        where: { id: duplicate.id },
      });
    }

    return prisma.orgTipoProceso.update({
      where: { id: canonical.id },
      data: {
        nombre,
        descripcion: `Bloque organico IESS: ${nombre}`,
        activo: true,
      },
    });
  }

  return prisma.orgTipoProceso.create({
    data: {
      nombre,
      descripcion: `Bloque organico IESS: ${nombre}`,
      activo: true,
    },
  });
}

async function upsertDependencia(tipoProcesoId: number, seed: DependenciaSeed) {
  const candidates = await prisma.orgDependencia.findMany({
    where: { nombre: seed.nombre },
    orderBy: { id: "asc" },
  });
  const canonical = candidates[0];

  if (canonical) {
    await mergeDependenciaDuplicates(canonical.id, candidates.slice(1));

    return prisma.orgDependencia.update({
      where: { id: canonical.id },
      data: {
        tipoProcesoId,
        sigla: seed.sigla ?? canonical.sigla,
        descripcion: seed.descripcion,
        activo: true,
      },
    });
  }

  return prisma.orgDependencia.create({
    data: {
      tipoProcesoId,
      nombre: seed.nombre,
      sigla: seed.sigla,
      descripcion: seed.descripcion,
      activo: true,
    },
  });
}

async function upsertSubdireccion(dependenciaId: number, seed: SubdireccionSeed) {
  const candidates = await prisma.orgSubdireccion.findMany({
    where: {
      dependenciaId,
      nombre: seed.nombre,
    },
    orderBy: { id: "asc" },
  });
  const canonical = candidates[0];

  if (canonical) {
    await mergeSubdireccionDuplicates(canonical.id, candidates.slice(1));

    return prisma.orgSubdireccion.update({
      where: { id: canonical.id },
      data: {
        sigla: seed.sigla ?? canonical.sigla,
        descripcion: seed.descripcion,
        activo: true,
      },
    });
  }

  return prisma.orgSubdireccion.create({
    data: {
      dependenciaId,
      nombre: seed.nombre,
      sigla: seed.sigla,
      descripcion: seed.descripcion,
      activo: true,
    },
  });
}

async function mergeDependenciaDuplicates(canonicalId: number, duplicates: Array<{ id: number }>) {
  for (const duplicate of duplicates) {
    await prisma.orgSubdireccion.updateMany({
      where: { dependenciaId: duplicate.id },
      data: { dependenciaId: canonicalId },
    });

    await prisma.rat.updateMany({
      where: { dependenciaId: duplicate.id },
      data: { dependenciaId: canonicalId },
    });

    await prisma.user.updateMany({
      where: { dependenciaId: duplicate.id },
      data: { dependenciaId: canonicalId },
    });

    await prisma.orgDependencia.delete({
      where: { id: duplicate.id },
    });
  }
}

async function mergeSubdireccionDuplicates(canonicalId: number, duplicates: Array<{ id: number }>) {
  for (const duplicate of duplicates) {
    await prisma.rat.updateMany({
      where: { subdireccionId: duplicate.id },
      data: { subdireccionId: canonicalId },
    });

    await prisma.user.updateMany({
      where: { subdireccionId: duplicate.id },
      data: { subdireccionId: canonicalId },
    });

    await prisma.orgSubdireccion.delete({
      where: { id: duplicate.id },
    });
  }
}

async function seedCatalogos() {
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
}

async function seedAdminUser(dependenciasBySigla: Map<string, number>) {
  const dependenciaId = dependenciasBySigla.get("DNAC") ?? null;
  const subdireccion = dependenciaId
    ? await prisma.orgSubdireccion.findFirst({
        where: { dependenciaId },
        orderBy: { nombre: "asc" },
      })
    : null;
  const passwordHash = await bcrypt.hash("Admin1234*", 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      nombre: "Administrador",
      email: "admin@sistema.local",
      passwordHash,
      role: RoleCode.ADMIN,
      dependenciaId,
      subdireccionId: subdireccion?.id ?? null,
      activo: true,
    },
    create: {
      nombre: "Administrador",
      email: "admin@sistema.local",
      username: "admin",
      passwordHash,
      role: RoleCode.ADMIN,
      dependenciaId,
      subdireccionId: subdireccion?.id ?? null,
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
