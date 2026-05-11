import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from './authenticated-user.interface';

const TECHNICAL_ADMIN_ROLES = new Set(['ADMIN', 'ADMIN_TECNICO']);
const FUNCTIONAL_ADMIN_ROLES = new Set(['ADMIN_FUNCIONAL']);
const REVIEWER_ROLES = new Set([
  'REVISOR',
  'APROBADOR_FUNCIONAL',
  'REVISOR_PROTECCION_DATOS',
  'REVISOR_SEGURIDAD',
]);
const AUTHOR_ROLES = new Set([
  'OPERADOR',
  'EDITOR_OPERATIVO',
  'RESPONSABLE_SUBDIRECCION',
  'RESPONSABLE_DEPENDENCIA',
]);
const ASSET_MANAGER_ROLES = new Set([
  ...AUTHOR_ROLES,
  ...REVIEWER_ROLES,
]);
const TRANSVERSAL_READ_ROLES = new Set([
  ...TECHNICAL_ADMIN_ROLES,
  ...FUNCTIONAL_ADMIN_ROLES,
  ...REVIEWER_ROLES,
  'AUDITOR',
]);
const CATALOG_ADMIN_ROLES = new Set([
  ...TECHNICAL_ADMIN_ROLES,
  ...FUNCTIONAL_ADMIN_ROLES,
]);
const ORGANIZATION_ADMIN_ROLES = new Set([
  ...TECHNICAL_ADMIN_ROLES,
  ...FUNCTIONAL_ADMIN_ROLES,
]);
const AUDIT_VIEW_ROLES = new Set([
  ...TECHNICAL_ADMIN_ROLES,
  ...FUNCTIONAL_ADMIN_ROLES,
  'AUDITOR',
]);
const ASSESSMENT_MANAGER_ROLES = new Set([
  ...REVIEWER_ROLES,
]);
const SUBDIRECCION_SCOPED_ROLES = new Set([
  'RESPONSABLE_SUBDIRECCION',
]);
const CONTENT_STATE_MANAGER_ROLES = new Set([
  ...REVIEWER_ROLES,
]);
const USER_ADMIN_ROLES = new Set([
  ...TECHNICAL_ADMIN_ROLES,
]);
const WORKFLOW_ADMIN_ROLES = new Set([
  ...TECHNICAL_ADMIN_ROLES,
]);
const FUNCTIONAL_APPROVER_ROLES = new Set([
  ...REVIEWER_ROLES,
]);
const ACTIVITY_AUTHOR_ROLES = new Set([
  ...AUTHOR_ROLES,
]);
const ASSET_AUTHOR_ROLES = new Set([
  'EDITOR_OPERATIVO',
  'RESPONSABLE_SUBDIRECCION',
  'RESPONSABLE_DEPENDENCIA',
  'OPERADOR',
]);

@Injectable()
export class AuthorizationScopeService {
  isGlobal(user?: AuthenticatedUser | null) {
    return Boolean(user && TRANSVERSAL_READ_ROLES.has(user.role));
  }

  ratWhere(user: AuthenticatedUser): Prisma.RatWhereInput {
    if (this.isGlobal(user)) {
      return {};
    }

    const dependenciaId = this.requireDependencia(user);

    return {
      dependenciaId,
      ...this.subdireccionScope(user),
    };
  }

  actividadWhere(
    user: AuthenticatedUser,
  ): Prisma.ActividadTratamientoWhereInput {
    if (this.isGlobal(user)) {
      return {};
    }

    return {
      rat: this.ratWhere(user),
    };
  }

  activoWhere(user: AuthenticatedUser): Prisma.ActivoInformacionWhereInput {
    if (this.isGlobal(user)) {
      return {};
    }

    return {
      dependenciaId: this.requireDependencia(user),
    };
  }

  assertCanUseDependencia(
    user: AuthenticatedUser | undefined,
    dependenciaId: number | null | undefined,
  ) {
    if (!user || this.isGlobal(user)) {
      return;
    }

    const actorDependenciaId = this.requireDependencia(user);

    if (!dependenciaId || dependenciaId !== actorDependenciaId) {
      throw new ForbiddenException(
        'No tiene permisos para operar informacion de otra dependencia.',
      );
    }
  }

  assertCanUseSubdireccion(
    user: AuthenticatedUser | undefined,
    subdireccionId: number | null | undefined,
  ) {
    if (!user || this.isGlobal(user) || !SUBDIRECCION_SCOPED_ROLES.has(user.role)) {
      return;
    }

    if (!user.subdireccionId || subdireccionId !== user.subdireccionId) {
      throw new ForbiddenException(
        'No tiene permisos para operar informacion de otra subdireccion.',
      );
    }
  }

  assertCanAuthorTreatment(user: AuthenticatedUser | undefined) {
    if (!user || !ACTIVITY_AUTHOR_ROLES.has(user.role)) {
      throw new ForbiddenException(
        'El rol no esta autorizado para elaborar o modificar borradores de tratamiento.',
      );
    }
  }

  assertCanApproveTreatment(user: AuthenticatedUser | undefined) {
    if (!user || !FUNCTIONAL_APPROVER_ROLES.has(user.role)) {
      throw new ForbiddenException(
        'El rol no esta autorizado para aprobar u observar registros de tratamiento.',
      );
    }
  }

  assertCanManageAssets(user: AuthenticatedUser | undefined) {
    if (!user || !ASSET_MANAGER_ROLES.has(user.role)) {
      throw new ForbiddenException(
        'El rol no esta autorizado para crear, modificar o dar de baja activos de informacion.',
      );
    }
  }

  assertCanAuthorAssets(user: AuthenticatedUser | undefined) {
    if (!user || !ASSET_AUTHOR_ROLES.has(user.role)) {
      throw new ForbiddenException(
        'El rol no esta autorizado para levantar activos de informacion.',
      );
    }
  }

  assertCanUpdateAssessments(user: AuthenticatedUser | undefined) {
    if (!user || !ASSESSMENT_MANAGER_ROLES.has(user.role)) {
      throw new ForbiddenException(
        'El rol no esta autorizado para actualizar evaluaciones de riesgos o EIPD.',
      );
    }
  }

  assertCanManageContentStates(user: AuthenticatedUser | undefined) {
    if (!user || !CONTENT_STATE_MANAGER_ROLES.has(user.role)) {
      throw new ForbiddenException(
        'El rol no esta autorizado para revisar, observar o cambiar estados de registros.',
      );
    }
  }

  assertCanAdministerCatalogs(user: AuthenticatedUser | undefined) {
    if (!user || !CATALOG_ADMIN_ROLES.has(user.role)) {
      throw new ForbiddenException(
        'El rol no esta autorizado para administrar catalogos del sistema.',
      );
    }
  }

  assertCanAdministerOrganization(user: AuthenticatedUser | undefined) {
    if (!user || !ORGANIZATION_ADMIN_ROLES.has(user.role)) {
      throw new ForbiddenException(
        'El rol no esta autorizado para administrar estructura organica.',
      );
    }
  }

  assertCanViewAudit(user: AuthenticatedUser | undefined) {
    if (!user || !AUDIT_VIEW_ROLES.has(user.role)) {
      throw new ForbiddenException(
        'El rol no esta autorizado para consultar auditoria.',
      );
    }
  }

  assertCanAdministerUsers(user: AuthenticatedUser | undefined) {
    if (!user || !USER_ADMIN_ROLES.has(user.role)) {
      throw new ForbiddenException(
        'Solo administracion tecnica puede administrar usuarios, roles y seguridad.',
      );
    }
  }

  assertCanAdministerWorkflow(user: AuthenticatedUser | undefined) {
    if (!user || !WORKFLOW_ADMIN_ROLES.has(user.role)) {
      throw new ForbiddenException(
        'Solo administracion tecnica puede ejecutar acciones administrativas del flujo.',
      );
    }
  }

  private requireDependencia(user: AuthenticatedUser) {
    if (!user.dependenciaId) {
      throw new ForbiddenException(
        'El usuario no tiene una dependencia asignada para aplicar alcance ABAC.',
      );
    }

    return user.dependenciaId;
  }

  private subdireccionScope(user: AuthenticatedUser) {
    if (!SUBDIRECCION_SCOPED_ROLES.has(user.role)) {
      return {};
    }

    if (!user.subdireccionId) {
      throw new ForbiddenException(
        'El usuario no tiene una subdireccion asignada para aplicar alcance ABAC.',
      );
    }

    return { subdireccionId: user.subdireccionId };
  }
}
