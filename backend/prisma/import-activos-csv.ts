/**
 * Import activos de información from a normalized CSV file.
 *
 * Usage (from repo root, with DATABASE_URL pointing to your PostgreSQL instance):
 *   DATABASE_URL="postgresql://..." npx ts-node -P backend/tsconfig.json backend/prisma/import-activos-csv.ts <path-to-csv>
 *
 * This script:
 *   1. Truncates ActivoInformacion (and dependent tables: ActividadActivo, ActivoFuenteUsuario)
 *   2. Imports all rows from the CSV
 *   3. Links parent-child relationships via id_activo_padre
 *
 * CSV column names expected (snake_case):
 *   id_activo, id_activo_padre, nombre_activo, descripcion, version,
 *   macroproceso, proceso, subproceso, uso_otras_areas, tipo_activo, nivel,
 *   direccion_ip_url, propietario_activo, unidad_propietaria, custodio,
 *   area_custodio, ambiente, clasificacion_informacion, datos_personales,
 *   ubicacion, visible_internet, confidencialidad_c, integridad_i,
 *   disponibilidad_d, valor_activo, impacto, fecha_levantamiento,
 *   fuente_activo, nombre_usuario_fuente, descripcion_controles,
 *   baja_programada, propiedad_intelectual, observaciones, historico,
 *   hoja_origen (ignored)
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
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
  const csvPath = process.argv[2];

  if (!csvPath) {
    throw new Error(
      'Debe indicar la ruta del archivo CSV. Ejemplo: ... import-activos-csv.ts "E:\\ruta\\activos_informacion.csv"',
    );
  }

  // ── 1. Vaciar tablas dependientes y la tabla principal ────────────────────
  console.log('Vaciando tablas dependientes de ActivoInformacion...');
  await prisma.activoFuenteUsuario.deleteMany({});
  await prisma.actividadActivo.deleteMany({});
  // Quitar auto-referencias (activoPadreId) antes de borrar
  await prisma.$executeRaw`UPDATE "ActivoInformacion" SET "activoPadreId" = NULL`;
  await prisma.activoInformacion.deleteMany({});
  console.log('Tablas vaciadas.');

  // ── 2. Leer y parsear CSV ─────────────────────────────────────────────────
  let content = fs.readFileSync(csvPath, 'utf-8');
  // Strip UTF-8 BOM if present
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }

  const rows = parseCSV(content);

  if (rows.length < 2) {
    throw new Error('El archivo CSV no contiene filas de datos.');
  }

  const headers = buildHeaderIndex(rows[0] ?? []);
  const dataRows = rows.slice(1).filter((row) => {
    const codigo = normalizeCell(getCsvCell(row, headers, 'id_activo'));
    return !!codigo;
  });

  console.log(`Importando ${dataRows.length} registros...`);

  // ── 3. Importar registros ─────────────────────────────────────────────────
  const catalogCache = new Map<string, number | null>();
  const idMap = new Map<string, number>(); // codigo externo → DB id
  let created = 0;

  for (const row of dataRows) {
    const codigo = normalizeIdentifierText(
      normalizeCell(getCsvCell(row, headers, 'id_activo')),
    );

    if (!codigo) {
      continue;
    }

    const tipoActivoId = await ensureCatalogId(
      catalogCache,
      'TIPO_ACTIVO',
      canonicalizeTipoActivo(getCsvCell(row, headers, 'tipo_activo')),
    );
    const nivelId = await ensureCatalogId(
      catalogCache,
      'NIVEL_ACTIVO',
      canonicalizeNivel(getCsvCell(row, headers, 'nivel')),
    );
    const ambienteId = await ensureCatalogId(
      catalogCache,
      'AMBIENTE_ACTIVO',
      canonicalizeAmbiente(getCsvCell(row, headers, 'ambiente')),
    );
    const clasificacionInfoId = await ensureCatalogId(
      catalogCache,
      'CLASIFICACION_INFO_ACTIVO',
      canonicalizeClasificacion(getCsvCell(row, headers, 'clasificacion_informacion')),
    );
    const datosPersonalesId = await ensureCatalogId(
      catalogCache,
      'RESPUESTA_BINARIA',
      canonicalizeBinario(getCsvCell(row, headers, 'datos_personales')),
    );
    const visibleInternetId = await ensureCatalogId(
      catalogCache,
      'VISIBILIDAD_INTERNET',
      canonicalizeVisibilidadInternet(getCsvCell(row, headers, 'visible_internet')),
    );
    const fuenteActivoId = await ensureCatalogId(
      catalogCache,
      'FUENTE_ACTIVO',
      canonicalizeFuenteActivo(getCsvCell(row, headers, 'fuente_activo')),
    );
    const bajaProgramadaId = await ensureCatalogId(
      catalogCache,
      'RESPUESTA_BINARIA',
      canonicalizeBinario(getCsvCell(row, headers, 'baja_programada')),
    );
    const propiedadIntelectualId = await ensureCatalogId(
      catalogCache,
      'RESPUESTA_BINARIA',
      canonicalizeBinario(getCsvCell(row, headers, 'propiedad_intelectual')),
    );
    // El CSV tiene impacto como texto directo (no calculado desde C/I/D)
    const impactoId = await ensureCatalogId(
      catalogCache,
      'IMPACTO_ACTIVO',
      canonicalizeImpacto(getCsvCell(row, headers, 'impacto')),
    );

    const fuentesUsuarios = splitNames(
      normalizeCell(getCsvCell(row, headers, 'nombre_usuario_fuente')),
    );

    const codigoPadreExterno = normalizeIdentifierText(
      normalizeCell(getCsvCell(row, headers, 'id_activo_padre')),
    );

    const newAsset = await prisma.activoInformacion.create({
      data: {
        codigo,
        codigoActivoPadreExterno: codigoPadreExterno ?? null,
        nombre:
          normalizeTitleText(normalizeCell(getCsvCell(row, headers, 'nombre_activo'))) ??
          codigo,
        descripcion: normalizeSentenceText(
          normalizeCell(getCsvCell(row, headers, 'descripcion')),
        ),
        version: normalizeFreeText(normalizeCell(getCsvCell(row, headers, 'version'))),
        macroproceso: normalizeTitleText(
          normalizeCell(getCsvCell(row, headers, 'macroproceso')),
        ),
        proceso: normalizeTitleText(normalizeCell(getCsvCell(row, headers, 'proceso'))),
        subproceso: normalizeTitleText(
          normalizeCell(getCsvCell(row, headers, 'subproceso')),
        ),
        usoOtrasAreasProcesos: normalizeTitleText(
          normalizeCell(getCsvCell(row, headers, 'uso_otras_areas')),
        ),
        direccionIpUrl: normalizeFreeText(
          normalizeCell(getCsvCell(row, headers, 'direccion_ip_url')),
        ),
        propietarioActivo: normalizeTitleText(
          normalizeCell(getCsvCell(row, headers, 'propietario_activo')),
        ),
        dependenciaNombreFuente: normalizeTitleText(
          normalizeCell(getCsvCell(row, headers, 'propietario_activo')),
        ),
        unidadPropietariaActivo: normalizeTitleText(
          normalizeCell(getCsvCell(row, headers, 'unidad_propietaria')),
        ),
        custodio: normalizeTitleText(normalizeCell(getCsvCell(row, headers, 'custodio'))),
        areaCustodio: normalizeTitleText(
          normalizeCell(getCsvCell(row, headers, 'area_custodio')),
        ),
        ubicacion: normalizeTitleText(normalizeCell(getCsvCell(row, headers, 'ubicacion'))),
        controlesExistentes: normalizeSentenceText(
          normalizeCell(getCsvCell(row, headers, 'descripcion_controles')),
        ),
        observaciones: normalizeSentenceText(
          normalizeCell(getCsvCell(row, headers, 'observaciones')),
        ),
        historico: normalizeSentenceText(
          normalizeCell(getCsvCell(row, headers, 'historico')),
        ),
        fechaLevantamiento: parseDateValue(
          getCsvCell(row, headers, 'fecha_levantamiento'),
        ),
        confidencialidad: parseMetricValue(
          getCsvCell(row, headers, 'confidencialidad_c'),
        ),
        integridad: parseMetricValue(getCsvCell(row, headers, 'integridad_i')),
        disponibilidad: parseMetricValue(getCsvCell(row, headers, 'disponibilidad_d')),
        valorActivo: parseFloatValue(getCsvCell(row, headers, 'valor_activo')),
        activo: true,
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
        fuentesUsuarios:
          fuentesUsuarios.length > 0
            ? {
                create: fuentesUsuarios.map((nombre, index) => ({
                  nombre,
                  orden: index + 1,
                })),
              }
            : undefined,
      },
      select: { id: true },
    });

    idMap.set(codigo, newAsset.id);
    created++;

    if (created % 50 === 0) {
      console.log(`  Procesados: ${created} de ${dataRows.length}...`);
    }
  }

  // ── 4. Vincular relaciones padre-hijo ─────────────────────────────────────
  console.log('Vinculando relaciones padre-hijo...');
  let linked = 0;

  for (const row of dataRows) {
    const codigo = normalizeIdentifierText(
      normalizeCell(getCsvCell(row, headers, 'id_activo')),
    );
    const codigoPadre = normalizeIdentifierText(
      normalizeCell(getCsvCell(row, headers, 'id_activo_padre')),
    );

    if (!codigo || !codigoPadre) continue;

    const childId = idMap.get(codigo);
    const parentId = idMap.get(codigoPadre);

    if (!childId || !parentId) continue;

    await prisma.activoInformacion.update({
      where: { id: childId },
      data: { activoPadreId: parentId },
    });

    linked++;
  }

  console.log(`\nImportacion completada:`);
  console.log(`  Registros creados:          ${created}`);
  console.log(`  Relaciones padre-hijo:      ${linked}`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function ensureCatalogId(
  cache: Map<string, number | null>,
  tipo: string,
  nombre: string | null,
) {
  if (!nombre) return null;

  const code = buildCatalogCode(nombre);
  const key = `${tipo}:${code}`;

  if (cache.has(key)) return cache.get(key) ?? null;

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
      descripcion: `Catalogo autogenerado desde importacion CSV: ${nombre}.`,
      activo: true,
    },
    select: { id: true },
  });

  cache.set(key, created.id);
  return created.id;
}

function buildHeaderIndex(headerRow: string[]) {
  return headerRow.reduce<Record<string, number>>((acc, cell, index) => {
    const normalized = normalizeHeader(cell);
    if (normalized) acc[normalized] = index;
    return acc;
  }, {});
}

function getCsvCell(row: string[], headers: Record<string, number>, columnName: string) {
  const index = headers[normalizeHeader(columnName)];
  return index !== undefined ? (row[index] ?? null) : null;
}

/** RFC 4180 compliant CSV parser that handles multiline quoted fields. */
function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < content.length) {
    const ch = content[i];

    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        row.push(field);
        field = '';
        i++;
      } else if (ch === '\r') {
        i++; // skip CR
      } else if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  // Last row (file may not end with newline)
  row.push(field);
  if (row.some((f) => f.trim().length > 0)) {
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function normalizeCell(value: unknown) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).replace(/\r/g, '').trim();
  return normalized.length > 0 ? normalized : null;
}

function parseMetricValue(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseFloatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDateValue(value: unknown) {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;
  // Support DD/MM/YYYY format common in Ecuadorian spreadsheets
  const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const parsed = new Date(`${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function splitNames(value: string | null) {
  if (!value) return [];
  return normalizePersonNameList(
    value
      .split(/\n|;/)
      .map((item) => item.replace(/\s+/g, ' ').trim())
      .filter(
        (item) =>
          item.length > 0 &&
          !['PRINCIPAL', 'BACK UP', 'BACKUP'].includes(item.toUpperCase()),
      ),
  );
}

function buildCatalogCode(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .toUpperCase();
}

function normalizeToken(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

// ── Canonicalization functions ────────────────────────────────────────────────

function canonicalizeImpacto(value: unknown) {
  const normalized = normalizeToken(value);
  switch (normalized) {
    case 'CATASTROFICO':
    case 'CATASTRÓFICO':
      return 'Catastrofico';
    case 'MAYOR':
      return 'Mayor';
    case 'MODERADO':
      return 'Moderado';
    case 'MENOR':
      return 'Menor';
    case 'INSIGNIFICANTE':
      return 'Insignificante';
    default:
      return normalizeCell(value);
  }
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

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
