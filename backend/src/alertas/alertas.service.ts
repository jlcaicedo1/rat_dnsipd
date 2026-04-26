import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type AlertaNivel = 'INFO' | 'MEDIA' | 'ALTA' | 'CRITICA';

type AlertaCalculada = {
  tipo: string;
  nivel: AlertaNivel;
  mensaje: string;
  referencia: string;
};

@Injectable()
export class AlertasService {
  constructor(private readonly prisma: PrismaService) {}

  async findByActividadVersion(id: number) {
    const version = await this.prisma.actividadVersion.findUnique({
      where: { id },
      include: {
        actividad: true,
        mtgeEvaluacion: true,
        eipd: true,
        activos: true,
      },
    });

    if (!version) {
      throw new NotFoundException('Version de actividad no encontrada');
    }

    return {
      data: this.buildAlertasForVersion({
        id: version.id,
        referencia: `${version.actividad.codigo} v${version.numeroVersion}`,
        fechaProximaRevision: version.fechaProximaRevision,
        requiereEipd: version.requiereEipd,
        esGranEscala: version.esGranEscala,
        hasMtge: Boolean(version.mtgeEvaluacion),
        hasEipd: Boolean(version.eipd),
        totalActivos: version.activos.length,
      }),
    };
  }

  async findByRat(id: number) {
    const rat = await this.prisma.rat.findUnique({
      where: { id },
      include: {
        actividades: {
          include: {
            versiones: {
              include: {
                actividad: true,
                mtgeEvaluacion: true,
                eipd: true,
                activos: true,
              },
              orderBy: [{ id: 'desc' }],
            },
          },
        },
      },
    });

    if (!rat) {
      throw new NotFoundException('RAT no encontrado');
    }

    const alertas = rat.actividades.flatMap((actividad) =>
      actividad.versiones.map((version) =>
        this.buildAlertasForVersion({
          id: version.id,
          referencia: `${actividad.codigo} v${version.numeroVersion}`,
          fechaProximaRevision: version.fechaProximaRevision,
          requiereEipd: version.requiereEipd,
          esGranEscala: version.esGranEscala,
          hasMtge: Boolean(version.mtgeEvaluacion),
          hasEipd: Boolean(version.eipd),
          totalActivos: version.activos.length,
        }),
      ),
    );

    return {
      data: {
        rat: {
          id: rat.id,
          codigo: rat.codigo,
          nombre: rat.nombre,
        },
        totalAlertas: alertas.reduce((acc, item) => acc + item.length, 0),
        alertas: alertas.flat(),
      },
    };
  }

  private buildAlertasForVersion(input: {
    id: number;
    referencia: string;
    fechaProximaRevision: Date | null;
    requiereEipd: boolean;
    esGranEscala: boolean;
    hasMtge: boolean;
    hasEipd: boolean;
    totalActivos: number;
  }) {
    const alertas: AlertaCalculada[] = [];
    const today = new Date();
    const referenceDate = input.fechaProximaRevision
      ? new Date(input.fechaProximaRevision)
      : null;

    if (!input.hasMtge) {
      alertas.push({
        tipo: 'MTGE_FALTANTE',
        nivel: 'ALTA',
        mensaje: 'La version no tiene evaluacion MTGE calculada.',
        referencia: input.referencia,
      });
    }

    if (!input.hasEipd && input.esGranEscala) {
      alertas.push({
        tipo: 'GRAN_ESCALA_SIN_EIPD',
        nivel: 'CRITICA',
        mensaje: 'La version esta marcada como gran escala y no tiene EIPD.',
        referencia: input.referencia,
      });
    } else if (!input.hasEipd && input.requiereEipd) {
      alertas.push({
        tipo: 'EIPD_REQUERIDA_SIN_REGISTRO',
        nivel: 'ALTA',
        mensaje: 'La version requiere EIPD y no tiene registro asociado.',
        referencia: input.referencia,
      });
    }

    if (input.totalActivos === 0) {
      alertas.push({
        tipo: 'SIN_ACTIVOS_ASOCIADOS',
        nivel: 'MEDIA',
        mensaje: 'La version no tiene activos de informacion asociados.',
        referencia: input.referencia,
      });
    }

    if (referenceDate) {
      const diffDays = Math.ceil(
        (referenceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diffDays < 0) {
        alertas.push({
          tipo: 'REVISION_VENCIDA',
          nivel: 'ALTA',
          mensaje: 'La fecha de proxima revision ya se encuentra vencida.',
          referencia: input.referencia,
        });
      } else if (diffDays <= 30) {
        alertas.push({
          tipo: 'REVISION_PROXIMA',
          nivel: 'INFO',
          mensaje: 'La fecha de proxima revision vence dentro de los proximos 30 dias.',
          referencia: input.referencia,
        });
      }
    }

    return alertas;
  }
}
