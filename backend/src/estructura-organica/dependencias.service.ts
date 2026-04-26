import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDependenciaDto } from './dto/create-dependencia.dto';
import { UpdateDependenciaDto } from './dto/update-dependencia.dto';

type FindDependenciasInput = {
  tipoProcesoId?: number;
  activo?: boolean;
  search?: string;
};

@Injectable()
export class DependenciasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: FindDependenciasInput) {
    const where: Prisma.OrgDependenciaWhereInput = {
      ...(filters.tipoProcesoId ? { tipoProcesoId: filters.tipoProcesoId } : {}),
      ...(filters.activo !== undefined ? { activo: filters.activo } : {}),
      ...(filters.search
        ? {
            OR: [
              { nombre: { contains: filters.search, mode: 'insensitive' } },
              { sigla: { contains: filters.search, mode: 'insensitive' } },
              { responsable: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const data = await this.prisma.orgDependencia.findMany({
      where,
      orderBy: { nombre: 'asc' },
      include: {
        tipoProceso: true,
        _count: {
          select: {
            subdirecciones: true,
            rats: true,
          },
        },
      },
    });

    return { data };
  }

  async findOne(id: number) {
    const data = await this.prisma.orgDependencia.findUnique({
      where: { id },
      include: {
        tipoProceso: true,
        subdirecciones: {
          orderBy: { nombre: 'asc' },
        },
      },
    });

    if (!data) {
      throw new NotFoundException('Dependencia no encontrada');
    }

    return { data };
  }

  async create(dto: CreateDependenciaDto) {
    await this.ensureTipoProceso(dto.tipoProcesoId);

    const createData: Prisma.OrgDependenciaUncheckedCreateInput = {
      tipoProcesoId: dto.tipoProcesoId,
      nombre: dto.nombre.trim(),
      sigla: dto.sigla?.trim(),
      responsable: dto.responsable?.trim(),
      descripcion: dto.descripcion?.trim(),
      activo: dto.activo ?? true,
    };

    const data = await this.prisma.orgDependencia.create({
      data: createData,
      include: {
        tipoProceso: true,
      },
    });

    return { data };
  }

  async update(id: number, dto: UpdateDependenciaDto) {
    await this.ensureExists(id);

    if (dto.tipoProcesoId !== undefined) {
      await this.ensureTipoProceso(dto.tipoProcesoId);
    }

    const updateData: Prisma.OrgDependenciaUncheckedUpdateInput = {
      ...(dto.tipoProcesoId !== undefined
        ? { tipoProcesoId: dto.tipoProcesoId }
        : {}),
      ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
      ...(dto.sigla !== undefined ? { sigla: dto.sigla?.trim() || null } : {}),
      ...(dto.responsable !== undefined
        ? { responsable: dto.responsable?.trim() || null }
        : {}),
      ...(dto.descripcion !== undefined
        ? { descripcion: dto.descripcion?.trim() || null }
        : {}),
      ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
    };

    const data = await this.prisma.orgDependencia.update({
      where: { id },
      data: updateData,
      include: {
        tipoProceso: true,
      },
    });

    return { data };
  }

  async findSubdirecciones(id: number) {
    await this.ensureExists(id);

    const data = await this.prisma.orgSubdireccion.findMany({
      where: { dependenciaId: id },
      orderBy: { nombre: 'asc' },
    });

    return { data };
  }

  async findRats(id: number) {
    await this.ensureExists(id);

    const data = await this.prisma.rat.findMany({
      where: { dependenciaId: id },
      orderBy: { nombre: 'asc' },
      include: {
        _count: {
          select: {
            actividades: true,
          },
        },
      },
    });

    return { data };
  }

  private async ensureExists(id: number) {
    const entity = await this.prisma.orgDependencia.findUnique({ where: { id } });

    if (!entity) {
      throw new NotFoundException('Dependencia no encontrada');
    }

    return entity;
  }

  private async ensureTipoProceso(id: number) {
    const entity = await this.prisma.orgTipoProceso.findUnique({ where: { id } });

    if (!entity) {
      throw new UnprocessableEntityException('Tipo de proceso no existe');
    }

    return entity;
  }
}
