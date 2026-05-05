import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import {
  calculateAssetValue,
  parseAssetImpactRanges,
  parseAssetValueConfig,
} from '../src/activos/activos-value.utils';
import {
  normalizeFreeText,
  normalizeIdentifierText,
  normalizePersonNameList,
  normalizeSentenceText,
  normalizeTitleText,
} from '../src/activos/activos-text.utils';

const prisma = new PrismaClient();

const CATALOG_DOMAIN_BY_TYPE: Record<string, string> = {
  TIPO_ACTIVO: 'ACTIVOS',
  NIVEL_ACTIVO: 'ACTIVOS',
  AMBIENTE_ACTIVO: 'ACTIVOS',
  CLASIFICACION_INFO_ACTIVO: 'ACTIVOS',
  VISIBILIDAD_INTERNET: 'ACTIVOS',
  FUENTE_ACTIVO: 'ACTIVOS',
  IMPACTO_ACTIVO: 'ACTIVOS',
  RESPUESTA_BINARIA: 'GENERAL',
};

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    throw new Error(
      'Debe indicar la ruta del archivo XLSX. Ejemplo: npm run activos:import -- "C:\\ruta\\Matriz Activos de Información.xlsx"',
    );
  }

  const workbook = XLSX.readFile(inputPath, {
    cellDates: true,
    raw: true,
  });
  const globalSheet = workbook.Sheets.Global;

  if (!globalSheet) {
    throw new Error('No se encontro la hoja Global en la matriz de activos.');
  }

  const parentCodesByAsset = buildParentMap(workbook);
  const globalRows = readSheetRows(globalSheet);
  const globalHeaders = buildHeaderIndex(globalRows[0] ?? []);
  const dataRows = globalRows.slice(1).filter((row) =>
    normalizeCell(getCell(row, globalHeaders, ['ID ACTIVO DE INFORMACIÓN', 'ID ACTIVO'])),
  );

  const [valueConfig, impactRanges] = await loadAssetPolicy();
  const dependencyCache = new Map<string, number | null>();
  const catalogCache = new Map<string, number | null>();

  let created = 0;
  let updated = 0;

  for (const row of dataRows) {
    const codigo = normalizeIdentifierText(
      getCell(row, globalHeaders, ['ID ACTIVO DE INFORMACIÓN', 'ID ACTIVO']),
    );

    if (!codigo) {
      continue;
    }

    const dependenciaNombre = normalizeCell(getCell(row, globalHeaders, ['DEPENDENCIA']));
    const siglaDependencia = normalizeCell(getCell(row, globalHeaders, ['SIGLA']));
    const dependenciaId = await findDependencia(
      dependencyCache,
      siglaDependencia,
      dependenciaNombre,
    );

    const tipoActivoId = await ensureCatalogId(
      catalogCache,
      'TIPO_ACTIVO',
      canonicalizeTipoActivo(
        getCell(row, globalHeaders, ['TIPO DE ACTIVO']),
      ),
    );
    const nivelId = await ensureCatalogId(
      catalogCache,
      'NIVEL_ACTIVO',
      canonicalizeNivel(getCell(row, globalHeaders, ['NIVEL'])),
    );
    const ambienteId = await ensureCatalogId(
      catalogCache,
      'AMBIENTE_ACTIVO',
      canonicalizeAmbiente(getCell(row, globalHeaders, ['AMBIENTE'])),
    );
    const clasificacionInfoId = await ensureCatalogId(
      catalogCache,
      'CLASIFICACION_INFO_ACTIVO',
      canonicalizeClasificacion(getCell(row, globalHeaders, ['CLASIFICACION INFORMACIÓN'])),
    );
    const datosPersonalesId = await ensureCatalogId(
      catalogCache,
      'RESPUESTA_BINARIA',
      canonicalizeBinario(getCell(row, globalHeaders, ['DATOS PERSONALES (SI / NO)'])),
    );
    const visibleInternetId = await ensureCatalogId(
      catalogCache,
      'VISIBILIDAD_INTERNET',
      canonicalizeVisibilidadInternet(
        getCell(row, globalHeaders, ['VISIBLE DESDE INTERNET? \n(SI / NO)']),
      ),
    );
    const fuenteActivoId = await ensureCatalogId(
      catalogCache,
      'FUENTE_ACTIVO',
      canonicalizeFuenteActivo(getCell(row, globalHeaders, ['FUENTE ACTIVO'])),
    );
    const bajaProgramadaId = await ensureCatalogId(
      catalogCache,
      'RESPUESTA_BINARIA',
      canonicalizeBinario(getCell(row, globalHeaders, ['BAJA PROGRAMADA (SI / NO)'])),
    );
    const propiedadIntelectualId = await ensureCatalogId(
      catalogCache,
      'RESPUESTA_BINARIA',
      canonicalizeBinario(
        getCell(row, globalHeaders, ['¿Tiene registro de Propiedad Intelectual? (SI /NO)']),
      ),
    );

    const confidencialidad = parseMetricValue(getCell(row, globalHeaders, ['C']));
    const integridad = parseMetricValue(getCell(row, globalHeaders, ['I']));
    const disponibilidad = parseMetricValue(getCell(row, globalHeaders, ['D']));
    const calculated = calculateAssetValue({
      confidencialidad,
      integridad,
      disponibilidad,
      config: valueConfig,
      impactRanges,
    });
    const impactoId = await ensureCatalogId(
      catalogCache,
      'IMPACTO_ACTIVO',
      calculated.impactoNombre,
    );

    const fuentesUsuarios = splitNames(
      getCell(row, globalHeaders, ['NOMBRE DEL USUARIO (FUENTE)']),
    );

    const assetPayload = {
      codigo,
      codigoActivoPadreExterno:
        normalizeIdentifierText(parentCodesByAsset.get(codigo) ?? null),
      dependenciaNombreFuente: normalizeTitleText(dependenciaNombre),
      siglaDependenciaFuente: normalizeIdentifierText(siglaDependencia),
      nombre:
        normalizeTitleText(getCell(row, globalHeaders, ['NOMBRE DEL ACTIVO'])) ??
        codigo,
      descripcion: normalizeSentenceText(
        getCell(row, globalHeaders, ['DESCRIPCIÓN DEL ACTIVO', 'DESCRIPCION DEL ACTIVO']),
      ),
      version: normalizeFreeText(getCell(row, globalHeaders, ['VERSIÓN', 'VERSION'])),
      macroproceso: normalizeTitleText(
        getCell(row, globalHeaders, ['MACROPROCESO', 'MACRO PROCESO']),
      ),
      proceso: normalizeTitleText(getCell(row, globalHeaders, ['PROCESO'])),
      subproceso: normalizeTitleText(getCell(row, globalHeaders, ['SUBPROCESO'])),
      usoOtrasAreasProcesos: normalizeTitleText(
        getCell(row, globalHeaders, ['USO POR OTRAS ÁREA / PROCESOS', 'USO POR OTRAS ÁREA']),
      ),
      direccionIpUrl: normalizeFreeText(
        getCell(row, globalHeaders, ['DIRECCIÓN IP o URL', 'DIRECCION IP o URL']),
      ),
      propietarioActivo: normalizeTitleText(
        getCell(row, globalHeaders, ['PROPIETARIO DEL ACTIVO']),
      ),
      unidadPropietariaActivo: normalizeTitleText(
        getCell(row, globalHeaders, ['UNIDAD PROPIETARIA DEL ACTIVO']),
      ),
      custodio: normalizeTitleText(getCell(row, globalHeaders, ['CUSTODIO'])),
      areaCustodio: normalizeTitleText(
        getCell(row, globalHeaders, ['ÁREA/CUSTODIO', 'AREA/CUSTODIO']),
      ),
      ubicacion: normalizeTitleText(
        getCell(row, globalHeaders, ['UBICACIÓN', 'UBICACION']),
      ),
      controlesExistentes: normalizeSentenceText(
        getCell(row, globalHeaders, ['DESCRIPCION DE CONTROLES EXISTENTES']),
      ),
      observaciones: normalizeSentenceText(getCell(row, globalHeaders, ['Observaciones'])),
      historico: normalizeSentenceText(getCell(row, globalHeaders, ['Historico'])),
      fechaLevantamiento: parseDateValue(
        getCell(row, globalHeaders, ['FECHA DE LEVANTAMIENTO DEL ACTIVO']),
      ),
      confidencialidad,
      integridad,
      disponibilidad,
      valorActivo: calculated.valorActivo,
      activo: true,
      dependenciaId,
      tipoActivoId,
      nivelId,
      ambienteId,
      clasificacionInfoId,
      datosPersonalesId,
      visibleInternetId,
      fuenteActivoId,
      bajaProgramadaId,
      propiedadIntelectualId,
      impactoId,
    };

    const existing = await prisma.activoInformacion.findUnique({
      where: { codigo },
      select: { id: true },
    });

    if (existing) {
      await prisma.activoInformacion.update({
        where: { id: existing.id },
        data: {
          ...assetPayload,
          fuentesUsuarios: undefined,
        },
      });
      await replaceFuenteUsuarios(existing.id, fuentesUsuarios);
      updated += 1;
    } else {
      const createdAsset = await prisma.activoInformacion.create({
        data: {
          ...assetPayload,
          fuentesUsuarios: {
            create: fuentesUsuarios.map((nombre, index) => ({
              nombre,
              orden: index + 1,
            })),
          },
        },
        select: { id: true },
      });
      await replaceFuenteUsuarios(createdAsset.id, fuentesUsuarios);
      created += 1;
    }
  }

  await linkParentAssets(parentCodesByAsset);

  console.log(
    `Importacion completada. Creados: ${created}. Actualizados: ${updated}. Total procesados: ${dataRows.length}.`,
  );
}

async function loadAssetPolicy() {
  const [configParam, rangesParam] = await Promise.all([
    prisma.parametroSistema.findUnique({
      where: {
        modulo_clave: {
          modulo: 'ACTIVOS',
          clave: 'VALOR_ACTIVO_CONFIG',
        },
      },
    }),
    prisma.parametroSistema.findUnique({
      where: {
        modulo_clave: {
          modulo: 'ACTIVOS',
          clave: 'IMPACTO_RANGOS',
        },
      },
    }),
  ]);

  return [
    parseAssetValueConfig(configParam?.valor),
    parseAssetImpactRanges(rangesParam?.valor),
  ] as const;
}

async function replaceFuenteUsuarios(activoId: number, names: string[]) {
  await prisma.activoFuenteUsuario.deleteMany({
    where: { activoId },
  });

  if (names.length === 0) {
    return;
  }

  await prisma.activoFuenteUsuario.createMany({
    data: names.map((nombre, index) => ({
      activoId,
      nombre,
      orden: index + 1,
    })),
    skipDuplicates: true,
  });
}

async function linkParentAssets(parentCodesByAsset: Map<string, string | null>) {
  const assetCodes = Array.from(parentCodesByAsset.keys());

  for (const codigo of assetCodes) {
    const parentCode = parentCodesByAsset.get(codigo);

    if (!parentCode) {
      continue;
    }

    const [child, parent] = await Promise.all([
      prisma.activoInformacion.findUnique({
        where: { codigo },
        select: { id: true },
      }),
      prisma.activoInformacion.findUnique({
        where: { codigo: parentCode },
        select: { id: true },
      }),
    ]);

    if (!child) {
      continue;
    }

    await prisma.activoInformacion.update({
      where: { id: child.id },
      data: {
        codigoActivoPadreExterno: parentCode,
        activoPadreId: parent?.id ?? null,
      },
    });
  }
}

async function findDependencia(
  cache: Map<string, number | null>,
  sigla: string | null,
  nombre: string | null,
) {
  const key = `${sigla ?? ''}|${nombre ?? ''}`;

  if (cache.has(key)) {
    return cache.get(key) ?? null;
  }

  const dependencia = await prisma.orgDependencia.findFirst({
    where: {
      OR: [
        ...(sigla ? [{ sigla: { equals: sigla, mode: 'insensitive' as const } }] : []),
        ...(nombre ? [{ nombre: { equals: nombre, mode: 'insensitive' as const } }] : []),
      ],
    },
    select: { id: true },
  });

  cache.set(key, dependencia?.id ?? null);
  return dependencia?.id ?? null;
}

async function ensureCatalogId(
  cache: Map<string, number | null>,
  tipo: string,
  nombre: string | null,
) {
  if (!nombre) {
    return null;
  }

  const code = buildCatalogCode(nombre);
  const key = `${tipo}:${code}`;

  if (cache.has(key)) {
    return cache.get(key) ?? null;
  }

  const existing = await prisma.catalogo.findFirst({
    where: {
      tipo,
      OR: [
        { codigo: code },
        { nombre: { equals: nombre, mode: 'insensitive' } },
      ],
    },
    select: { id: true },
  });

  if (existing) {
    cache.set(key, existing.id);
    return existing.id;
  }

  const created = await prisma.catalogo.create({
    data: {
      dominio: CATALOG_DOMAIN_BY_TYPE[tipo] ?? 'GENERAL',
      tipo,
      codigo: code,
      nombre,
      descripcion: `Catalogo autogenerado desde matriz de activos: ${nombre}.`,
      activo: true,
    },
    select: { id: true },
  });

  cache.set(key, created.id);
  return created.id;
}

function buildParentMap(workbook: XLSX.WorkBook) {
  const parentCodes = new Map<string, string | null>();

  for (const sheetName of workbook.SheetNames) {
    if (sheetName === 'Global') {
      continue;
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = readSheetRows(sheet);
    const headers = buildHeaderIndex(rows[0] ?? []);

    for (const row of rows.slice(1)) {
      const codigo = normalizeCell(
        getCell(row, headers, ['ID ACTIVO DE INFORMACIÓN', 'ID ACTIVO']),
      );
      const parentCode = normalizeCell(
        getCell(row, headers, [
          'ID ACTIVO DE INFORMACIÓN PADRE',
          'ID ACTIVO DE INFORMACION PADRE',
          'ID ACTIVO (PADRE)',
        ]),
      );

      if (codigo) {
        parentCodes.set(codigo, parentCode);
      }
    }
  }

  return parentCodes;
}

function readSheetRows(sheet: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });
}

function buildHeaderIndex(headerRow: Array<string | number | Date | null>) {
  return headerRow.reduce<Record<string, number>>((accumulator, cell, index) => {
    const normalized = normalizeHeader(cell);
    if (normalized) {
      accumulator[normalized] = index;
    }
    return accumulator;
  }, {});
}

function getCell(
  row: Array<string | number | Date | null>,
  headers: Record<string, number>,
  aliases: string[],
) {
  for (const alias of aliases) {
    const index = headers[normalizeHeader(alias)];

    if (index !== undefined) {
      return row[index];
    }
  }

  return null;
}

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function normalizeCell(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).replace(/\r/g, '').trim();
  return normalized.length > 0 ? normalized : null;
}

function parseMetricValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDateValue(value: unknown) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function splitNames(value: unknown) {
  const raw = normalizeCell(value);

  if (!raw) {
    return [];
  }

  return normalizePersonNameList(
    raw
      .split(/\n|;/)
      .map((item) => item.replace(/\s+/g, ' ').trim())
      .filter(
        (item) =>
          item.length > 0 &&
          !['PRINCIPAL', 'BACK UP', 'BACKUP'].includes(item.toUpperCase()),
      ),
  );
}

function canonicalizeTipoActivo(value: unknown) {
  const normalized = normalizeToken(value);

  switch (normalized) {
    case 'APLICACION WEB':
    case 'APLICACION (WEB)':
      return 'Aplicacion (Web)';
    case 'APLICACION':
      return 'Aplicacion';
    case 'SOFTWARE (CLIENTE / SERVIDOR)':
      return 'Software (Cliente / Servidor)';
    case 'COMPONENTE (WEBSERVICES)':
    case 'WEBSERVICES':
      return 'Componente (Webservices)';
    case 'BASE DE DATOS':
      return 'Base de datos';
    case 'EQUIPO SERVIDOR (FISICO / VIRTUAL)':
    case 'EQUIPO SERVIDOR (FISICO/ VIRTUAL)':
    case 'EQUIPO SERVIDOR (FISICO/ VIRTUAL)':
      return 'Equipo servidor (fisico / virtual)';
    case 'EQUIPO (HW)':
    case 'EQUIPO HARDWARE':
      return 'Equipo hardware';
    case 'REPOSITORIO DIGITAL':
      return 'Repositorio digital';
    case 'REPOSITORIO (DOCUMENTACION FISICA/ DIGITAL)':
    case 'REPOSITORIO (DOCUMENTACION FISICA / DIGITAL)':
      return 'Repositorio (Documentacion fisica / digital)';
    case 'REPOSITORIO FISICO':
      return 'Repositorio fisico';
    case 'SERVICIO / PORVEEDOR':
    case 'SERVICIO / PROVEEDOR':
      return 'Servicio / Proveedor';
    default:
      return normalizeCell(value);
  }
}

function canonicalizeNivel(value: unknown) {
  const normalized = normalizeToken(value);

  switch (normalized) {
    case 'NIVEL A':
      return 'Nivel A';
    case 'NIVEL B':
      return 'Nivel B';
    case 'NIVEL C':
      return 'Nivel C';
    case 'NIVEL B1':
    case 'NIVEL B 1':
      return 'Nivel B1';
    case 'NIVEL B2':
      return 'Nivel B2';
    case 'NIVEL B.2.1':
      return 'Nivel B 2.1';
    case 'NIVEL B 2.2':
      return 'Nivel B 2.2';
    case 'NIVEL B.2.3':
      return 'Nivel B 2.3';
    default:
      return normalizeCell(value);
  }
}

function canonicalizeAmbiente(value: unknown) {
  const normalized = normalizeToken(value);

  switch (normalized) {
    case 'PRODUCCION':
    case 'PRODUCCUION':
      return 'Produccion';
    case 'N/A':
    case 'NO APLICA':
      return 'No aplica';
    default:
      return normalizeCell(value);
  }
}

function canonicalizeClasificacion(value: unknown) {
  const normalized = normalizeToken(value);

  switch (normalized) {
    case 'RESERVADO':
    case 'RESERVADA':
      return 'Reservado';
    case 'INTERNO':
    case 'INTERNA':
      return 'Interno';
    case 'CONFIDENCIAL':
      return 'Confidencial';
    case 'PUBLICO':
    case 'PUBLICOS':
      return 'Publico';
    case 'SENSIBLE':
      return 'Sensible';
    case 'N/A':
      return 'No aplica';
    default:
      return normalizeCell(value);
  }
}

function canonicalizeBinario(value: unknown) {
  const normalized = normalizeToken(value);

  switch (normalized) {
    case 'SI':
      return 'SI';
    case 'NO':
      return 'NO';
    default:
      return null;
  }
}

function canonicalizeVisibilidadInternet(value: unknown) {
  const normalized = normalizeToken(value);

  switch (normalized) {
    case 'SI':
      return 'Si';
    case 'NO':
      return 'No';
    case 'NO (VPN)':
      return 'No (VPN)';
    case 'SI :SW NO: F':
      return 'Mixto';
    case 'N/A':
      return 'No aplica';
    default:
      return normalizeCell(value);
  }
}

function canonicalizeFuenteActivo(value: unknown) {
  const normalized = normalizeToken(value);

  switch (normalized) {
    case 'USUARIO FINAL':
    case 'USIARIO FINAL':
      return 'Usuario final';
    case 'USUARIO FUENTE':
      return 'Usuario fuente';
    default:
      return normalizeCell(value);
  }
}

function normalizeToken(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function buildCatalogCode(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
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
