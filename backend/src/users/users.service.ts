import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma, RoleCode } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../auth/authenticated-user.interface";
import { AuthorizationScopeService } from "../auth/authorization-scope.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

const DEPENDENCY_SCOPED_ROLES = new Set<RoleCode>([
  RoleCode.OPERADOR,
  RoleCode.EDITOR_OPERATIVO,
  RoleCode.RESPONSABLE_DEPENDENCIA,
  RoleCode.RESPONSABLE_SUBDIRECCION,
]);

const TECHNICAL_ADMIN_ROLES = new Set<RoleCode>([
  RoleCode.ADMIN,
  RoleCode.ADMIN_TECNICO,
]);

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly authz: AuthorizationScopeService,
  ) {}

  async findAll(actor: AuthenticatedUser) {
    this.authz.assertCanAdministerUsers(actor);

    const data = await this.prisma.user.findMany({
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
      include: {
        dependencia: true,
        subdireccion: true,
      },
    });

    return { data: data.map(toPublicUser) };
  }

  async findOne(id: number, actor: AuthenticatedUser) {
    this.authz.assertCanAdministerUsers(actor);

    const data = await this.prisma.user.findUnique({
      where: { id },
      include: {
        dependencia: true,
        subdireccion: true,
      },
    });

    if (!data) {
      throw new NotFoundException("Usuario no encontrado");
    }

    return { data: toPublicUser(data) };
  }

  async create(dto: CreateUserDto, actor: AuthenticatedUser) {
    this.authz.assertCanAdministerUsers(actor);
    await this.ensureUniqueIdentity(dto.username, dto.email);
    await this.assertUserScope(dto.role, dto.dependenciaId, dto.subdireccionId);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const data = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          nombre: dto.nombre.trim(),
          email: dto.email.trim().toLowerCase(),
          username: dto.username.trim(),
          passwordHash,
          role: dto.role,
          dependenciaId: dto.dependenciaId ?? null,
          subdireccionId: dto.subdireccionId ?? null,
          activo: dto.activo ?? true,
        },
        include: {
          dependencia: true,
          subdireccion: true,
        },
      });

      await this.audit.log(tx, {
        modulo: "usuarios",
        entidad: "User",
        entidadId: created.id,
        accion: "CREATE",
        actor: actor.username,
        actorRole: actor.role,
        descripcion: "Creacion de usuario y asignacion de rol",
        afterData: toPublicUser(created),
      });

      return created;
    });

    return { data: toPublicUser(data) };
  }

  async update(id: number, dto: UpdateUserDto, actor: AuthenticatedUser) {
    this.authz.assertCanAdministerUsers(actor);
    const current = await this.prisma.user.findUnique({
      where: { id },
      include: {
        dependencia: true,
        subdireccion: true,
      },
    });

    if (!current) {
      throw new NotFoundException("Usuario no encontrado");
    }

    const nextRole = dto.role ?? current.role;
    const nextDependenciaId =
      dto.dependenciaId !== undefined ? dto.dependenciaId : current.dependenciaId;
    const nextSubdireccionId =
      dto.subdireccionId !== undefined ? dto.subdireccionId : current.subdireccionId;

    this.assertSafeSelfUpdate(current.id, dto, nextRole, actor);
    await this.ensureUniqueIdentity(
      dto.username ?? current.username,
      dto.email ?? current.email,
      id,
    );
    await this.assertUserScope(nextRole, nextDependenciaId, nextSubdireccionId);

    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 10) : null;
    const updateData: Prisma.UserUncheckedUpdateInput = {
      ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
      ...(dto.email !== undefined ? { email: dto.email.trim().toLowerCase() } : {}),
      ...(dto.username !== undefined ? { username: dto.username.trim() } : {}),
      ...(passwordHash ? { passwordHash } : {}),
      ...(dto.role !== undefined ? { role: dto.role } : {}),
      ...(dto.dependenciaId !== undefined
        ? { dependenciaId: dto.dependenciaId ?? null }
        : {}),
      ...(dto.subdireccionId !== undefined
        ? { subdireccionId: dto.subdireccionId ?? null }
        : {}),
      ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
    };

    const data = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: updateData,
        include: {
          dependencia: true,
          subdireccion: true,
        },
      });

      await this.audit.log(tx, {
        modulo: "usuarios",
        entidad: "User",
        entidadId: id,
        accion: "UPDATE",
        actor: actor.username,
        actorRole: actor.role,
        descripcion: "Actualizacion de usuario, rol o estado",
        beforeData: toPublicUser(current),
        afterData: toPublicUser(updated),
      });

      return updated;
    });

    return { data: toPublicUser(data) };
  }

  private async assertUserScope(
    role: RoleCode,
    dependenciaId?: number | null,
    subdireccionId?: number | null,
  ) {
    if (DEPENDENCY_SCOPED_ROLES.has(role) && !dependenciaId) {
      throw new UnprocessableEntityException(
        "El rol seleccionado requiere una dependencia asignada.",
      );
    }

    if (dependenciaId) {
      const dependencia = await this.prisma.orgDependencia.findUnique({
        where: { id: dependenciaId },
        select: { id: true, activo: true },
      });

      if (!dependencia) {
        throw new UnprocessableEntityException("La dependencia asignada no existe.");
      }
    }

    if (subdireccionId) {
      const subdireccion = await this.prisma.orgSubdireccion.findUnique({
        where: { id: subdireccionId },
        select: { id: true, dependenciaId: true, activo: true },
      });

      if (!subdireccion) {
        throw new UnprocessableEntityException(
          "La dependencia ejecutora asignada no existe.",
        );
      }

      if (!dependenciaId || subdireccion.dependenciaId !== dependenciaId) {
        throw new UnprocessableEntityException(
          "La dependencia ejecutora debe pertenecer a la dependencia asignada.",
        );
      }
    }
  }

  private async ensureUniqueIdentity(
    username: string,
    email: string,
    currentId?: number,
  ) {
    const existing = await this.prisma.user.findFirst({
      where: {
        ...(currentId ? { id: { not: currentId } } : {}),
        OR: [
          { username: username.trim() },
          { email: email.trim().toLowerCase() },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        "Ya existe un usuario con el mismo nombre de usuario o correo.",
      );
    }
  }

  private assertSafeSelfUpdate(
    userId: number,
    dto: UpdateUserDto,
    nextRole: RoleCode,
    actor: AuthenticatedUser,
  ) {
    if (actor.sub !== userId) {
      return;
    }

    if (dto.activo === false) {
      throw new ConflictException("No puede desactivar su propio usuario.");
    }

    if (!TECHNICAL_ADMIN_ROLES.has(nextRole)) {
      throw new ConflictException(
        "No puede remover su propio rol de administracion tecnica.",
      );
    }
  }
}

function toPublicUser<
  T extends {
    id: number;
    nombre: string;
    email: string;
    username: string;
    role: RoleCode;
    activo: boolean;
    dependenciaId: number | null;
    subdireccionId: number | null;
    createdAt: Date;
    updatedAt: Date;
    dependencia?: { id: number; nombre: string; sigla: string | null } | null;
    subdireccion?: { id: number; nombre: string; sigla: string | null } | null;
  },
>(user: T) {
  return {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    username: user.username,
    role: user.role,
    activo: user.activo,
    dependenciaId: user.dependenciaId,
    subdireccionId: user.subdireccionId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    dependencia: user.dependencia
      ? {
          id: user.dependencia.id,
          nombre: user.dependencia.nombre,
          sigla: user.dependencia.sigla,
        }
      : null,
    subdireccion: user.subdireccion
      ? {
          id: user.subdireccion.id,
          nombre: user.subdireccion.nombre,
          sigla: user.subdireccion.sigla,
        }
      : null,
  };
}
