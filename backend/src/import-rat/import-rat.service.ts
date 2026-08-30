import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import * as XLSX from 'xlsx';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';

const ADMIN_FUNCIONAL_ROLES = ['ADMIN_FUNCIONAL'];

function isAdminFuncional(role: string) {
  const r = role.toUpperCase().replace(/\s+/g, '_');
  return ADMIN_FUNCIONAL_ROLES.includes(r) || r === 'ADMIN';
}

function normalize(str: string): string {
  return (str ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

const CATEGORIA_MAP: Record<string, string> = {
  'datos identificacion': 'DATOS_DE_IDENTIFICACION',
  'datos de identificacion': 'DATOS_DE_IDENTIFICACION',
  'datos biometricos': 'DATOS_BIOMETRICOS',
  'datos academicos': 'DATOS_ACADEMICOS',
  'datos de contacto': 'DATOS_DE_CONTACTO',
  'datos de parentesco o vinculo': 'DATOS_DE_PARENTESCO_O_VINCULO',
  'datos de personas con discapacidad y sus sustitutos':
    'DATOS_DE_PERSONAS_CON_DISCAPACIDAD_Y_SUS_SUSTITUTOS',
  'datos de salud': 'DATOS_DE_SALUD',
  'datos socioeconomicos': 'DATOS_SOCIOECONOMICOS',
  'datos financieros, bancarios o crediticios':
    'DATOS_FINANCIEROS_BANCARIOS_O_CREDITICIOS',
  'datos financieros bancarios o crediticios':
    'DATOS_FINANCIEROS_BANCARIOS_O_CREDITICIOS',
  'datos domiciliarios': 'DATOS_DOMICILIARIOS',
  'datos laborales': 'DATOS_LABORALES',
  'datos de filiacion': 'DATOS_DE_FILIACION',
  'datos de diversidad y autoidentificacion':
    'DATOS_DE_DIVERSIDAD_Y_AUTOIDENTIFICACION',
  'datos de condicion migratoria': 'DATOS_DE_CONDICION_MIGRATORIA',
  'datos relacionados con afiliacion sindical o gremial':
    'DATOS_RELACIONADOS_CON_AFILIACION_SINDICAL_O_GREMIAL',
  'datos de menores de edad': 'DATOS_DE_MENORES_DE_EDAD',
};

const LICITUD_MAP: Record<string, string> = {
  'cumplimiento de obligaciones legales': 'OBLIGACION_LEGAL',
  'cumplimiento de una obligacion legal para el responsable': 'OBLIGACION_LEGAL',
  'cumplimiento de obligacion legal': 'OBLIGACION_LEGAL',
  'mision o interes publico': 'MISION_PUBLICA',
  'consentimiento expreso del titular': 'CONSENTIMIENTO_EXPRESO_DEL_TITULAR',
  'interes vital del titular': 'INTERES_VITAL_DEL_TITULAR',
  'ejecucion de relaciones precontractuales y contractuales':
    'EJECUCION_DE_RELACIONES_PRECONTRACTUALES_Y_CONTRACTUALES',
};

function resolveBaseLicitud(raw: string): string {
  return LICITUD_MAP[normalize(raw)] ?? 'OBLIGACION_LEGAL';
}

function resolveCategoria(raw: string): string | null {
  return CATEGORIA_MAP[normalize(raw)] ?? null;
}

function excelDateToDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (!date) return null;
    return new Date(date.y, date.m - 1, date.d);
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

type TitularCategoriaImport = {
  titular: string;
  catRaw: string;
  campos: string[];
};

type ParsedActivity = {
  codigo: string;
  nombre: string;
  macroproceso: string;
  proceso: string;
  subproceso: string;
  finalidad: string;
  baseLicitudRaw: string;
  normaAplicable: string;
  categoriasTitulares: string[];
  titularCategorias: TitularCategoriaImport[];
  origenDatos: string;
  accionesTratamiento: string[];
  numTitulares: string;
  frecuenciaTratamiento: string;
  permanenciaTratamiento: string;
  alcanceGeograficoText: string;
  terceros: Array<{
    acceso: string;
    nombre: string;
    categoria: string;
    contacto: string;
    pais: string;
    baseLicitud: string;
  }>;
  activosImport: Array<{
    id: string;
    electronico: string;
    fisico: string;
    clasificacion: string;
    baseDatos: string;
  }>;
  medidaSeguridad: string;
  usaPerfilamiento: boolean;
  descripcionPerfilamiento: string;
  plazoConservacion: string;
  fechaLevantamiento: Date | null;
};

function parseSheet(
  ws: XLSX.WorkSheet,
): ParsedActivity[] {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: '',
  }) as unknown[][];

  const dataRows = rows.slice(1).filter((r) => r[0] && String(r[0]).trim());

  const byId = new Map<string, ParsedActivity>();

  for (const row of dataRows) {
    const col = (i: number) => String(row[i] ?? '').trim();

    const codigo = col(0);
    const procesoParts = col(3).split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const titularRaw = col(8);
    const catRaw = col(9);
    // col(10) = "Descripción de Datos personales" — multi-line list of individual fields
    const camposRaw = col(10)
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const accionRaw = col(12);
    const acciones = accionRaw
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (!byId.has(codigo)) {
      byId.set(codigo, {
        codigo,
        nombre: col(4),
        macroproceso: procesoParts[0] ?? '',
        proceso: procesoParts[1] ?? '',
        subproceso: procesoParts[2] ?? '',
        finalidad: col(5),
        baseLicitudRaw: col(6),
        normaAplicable: col(7),
        categoriasTitulares: titularRaw ? [titularRaw] : [],
        titularCategorias: [],
        origenDatos: col(11),
        accionesTratamiento: acciones,
        numTitulares: col(13),
        frecuenciaTratamiento: col(14),
        permanenciaTratamiento: col(15),
        alcanceGeograficoText: col(16),
        terceros: [],
        activosImport: [],
        medidaSeguridad: col(28),
        usaPerfilamiento: normalize(col(29)) === 'si' || normalize(col(29)) === 'yes',
        descripcionPerfilamiento: col(30),
        plazoConservacion: col(31),
        fechaLevantamiento: excelDateToDate(row[32]),
      });
    }

    const act = byId.get(codigo)!;

    // Accumulate unique titulares
    if (titularRaw && !act.categoriasTitulares.includes(titularRaw)) {
      act.categoriasTitulares.push(titularRaw);
    }

    // Accumulate (titular × category → campos), deduplicating rows
    if (catRaw) {
      const existing = act.titularCategorias.find(
        (tc) => tc.titular === titularRaw && tc.catRaw === catRaw,
      );
      if (existing) {
        for (const campo of camposRaw) {
          if (!existing.campos.includes(campo)) existing.campos.push(campo);
        }
      } else {
        act.titularCategorias.push({ titular: titularRaw, catRaw, campos: camposRaw });
      }
    }

    const nombreTercero = col(18);
    if (nombreTercero && nombreTercero !== 'N/A') {
      const exists = act.terceros.some((t) => t.nombre === nombreTercero);
      if (!exists) {
        act.terceros.push({
          acceso: col(17),
          nombre: nombreTercero,
          categoria: col(19),
          contacto: col(20),
          pais: col(21),
          baseLicitud: col(22),
        });
      }
    }

    const activoId = col(23);
    if (activoId) {
      const exists = act.activosImport.some((a) => a.id === activoId);
      if (!exists) {
        act.activosImport.push({
          id: activoId,
          electronico: col(24),
          fisico: col(25),
          clasificacion: col(26),
          baseDatos: col(27),
        });
      }
    }
  }

  return [...byId.values()];
}

export type ImportRatResult = {
  rat: string;
  actividadesCreadas: number;
  actividadesActualizadas: number;
  categoriasNuevas: string[];
  advertencias: string[];
};

@Injectable()
export class ImportRatService {
  constructor(private readonly prisma: PrismaService) {}

  async importMatrix(
    fileBuffer: Buffer,
    dependenciaId: number,
    actor: AuthenticatedUser,
  ): Promise<ImportRatResult> {
    if (!isAdminFuncional(actor.role)) {
      throw new ForbiddenException(
        'Solo el Administrador Funcional puede importar matrices RAT',
      );
    }

    const dep = await this.prisma.orgDependencia.findUnique({
      where: { id: dependenciaId },
    });
    if (!dep) {
      throw new BadRequestException(`Dependencia id=${dependenciaId} no encontrada`);
    }

    const wb = XLSX.read(fileBuffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) {
      throw new BadRequestException('El archivo no contiene ninguna hoja válida');
    }

    const activities = parseSheet(ws);
    if (activities.length === 0) {
      throw new BadRequestException(
        'No se encontraron actividades de tratamiento en la hoja',
      );
    }

    // Resolve base licitud catalogue entries
    const licitudCodes = [
      ...new Set(activities.map((a) => resolveBaseLicitud(a.baseLicitudRaw))),
    ];
    const licitudRows = await this.prisma.catalogo.findMany({
      where: { tipo: 'BASE_LICITUD', codigo: { in: licitudCodes } },
    });
    const licitudById = new Map(licitudRows.map((r) => [r.codigo, r.id]));

    // Resolve and create missing data categories
    const categoriasNuevas: string[] = [];
    const allCatRaws = [
      ...new Set(activities.flatMap((a) => a.titularCategorias.map((tc) => tc.catRaw))),
    ];
    const catCodeMap = new Map<string, string>(); // raw name → DB code

    for (const raw of allCatRaws) {
      const code = resolveCategoria(raw);
      if (!code) {
        const advertenciaCat = `Categoria desconocida ignorada: "${raw}"`;
        console.warn(advertenciaCat);
        continue;
      }
      catCodeMap.set(raw, code);

      const existing = await this.prisma.catalogo.findFirst({
        where: { tipo: 'CATEGORIA_DATO', codigo: code, parentId: null },
      });

      if (!existing) {
        await this.prisma.catalogo.create({
          data: {
            tipo: 'CATEGORIA_DATO',
            codigo: code,
            nombre: raw,
            activo: true,
          },
        });
        categoriasNuevas.push(code);
      }
    }

    // Find or create RAT for this dependency
    const year = new Date().getFullYear();
    const sigla = dep.sigla ?? dep.nombre.substring(0, 4).toUpperCase();
    const ratCodigo = `RAT-${year}-${sigla}`;

    let rat = await this.prisma.rat.findUnique({ where: { codigo: ratCodigo } });
    if (!rat) {
      rat = await this.prisma.rat.create({
        data: {
          codigo: ratCodigo,
          nombre: `Registro de Actividades de Tratamiento - ${dep.nombre}`,
          dependenciaId,
          estadoGeneral: 'VIGENTE',
        },
      });
    }

    // Create or update activities
    let creadas = 0;
    let actualizadas = 0;
    const advertencias: string[] = [];

    for (const act of activities) {
      const baseLicitudCode = resolveBaseLicitud(act.baseLicitudRaw);
      const baseLicitudId = licitudById.get(baseLicitudCode) ?? null;

      // Build structured categoriasDatos: { titular, codigo, campos }[]
      // This preserves the full Titular → Categoría → Campos relationship from the Excel
      const categoriasDatosEstructurado = act.titularCategorias
        .map((tc) => {
          const codigo = catCodeMap.get(tc.catRaw);
          if (!codigo) return null;
          return { titular: tc.titular, codigo, campos: tc.campos };
        })
        .filter((item): item is { titular: string; codigo: string; campos: string[] } => item !== null);

      const versionData = {
        finalidad: act.finalidad || null,
        plazoConservacion: act.plazoConservacion || null,
        baseLicitudId,
        normaAplicable: act.normaAplicable || null,
        categoriasTitulares: act.categoriasTitulares.join(', ') || null,
        categoriasDatos: categoriasDatosEstructurado,
        accionesTratamiento: act.accionesTratamiento,
        numTitulares: act.numTitulares || null,
        frecuenciaTratamiento: act.frecuenciaTratamiento || null,
        permanenciaTratamiento: act.permanenciaTratamiento || null,
        alcanceGeograficoText: act.alcanceGeograficoText || null,
        origenDatos: act.origenDatos || null,
        medidaSeguridad: act.medidaSeguridad || null,
        usaPerfilamiento: act.usaPerfilamiento,
        descripcionPerfilamiento: act.descripcionPerfilamiento || null,
        terceros: act.terceros,
        activosImport: act.activosImport,
        fechaLevantamiento: act.fechaLevantamiento,
        estadoVersion: 'VIGENTE',
        numeroVersion: '1.0',
      };

      const existingAct = await this.prisma.actividadTratamiento.findUnique({
        where: { ratId_codigo: { ratId: rat.id, codigo: act.codigo } },
        include: { versiones: { orderBy: { id: 'desc' }, take: 1 } },
      });

      if (existingAct) {
        // Update macroproceso/proceso/subproceso on activity
        await this.prisma.actividadTratamiento.update({
          where: { id: existingAct.id },
          data: {
            nombre: act.nombre,
            macroproceso: act.macroproceso || null,
            proceso: act.proceso || null,
            subproceso: act.subproceso || null,
          },
        });

        const existingVersion = existingAct.versiones[0];
        if (existingVersion) {
          await this.prisma.actividadVersion.update({
            where: { id: existingVersion.id },
            data: versionData,
          });
        } else {
          await this.prisma.actividadVersion.create({
            data: { ...versionData, actividadId: existingAct.id },
          });
        }
        actualizadas++;
      } else {
        const newAct = await this.prisma.actividadTratamiento.create({
          data: {
            codigo: act.codigo,
            nombre: act.nombre,
            ratId: rat.id,
            estadoGeneral: 'VIGENTE',
            macroproceso: act.macroproceso || null,
            proceso: act.proceso || null,
            subproceso: act.subproceso || null,
          },
        });

        await this.prisma.actividadVersion.create({
          data: { ...versionData, actividadId: newAct.id },
        });
        creadas++;
      }
    }

    return {
      rat: ratCodigo,
      actividadesCreadas: creadas,
      actividadesActualizadas: actualizadas,
      categoriasNuevas,
      advertencias,
    };
  }
}
