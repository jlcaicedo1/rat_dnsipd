import { PrismaClient } from '@prisma/client';
import {
  normalizeFreeText,
  normalizeIdentifierText,
  normalizePersonNameList,
  normalizeSentenceText,
  normalizeTitleText,
} from '../src/activos/activos-text.utils';

const prisma = new PrismaClient();

async function main() {
  const activos = await prisma.activoInformacion.findMany({
    include: {
      fuentesUsuarios: {
        orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      },
    },
  });

  let updatedActivos = 0;
  let updatedFuentes = 0;

  for (const activo of activos) {
    const normalized = {
      codigo: normalizeIdentifierText(activo.codigo) ?? activo.codigo,
      nombre: normalizeTitleText(activo.nombre) ?? activo.nombre,
      codigoActivoPadreExterno: normalizeIdentifierText(activo.codigoActivoPadreExterno),
      dependenciaNombreFuente: normalizeTitleText(activo.dependenciaNombreFuente),
      siglaDependenciaFuente: normalizeIdentifierText(activo.siglaDependenciaFuente),
      descripcion: normalizeSentenceText(activo.descripcion),
      version: normalizeFreeText(activo.version),
      macroproceso: normalizeTitleText(activo.macroproceso),
      proceso: normalizeTitleText(activo.proceso),
      subproceso: normalizeTitleText(activo.subproceso),
      usoOtrasAreasProcesos: normalizeTitleText(activo.usoOtrasAreasProcesos),
      direccionIpUrl: normalizeFreeText(activo.direccionIpUrl),
      propietarioActivo: normalizeTitleText(activo.propietarioActivo),
      unidadPropietariaActivo: normalizeTitleText(activo.unidadPropietariaActivo),
      custodio: normalizeTitleText(activo.custodio),
      areaCustodio: normalizeTitleText(activo.areaCustodio),
      ubicacion: normalizeTitleText(activo.ubicacion),
      controlesExistentes: normalizeSentenceText(activo.controlesExistentes),
      observaciones: normalizeSentenceText(activo.observaciones),
      historico: normalizeSentenceText(activo.historico),
    };

    const hasAssetChanges = hasNormalizedChanges(activo, normalized);

    if (hasAssetChanges) {
      await prisma.activoInformacion.update({
        where: { id: activo.id },
        data: normalized,
      });
      updatedActivos += 1;
    }

    const normalizedFuentes = normalizePersonNameList(
      activo.fuentesUsuarios.map((item) => item.nombre),
    );
    const currentFuentes = activo.fuentesUsuarios.map((item) => item.nombre);

    if (JSON.stringify(normalizedFuentes) !== JSON.stringify(currentFuentes)) {
      await prisma.activoFuenteUsuario.deleteMany({
        where: { activoId: activo.id },
      });

      if (normalizedFuentes.length > 0) {
        await prisma.activoFuenteUsuario.createMany({
          data: normalizedFuentes.map((nombre, index) => ({
            activoId: activo.id,
            nombre,
            orden: index + 1,
          })),
        });
      }

      updatedFuentes += 1;
    }
  }

  console.log(
    `Normalizacion completada. Activos actualizados: ${updatedActivos}. Fuentes actualizadas: ${updatedFuentes}.`,
  );
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

function hasNormalizedChanges(
  activo: Awaited<ReturnType<typeof prisma.activoInformacion.findFirstOrThrow>>,
  normalized: Record<string, string | null>,
) {
  return Object.entries(normalized).some(([key, value]) => {
    const currentValue = activo[key as keyof typeof activo];
    return currentValue !== value;
  });
}
