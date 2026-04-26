import { ConflictException } from '@nestjs/common';

export const MTGE_METHOD_VERSION = 'MTGE-1.0';
export const MTGE_GRAN_ESCALA_THRESHOLD = 12;

export function ensureActividadVersionEditable(estadoVersion: string) {
  if (!['BORRADOR', 'OBSERVADA', 'SUBSANADA'].includes(estadoVersion)) {
    throw new ConflictException(
      `No se puede modificar la version de actividad en estado ${estadoVersion}`,
    );
  }
}

export function calculateMtgeResult(input: {
  volumenTitulares: number;
  variedadCategorias: number;
  duracionTratamiento: number;
  alcanceGeografico: number;
}) {
  const puntajeTotal =
    input.volumenTitulares +
    input.variedadCategorias +
    input.duracionTratamiento +
    input.alcanceGeografico;

  return {
    puntajeTotal,
    esGranEscala: puntajeTotal >= MTGE_GRAN_ESCALA_THRESHOLD,
  };
}

export function calculateRiskLevel(probabilidad: number, impacto: number) {
  const score = probabilidad * impacto;

  if (score >= 17) {
    return 'CRITICO';
  }

  if (score >= 10) {
    return 'ALTO';
  }

  if (score >= 5) {
    return 'MEDIO';
  }

  return 'BAJO';
}
