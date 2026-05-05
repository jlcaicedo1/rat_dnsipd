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

type CatalogSeedItem = {
  dominio: string;
  tipo: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
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

const CATALOG_TYPE_LABELS: Record<string, string> = {
  BASE_LICITUD: "base de licitud",
  TIPO_TITULAR: "tipo de titular",
  CATEGORIA_DATO: "categoria de dato",
  ORIGEN_DATO: "origen de dato",
  ACCION_TRATAMIENTO: "accion de tratamiento",
  VOLUMEN_TRATAMIENTO: "volumen del tratamiento",
  FRECUENCIA_TRATAMIENTO: "frecuencia del tratamiento",
  PATRON_CONSERVACION: "patron de conservacion",
  ALCANCE_GEOGRAFICO: "alcance geografico",
  RESPUESTA_BINARIA: "respuesta binaria",
  CATEGORIA_TERCERO: "categoria de tercero",
  PAIS: "pais",
  TIPO_ACTIVO: "tipo de activo",
  CLASIFICACION_INFORMACION: "clasificacion de informacion",
  NIVEL_ACTIVO: "nivel del activo",
  AMBIENTE_ACTIVO: "ambiente del activo",
  CLASIFICACION_INFO_ACTIVO: "clasificacion de informacion del activo",
  VISIBILIDAD_INTERNET: "visibilidad desde internet",
  FUENTE_ACTIVO: "fuente del activo",
  IMPACTO_ACTIVO: "impacto del activo",
};

const CATALOG_DOMAIN_BY_TYPE: Record<string, string> = {
  BASE_LICITUD: "TRATAMIENTOS",
  TIPO_TITULAR: "TRATAMIENTOS",
  CATEGORIA_DATO: "TRATAMIENTOS",
  ORIGEN_DATO: "TRATAMIENTOS",
  ACCION_TRATAMIENTO: "TRATAMIENTOS",
  VOLUMEN_TRATAMIENTO: "TRATAMIENTOS",
  FRECUENCIA_TRATAMIENTO: "TRATAMIENTOS",
  PATRON_CONSERVACION: "TRATAMIENTOS",
  ALCANCE_GEOGRAFICO: "TRATAMIENTOS",
  RESPUESTA_BINARIA: "GENERAL",
  CATEGORIA_TERCERO: "TRATAMIENTOS",
  PAIS: "GENERAL",
  TIPO_ACTIVO: "ACTIVOS",
  CLASIFICACION_INFORMACION: "TRATAMIENTOS",
  NIVEL_ACTIVO: "ACTIVOS",
  AMBIENTE_ACTIVO: "ACTIVOS",
  CLASIFICACION_INFO_ACTIVO: "ACTIVOS",
  VISIBILIDAD_INTERNET: "ACTIVOS",
  FUENTE_ACTIVO: "ACTIVOS",
  IMPACTO_ACTIVO: "ACTIVOS",
};

const CATALOG_CODE_OVERRIDES: Record<string, string> = {
  "BASE_LICITUD:Cumplimiento de obligaciones legales": "OBLIGACION_LEGAL",
  "BASE_LICITUD:Mision o interes publico": "MISION_PUBLICA",
  "TIPO_ACTIVO:Aplicacion (Web)": "APLICACION_WEB",
  "TIPO_ACTIVO:Aplicacion": "APLICACION",
  "TIPO_ACTIVO:Software (Cliente / Servidor)": "SOFTWARE_CLIENTE_SERVIDOR",
  "TIPO_ACTIVO:Componente (Webservices)": "COMPONENTE_WEBSERVICES",
  "TIPO_ACTIVO:Base de datos": "BASE_DATOS",
  "TIPO_ACTIVO:Equipo servidor (fisico / virtual)": "EQUIPO_SERVIDOR",
  "TIPO_ACTIVO:Equipo hardware": "EQUIPO_HARDWARE",
  "TIPO_ACTIVO:Repositorio digital": "REPOSITORIO_DIGITAL",
  "TIPO_ACTIVO:Repositorio (Documentacion fisica / digital)": "REPOSITORIO_DOCUMENTAL",
  "TIPO_ACTIVO:Repositorio fisico": "REPOSITORIO_FISICO",
  "TIPO_ACTIVO:Servicio / Proveedor": "SERVICIO_PROVEEDOR",
  "CLASIFICACION_INFORMACION:Alta": "ALTA",
  "CLASIFICACION_INFORMACION:Media": "MEDIA",
  "CLASIFICACION_INFORMACION:Baja": "BAJA",
  "CLASIFICACION_INFO_ACTIVO:Reservado": "RESERVADO",
  "CLASIFICACION_INFO_ACTIVO:Interno": "INTERNO",
  "CLASIFICACION_INFO_ACTIVO:Confidencial": "CONFIDENCIAL",
  "CLASIFICACION_INFO_ACTIVO:Publico": "PUBLICO",
  "CLASIFICACION_INFO_ACTIVO:Sensible": "SENSIBLE",
  "CLASIFICACION_INFO_ACTIVO:No aplica": "NO_APLICA",
  "NIVEL_ACTIVO:Nivel A": "NIVEL_A",
  "NIVEL_ACTIVO:Nivel B": "NIVEL_B",
  "NIVEL_ACTIVO:Nivel C": "NIVEL_C",
  "NIVEL_ACTIVO:Nivel B1": "NIVEL_B1",
  "NIVEL_ACTIVO:Nivel B2": "NIVEL_B2",
  "NIVEL_ACTIVO:Nivel B 2.1": "NIVEL_B_2_1",
  "NIVEL_ACTIVO:Nivel B 2.2": "NIVEL_B_2_2",
  "NIVEL_ACTIVO:Nivel B 2.3": "NIVEL_B_2_3",
  "AMBIENTE_ACTIVO:Produccion": "PRODUCCION",
  "AMBIENTE_ACTIVO:No aplica": "NO_APLICA",
  "VISIBILIDAD_INTERNET:Si": "SI",
  "VISIBILIDAD_INTERNET:No": "NO",
  "VISIBILIDAD_INTERNET:No (VPN)": "NO_VPN",
  "VISIBILIDAD_INTERNET:Mixto": "MIXTO",
  "VISIBILIDAD_INTERNET:No aplica": "NO_APLICA",
  "FUENTE_ACTIVO:Usuario final": "USUARIO_FINAL",
  "FUENTE_ACTIVO:Usuario fuente": "USUARIO_FUENTE",
  "IMPACTO_ACTIVO:Menor": "MENOR",
  "IMPACTO_ACTIVO:Moderado": "MODERADO",
  "IMPACTO_ACTIVO:Mayor": "MAYOR",
  "IMPACTO_ACTIVO:Catastrofico": "CATASTROFICO",
};

const CATALOG_DESCRIPTION_OVERRIDES: Record<string, string> = {
  "BASE_LICITUD:Cumplimiento de obligaciones legales":
    "Tratamientos sustentados por deberes legales o reglamentarios institucionales.",
  "BASE_LICITUD:Mision o interes publico":
    "Base utilizada cuando la actividad responde a competencias institucionales de interes general.",
  "TIPO_ACTIVO:Aplicacion (Web)":
    "Solucion de software que soporta una actividad de tratamiento o un control operativo.",
  "TIPO_ACTIVO:Aplicacion":
    "Aplicacion institucional o funcional que soporta operaciones de negocio y tratamiento de informacion.",
  "TIPO_ACTIVO:Software (Cliente / Servidor)":
    "Software de escritorio o de servidor que procesa, expone o administra informacion institucional.",
  "TIPO_ACTIVO:Componente (Webservices)":
    "Componente de integracion o servicio web utilizado por aplicaciones y procesos institucionales.",
  "TIPO_ACTIVO:Base de datos":
    "Repositorio estructurado que aloja registros personales, transaccionales o historicos.",
  "TIPO_ACTIVO:Equipo servidor (fisico / virtual)":
    "Infraestructura de procesamiento o almacenamiento que aloja aplicaciones, servicios o repositorios.",
  "TIPO_ACTIVO:Equipo hardware":
    "Equipo fisico o tecnologico que soporta procesos institucionales o custodia informacion.",
  "TIPO_ACTIVO:Repositorio digital":
    "Repositorio logico o carpeta compartida que consolida documentos, evidencias o archivos digitales.",
  "TIPO_ACTIVO:Repositorio (Documentacion fisica / digital)":
    "Repositorio documental fisico o digital utilizado para custodiar expedientes y soportes operativos.",
  "TIPO_ACTIVO:Repositorio fisico":
    "Repositorio material o archivo fisico para custodia documental institucional.",
  "TIPO_ACTIVO:Servicio / Proveedor":
    "Servicio externo o provedor tecnologico que participa en la operacion del activo.",
  "CLASIFICACION_INFORMACION:Alta":
    "Informacion sensible o critica que exige controles reforzados y seguimiento priorizado.",
  "CLASIFICACION_INFORMACION:Media":
    "Informacion operativa que requiere salvaguardas estandar y monitoreo regular.",
  "CLASIFICACION_INFORMACION:Baja":
    "Informacion con afectacion acotada, sujeta a controles basicos y uso institucional controlado.",
  "NIVEL_ACTIVO:Nivel A":
    "Nivel de exposicion acotada o bajo impacto tecnologico sobre la operacion del activo.",
  "NIVEL_ACTIVO:Nivel B":
    "Nivel de soporte intermedio con dependencia operativa recurrente.",
  "NIVEL_ACTIVO:Nivel C":
    "Nivel de soporte elevado o sensible para la continuidad del activo.",
  "AMBIENTE_ACTIVO:Produccion":
    "Ambiente operativo vigente donde el activo soporta procesamiento o disponibilidad institucional.",
  "CLASIFICACION_INFO_ACTIVO:Reservado":
    "Informacion de acceso restringido que requiere controles reforzados por su sensibilidad institucional.",
  "CLASIFICACION_INFO_ACTIVO:Interno":
    "Informacion para uso institucional, no destinada a difusion publica.",
  "CLASIFICACION_INFO_ACTIVO:Confidencial":
    "Informacion de alta reserva cuyo acceso debe limitarse estrictamente por necesidad operativa.",
  "CLASIFICACION_INFO_ACTIVO:Publico":
    "Informacion de libre conocimiento o difusion institucional controlada.",
  "CLASIFICACION_INFO_ACTIVO:Sensible":
    "Informacion con impacto elevado sobre privacidad, seguridad o continuidad institucional.",
  "VISIBILIDAD_INTERNET:Si":
    "El activo es visible o accesible desde internet.",
  "VISIBILIDAD_INTERNET:No":
    "El activo permanece restringido a redes internas o perimetros institucionales.",
  "VISIBILIDAD_INTERNET:No (VPN)":
    "El activo no es publico y requiere canales controlados como VPN para su acceso.",
  "VISIBILIDAD_INTERNET:Mixto":
    "El activo combina componentes visibles y no visibles desde internet.",
  "FUENTE_ACTIVO:Usuario final":
    "Activo identificado o reportado por el usuario final del proceso institucional.",
  "IMPACTO_ACTIVO:Menor":
    "Afectacion acotada sobre confidencialidad, integridad o disponibilidad.",
  "IMPACTO_ACTIVO:Moderado":
    "Afectacion relevante que demanda seguimiento operativo y controles compensatorios.",
  "IMPACTO_ACTIVO:Mayor":
    "Afectacion alta sobre la operacion, la privacidad o la disponibilidad institucional.",
  "IMPACTO_ACTIVO:Catastrofico":
    "Afectacion critica con alto potencial de interrupcion o dano severo.",
};

const MASTER_CATALOGS: CatalogSeedItem[] = [
  ...buildCatalogSeed("BASE_LICITUD", [
    "Consentimiento expreso del titular",
    "Ejecucion de relaciones precontractuales y contractuales",
    "Interes vital del titular",
    "Cumplimiento de obligaciones legales",
    "Mision o interes publico",
  ]),
  ...buildCatalogSeed("TIPO_TITULAR", [
    "Colaboradores (Servidores, Funcionarios)",
    "Colaboradores (Trabajadores)",
    "Exservidores",
    "Pasantes",
    "Practicantes estudiantiles",
    "Internos rotativos",
    "Postulantes a procesos de seleccion",
    "Afiliados",
    "Pensionistas",
    "Beneficiarios",
    "Jubilados",
    "Derechohabientes",
    "Empleador persona natural",
    "Apoderados o mandatarios",
    "Personal de contratistas o consultores",
    "Tutores o representantes legales",
  ]),
  ...buildCatalogSeed("CATEGORIA_DATO", [
    "Datos de identificacion",
    "Datos de contacto",
    "Datos laborales",
    "Datos academicos",
    "Datos financieros, bancarios o crediticios",
    "Datos de parentesco o vinculo",
    "Datos legales y de cumplimiento normativo",
    "Datos socioeconomicos",
    "Datos de filiacion",
    "Datos de salud",
    "Datos biometricos",
    "Datos de diversidad y autoidentificacion",
    "Datos de condicion migratoria",
    "Datos relacionados con afiliacion sindical o gremial",
    "Datos de personas con discapacidad y sus sustitutos",
    "Datos de menores de edad",
  ]),
  ...buildCatalogSeed("ORIGEN_DATO", [
    "Entrega directa por parte del titular",
    "Generacion y registro automatico a partir de sistemas institucionales",
    "Interoperabilidad e intercambio interinstitucional",
    "Fuentes publicas",
    "Obligaciones legales, regulatorias o judiciales",
  ]),
  ...buildCatalogSeed("ACCION_TRATAMIENTO", [
    "Creacion / Recoleccion",
    "Uso / Procesamiento",
    "Almacenamiento / Conservacion",
    "Encargo / Transferencia o comunicacion",
    "Archivado",
    "Eliminacion / Supresion",
  ]),
  ...buildCatalogSeed("VOLUMEN_TRATAMIENTO", [
    "0 a 1000",
    "1001 a 10000",
    "10001 a 100000",
    "100001 en adelante",
  ]),
  ...buildCatalogSeed("FRECUENCIA_TRATAMIENTO", [
    "Puntual",
    "Periodica o recurrente",
    "Continua o en tiempo real",
  ]),
  ...buildCatalogSeed("PATRON_CONSERVACION", [
    "Ocasional",
    "Temporal",
    "Prolongada",
  ]),
  ...buildCatalogSeed("ALCANCE_GEOGRAFICO", [
    "Local",
    "Nacional",
    "Global o transfronterizo",
  ]),
  ...buildCatalogSeed("RESPUESTA_BINARIA", ["SI", "NO"]),
  ...buildCatalogSeed("CATEGORIA_TERCERO", [
    "Encargado - Instituciones publicas",
    "Encargado - Instituciones privadas",
    "Encargado internacional",
    "Destinatario - Instituciones publicas",
    "Destinatario - Instituciones privadas",
    "Destinatario - Autoridades administrativas y judiciales",
    "Destinatario internacional",
  ]),
  ...buildCatalogSeed("PAIS", [
    "Ecuador",
    "Colombia",
    "Estados Unidos",
    "Espana",
    "Canada",
    "Alemania",
    "Brasil",
    "Chile",
  ]),
  ...buildCatalogSeed("TIPO_ACTIVO", [
    "Aplicacion (Web)",
    "Aplicacion",
    "Software (Cliente / Servidor)",
    "Componente (Webservices)",
    "Base de datos",
    "Equipo servidor (fisico / virtual)",
    "Equipo hardware",
    "Repositorio digital",
    "Repositorio (Documentacion fisica / digital)",
    "Repositorio fisico",
    "Servicio / Proveedor",
  ]),
  ...buildCatalogSeed("CLASIFICACION_INFORMACION", ["Alta", "Media", "Baja"]),
  ...buildCatalogSeed("NIVEL_ACTIVO", [
    "Nivel A",
    "Nivel B",
    "Nivel C",
    "Nivel B1",
    "Nivel B2",
    "Nivel B 2.1",
    "Nivel B 2.2",
    "Nivel B 2.3",
  ]),
  ...buildCatalogSeed("AMBIENTE_ACTIVO", ["Produccion", "No aplica"]),
  ...buildCatalogSeed("CLASIFICACION_INFO_ACTIVO", [
    "Reservado",
    "Interno",
    "Confidencial",
    "Publico",
    "Sensible",
    "No aplica",
  ]),
  ...buildCatalogSeed("VISIBILIDAD_INTERNET", [
    "Si",
    "No",
    "No (VPN)",
    "Mixto",
    "No aplica",
  ]),
  ...buildCatalogSeed("FUENTE_ACTIVO", ["Usuario final", "Usuario fuente"]),
  ...buildCatalogSeed("IMPACTO_ACTIVO", [
    "Menor",
    "Moderado",
    "Mayor",
    "Catastrofico",
  ]),
];

const PARAMETER_SEEDS = [
  {
    modulo: "ACTIVOS",
    clave: "VALOR_ACTIVO_CONFIG",
    nombre: "Formula de valoracion C-I-D",
    descripcion:
      "Define ponderaciones y divisor para calcular el valor del activo a partir de confidencialidad, integridad y disponibilidad.",
    valor: {
      tipo: "PROMEDIO_PONDERADO",
      precision: 2,
      divisor: 3,
      ponderaciones: {
        confidencialidad: 1,
        integridad: 1,
        disponibilidad: 1,
      },
    },
  },
  {
    modulo: "ACTIVOS",
    clave: "IMPACTO_RANGOS",
    nombre: "Rangos de impacto para activos",
    descripcion:
      "Clasifica el valor calculado del activo en categorias de impacto consumidas por el backend y la importacion.",
    valor: [
      { codigo: "MENOR", nombre: "Menor", limiteSuperior: 1 },
      { codigo: "MODERADO", nombre: "Moderado", limiteSuperior: 2 },
      { codigo: "MAYOR", nombre: "Mayor", limiteSuperior: 3 },
      { codigo: "CATASTROFICO", nombre: "Catastrófico", limiteSuperior: 4 },
    ],
  },
];

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
  await seedParametrosSistema();
  await seedUsers(dependenciasBySigla);
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
  for (const item of MASTER_CATALOGS) {
    await prisma.catalogo.upsert({
      where: {
        tipo_codigo: {
          tipo: item.tipo,
          codigo: item.codigo,
        },
      },
      update: {
        dominio: item.dominio,
        nombre: item.nombre,
        descripcion: item.descripcion,
        activo: true,
      },
      create: item,
    });
  }
}

async function seedParametrosSistema() {
  for (const item of PARAMETER_SEEDS) {
    await prisma.parametroSistema.upsert({
      where: {
        modulo_clave: {
          modulo: item.modulo,
          clave: item.clave,
        },
      },
      update: {
        nombre: item.nombre,
        descripcion: item.descripcion,
        valor: item.valor,
        activo: true,
      },
      create: {
        ...item,
        activo: true,
      },
    });
  }
}

type UserSeed = {
  username: string;
  password: string;
  nombre: string;
  email: string;
  role: RoleCode;
  dependenciaSigla: string | null;
};

const USER_SEEDS: UserSeed[] = [
  {
    username: "admin",
    password: "Admin1234*",
    nombre: "Administrador tecnico",
    email: "admin.tecnico@sistema.local",
    role: RoleCode.ADMIN_TECNICO,
    dependenciaSigla: null,
  },
  {
    username: "operador.dsgsif",
    password: "Operador1234*",
    nombre: "Operador DSGSIF",
    email: "operador.dsgsif@sistema.local",
    role: RoleCode.OPERADOR,
    dependenciaSigla: "DSGSIF",
  },
  {
    username: "revisor",
    password: "Revisor1234*",
    nombre: "Revisor transversal",
    email: "revisor@sistema.local",
    role: RoleCode.REVISOR,
    dependenciaSigla: null,
  },
  {
    username: "admin.funcional",
    password: "Funcional1234*",
    nombre: "Administrador funcional",
    email: "admin.funcional@sistema.local",
    role: RoleCode.ADMIN_FUNCIONAL,
    dependenciaSigla: null,
  },
];

async function seedUsers(dependenciasBySigla: Map<string, number>) {
  for (const seed of USER_SEEDS) {
    const dependenciaId = resolveDependenciaId(dependenciasBySigla, seed.dependenciaSigla);
    const subdireccion = dependenciaId
      ? await prisma.orgSubdireccion.findFirst({
          where: { dependenciaId },
          orderBy: { nombre: "asc" },
        })
      : null;
    const passwordHash = await bcrypt.hash(seed.password, 10);

    await prisma.user.upsert({
      where: { username: seed.username },
      update: {
        nombre: seed.nombre,
        email: seed.email,
        passwordHash,
        role: seed.role,
        dependenciaId,
        subdireccionId: subdireccion?.id ?? null,
        activo: true,
      },
      create: {
        nombre: seed.nombre,
        email: seed.email,
        username: seed.username,
        passwordHash,
        role: seed.role,
        dependenciaId,
        subdireccionId: subdireccion?.id ?? null,
        activo: true,
      },
    });
  }
}

function resolveDependenciaId(
  dependenciasBySigla: Map<string, number>,
  sigla: string | null,
) {
  if (!sigla) {
    return null;
  }

  return (
    dependenciasBySigla.get(sigla) ??
    dependenciasBySigla.get("DNAC") ??
    dependenciasBySigla.values().next().value ??
    null
  );
}

function buildCatalogSeed(tipo: string, nombres: string[]): CatalogSeedItem[] {
  return nombres.map((nombre) => {
    const key = `${tipo}:${nombre}`;

    return {
      dominio: CATALOG_DOMAIN_BY_TYPE[tipo] ?? "GENERAL",
      tipo,
      codigo: CATALOG_CODE_OVERRIDES[key] ?? buildCatalogCode(nombre),
      nombre,
      descripcion:
        CATALOG_DESCRIPTION_OVERRIDES[key] ??
        `Item maestro de ${CATALOG_TYPE_LABELS[tipo] ?? "catalogo"}: ${nombre}.`,
      activo: true,
    };
  });
}

function buildCatalogCode(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .toUpperCase();
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
