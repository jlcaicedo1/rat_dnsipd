export type AppRole =
  | "OPERADOR"
  | "REVISOR"
  | "ADMIN_FUNCIONAL"
  | "ADMIN_TECNICO";

export type AppModuleKey =
  | "dashboard"
  | "activities"
  | "assets"
  | "mtge"
  | "risks"
  | "eipd"
  | "eipd-form"
  | "checklist-dpd"
  | "reports"
  | "audit"
  | "catalogs"
  | "organization"
  | "users"
  | "import-rat";

type ModulePermissionMap = Record<AppModuleKey, boolean>;

type CrudPermissionSet = {
  create: boolean;
  read: boolean;
  update: boolean;
  duplicate: boolean;
  archive: boolean;
  approve: boolean;
};

type FormDocPermissions = {
  create: boolean;
  edit: boolean;
  sendToReview: boolean;
  approve: boolean;
  devolver: boolean;
  close: boolean;
  delete: boolean;
};

type RoleCapabilities = {
  role: AppRole;
  label: string;
  moduleAccess: ModulePermissionMap;
  eipd: {
    view: boolean;
    update: boolean;
    approve: boolean;
  };
  eipdForm: FormDocPermissions;
  checklistDpd: FormDocPermissions;
  assets: CrudPermissionSet & {
    detail: boolean;
  };
  activities: CrudPermissionSet & {
    map: boolean;
    preview: boolean;
  };
  rats: CrudPermissionSet & {
    preview: boolean;
    version: boolean;
    editBase: boolean;
  };
  organization: {
    view: boolean;
    detail: boolean;
    updateStatus: boolean;
    save: boolean;
  };
  catalogs: {
    view: boolean;
    create: boolean;
    update: boolean;
    updateStatus: boolean;
    save: boolean;
    delete: boolean;
  };
  users: {
    view: boolean;
    create: boolean;
    update: boolean;
    updateStatus: boolean;
    save: boolean;
  };
};

const NO_CRUD: CrudPermissionSet = {
  create: false,
  read: true,
  update: false,
  duplicate: false,
  archive: false,
  approve: false,
};

const BASE_MODULES: ModulePermissionMap = {
  dashboard: true,
  activities: true,
  assets: true,
  mtge: true,
  risks: true,
  eipd: true,
  "eipd-form": true,
  "checklist-dpd": true,
  reports: true,
  audit: false,
  catalogs: false,
  organization: false,
  users: false,
  "import-rat": false,
};

const REVIEWER_MODULES: ModulePermissionMap = {
  ...BASE_MODULES,
  organization: true,
  "import-rat": false,
};

const FUNCTIONAL_ADMIN_MODULES: ModulePermissionMap = {
  dashboard: true,
  activities: true,
  assets: true,
  mtge: true,
  risks: true,
  eipd: true,
  "eipd-form": true,
  "checklist-dpd": true,
  reports: true,
  audit: true,
  catalogs: true,
  organization: true,
  users: false,
  "import-rat": true,
};

const TECHNICAL_ADMIN_MODULES: ModulePermissionMap = {
  ...FUNCTIONAL_ADMIN_MODULES,
  users: true,
  "import-rat": false,
};

export function normalizeAppRole(role?: string | null): AppRole {
  const normalized = (role ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

  if (
    normalized === "ADMIN" ||
    normalized === "ADMIN_TECNICO" ||
    (normalized.includes("ADMIN") && normalized.includes("TECNICO"))
  ) {
    return "ADMIN_TECNICO";
  }

  if (normalized === "ADMIN_FUNCIONAL") {
    return "ADMIN_FUNCIONAL";
  }

  if (
    normalized === "REVISOR" ||
    normalized === "APROBADOR_FUNCIONAL" ||
    normalized.includes("REVIS") ||
    normalized.includes("AUDIT") ||
    normalized.includes("DPO") ||
    normalized.includes("PROTECCION") ||
    normalized.includes("SEGURIDAD")
  ) {
    return "REVISOR";
  }

  return "OPERADOR";
}

export function getRoleCapabilities(role?: string | null): RoleCapabilities {
  const normalizedRole = normalizeAppRole(role);

  switch (normalizedRole) {
    case "ADMIN_TECNICO":
      return {
        role: normalizedRole,
        label: "Administrador tecnico",
        moduleAccess: TECHNICAL_ADMIN_MODULES,
        eipd: {
          view: true,
          update: false,
          approve: false,
        },
        eipdForm: { create: false, edit: false, sendToReview: false, approve: false, devolver: false, close: false, delete: true },
        checklistDpd: { create: false, edit: false, sendToReview: false, approve: false, devolver: false, close: false, delete: true },
        assets: {
          ...NO_CRUD,
          detail: true,
        },
        activities: {
          ...NO_CRUD,
          archive: true,
          map: true,
          preview: true,
        },
        rats: {
          ...NO_CRUD,
          archive: true,
          preview: true,
          version: false,
          editBase: false,
        },
        organization: {
          view: true,
          detail: true,
          updateStatus: true,
          save: true,
        },
        catalogs: {
          view: true,
          create: true,
          update: true,
          updateStatus: true,
          save: true,
          delete: true,
        },
        users: {
          view: true,
          create: true,
          update: true,
          updateStatus: true,
          save: true,
        },
      };
    case "ADMIN_FUNCIONAL":
      return {
        role: normalizedRole,
        label: "Administrador funcional",
        moduleAccess: FUNCTIONAL_ADMIN_MODULES,
        eipd: {
          view: true,
          update: false,
          approve: false,
        },
        eipdForm: { create: false, edit: false, sendToReview: false, approve: false, devolver: false, close: false, delete: false },
        checklistDpd: { create: false, edit: false, sendToReview: false, approve: false, devolver: false, close: false, delete: false },
        assets: {
          ...NO_CRUD,
          update: true,
          archive: true,
          detail: true,
        },
        activities: {
          ...NO_CRUD,
          map: true,
          preview: true,
        },
        rats: {
          ...NO_CRUD,
          preview: true,
          version: false,
          editBase: false,
        },
        organization: {
          view: true,
          detail: true,
          updateStatus: true,
          save: true,
        },
        catalogs: {
          view: true,
          create: true,
          update: true,
          updateStatus: true,
          save: true,
          delete: true,
        },
        users: {
          view: false,
          create: false,
          update: false,
          updateStatus: false,
          save: false,
        },
      };
    case "REVISOR":
      return {
        role: normalizedRole,
        label: "Revisor",
        moduleAccess: REVIEWER_MODULES,
        eipd: {
          view: true,
          update: true,
          approve: true,
        },
        eipdForm: { create: false, edit: false, sendToReview: false, approve: true, devolver: true, close: true, delete: false },
        checklistDpd: { create: false, edit: false, sendToReview: false, approve: true, devolver: true, close: true, delete: false },
        assets: {
          ...NO_CRUD,
          update: true,
          archive: true,
          detail: true,
        },
        activities: {
          ...NO_CRUD,
          approve: true,
          archive: true,
          map: true,
          preview: true,
        },
        rats: {
          ...NO_CRUD,
          approve: true,
          preview: true,
          version: false,
          editBase: false,
        },
        organization: {
          view: true,
          detail: true,
          updateStatus: false,
          save: false,
        },
        catalogs: {
          view: false,
          create: false,
          update: false,
          updateStatus: false,
          save: false,
          delete: false,
        },
        users: {
          view: false,
          create: false,
          update: false,
          updateStatus: false,
          save: false,
        },
      };
    default:
      return {
        role: normalizedRole,
        label: "Operador",
        moduleAccess: BASE_MODULES,
        eipd: {
          view: true,
          update: false,
          approve: false,
        },
        eipdForm: { create: true, edit: true, sendToReview: true, approve: false, devolver: false, close: false, delete: true },
        checklistDpd: { create: true, edit: true, sendToReview: true, approve: false, devolver: false, close: false, delete: true },
        assets: {
          create: true,
          read: true,
          update: false,
          duplicate: false,
          archive: false,
          approve: false,
          detail: true,
        },
        activities: {
          create: true,
          read: true,
          update: true,
          duplicate: true,
          archive: false,
          approve: false,
          map: true,
          preview: true,
        },
        rats: {
          create: false,
          read: true,
          update: false,
          duplicate: false,
          archive: false,
          approve: false,
          preview: true,
          version: false,
          editBase: true,
        },
        organization: {
          view: false,
          detail: false,
          updateStatus: false,
          save: false,
        },
        catalogs: {
          view: false,
          create: false,
          update: false,
          updateStatus: false,
          save: false,
          delete: false,
        },
        users: {
          view: false,
          create: false,
          update: false,
          updateStatus: false,
          save: false,
        },
      };
  }
}

export function canAccessModule(
  role: string | null | undefined,
  module: AppModuleKey,
) {
  return getRoleCapabilities(role).moduleAccess[module];
}
