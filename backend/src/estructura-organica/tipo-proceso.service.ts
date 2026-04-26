import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TipoProcesoService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const data = await this.prisma.orgTipoProceso.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      include: {
        _count: {
          select: {
            dependencias: true,
          },
        },
      },
    });

    return { data };
  }
}
