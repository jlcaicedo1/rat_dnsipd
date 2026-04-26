import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubdireccionDto } from './dto/create-subdireccion.dto';
import { UpdateSubdireccionDto } from './dto/update-subdireccion.dto';

type FindSubdireccionesInput = {
  dependenciaId?: number;
  activo?: boolean;
  search?: string;
};

@Injectable()
export class SubdireccionesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: FindSubdireccionesInput) {
    const where: Prisma.OrgSubdireccionWhereInput = {
      ...(filters.dependenciaId ? { dependenciaId: filters.dependenciaId } : {}),
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

    const data = await this.prisma.orgSubdireccion.findMany({
      where,
      orderBy: { nombre: 'asc' },
      include: {
        dependencia: true,
        _count: {
          select: {
            rats: true,
          },
        },
      },
    });

    return { data };
  }

  async findOne(id: number) {
    const data = await this.prisma.orgSubdireccion.findUnique({
      where: { id },
      include: {
        dependencia: true,
      },
    });

    if (!data) {
      throw new NotFoundException('Subdireccion no encontrada');
    }

    return { data };
  }

  async create(dto: CreateSubdireccionDto) {
    await this.ensureDependencia(dto.dependenciaId);

    const createData: Prisma.OrgSubdireccionUncheckedCreateInput = {
      dependenciaId: dto.dependenciaId,
      nombre: dto.nombre.trim(),
      sigla: dto.sigla?.trim(),
      responsable: dto.responsable?.trim(),
      descripcion: dto.descripcion?.trim(),
      activo: dto.activo ?? true,
    };

    const data = await this.prisma.orgSubdireccion.create({
      data: createData,
      include: {
        dependencia: true,
      },
    });

    return { data };
  }

  async update(id: number, dto: UpdateSubdireccionDto) {
    await this.ensureExists(id);

    if (dto.dependenciaId !== undefined) {
      await this.ensureDependencia(dto.dependenciaId);
    }

    const updateData: Prisma.OrgSubdireccionUncheckedUpdateInput = {
      ...(dto.dependenciaId !== undefined
        ? { dependenciaId: dto.dependenciaId }
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

    const data = await this.prisma.orgSubdireccion.update({
      where: { id },
      data: updateData,
      include: {
        dependencia: true,
      },
    });

    return { data };
  }

  async findRats(id: number) {
    await this.ensureExists(id);

    const data = await this.prisma.rat.findMany({
      where: { subdireccionId: id },
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
    const entity = await this.prisma.orgSubdireccion.findUnique({ where: { id } });

    if (!entity) {
      throw new NotFoundException('Subdireccion no encontrada');
    }

    return entity;
  }

  private async ensureDependencia(id: number) {
    const entity = await this.prisma.orgDependencia.findUnique({ where: { id } });

    if (!entity) {
      throw new UnprocessableEntityException('Dependencia no existe');
    }

    return entity;
  }
}
