import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import {
  BookOpenText,
  Boxes,
  Building2,
  ClipboardList,
  Database,
  FileSearch,
  FileText,
  GitBranch,
  History,
  LayoutDashboard,
  Network,
  ScanSearch,
  Server,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  UserCog,
  Users,
} from "lucide-react";

export type AppIconName =
  | "dashboard"
  | "activities"
  | "assets"
  | "mtge"
  | "risks"
  | "eipd"
  | "reports"
  | "audit"
  | "catalogs"
  | "organization"
  | "new"
  | "formalization"
  | "map"
  | "tree"
  | "settings"
  | "impact"
  | "owner"
  | "users"
  | "activity"
  | "asset"
  | "support";

const iconRegistry = {
  dashboard: LayoutDashboard,
  activities: ClipboardList,
  assets: Database,
  mtge: ShieldCheck,
  risks: TriangleAlert,
  eipd: ShieldAlert,
  reports: FileText,
  audit: History,
  catalogs: BookOpenText,
  organization: Building2,
  new: FileSearch,
  formalization: ScanSearch,
  map: Network,
  tree: GitBranch,
  settings: Settings2,
  impact: Boxes,
  owner: UserCog,
  users: Users,
  activity: ClipboardList,
  asset: Server,
  support: Database,
} satisfies Record<AppIconName, ComponentType<LucideProps>>;

type AppIconProps = LucideProps & {
  name: AppIconName;
  strokeWidth?: number;
};

export function AppIcon({ name, ...props }: AppIconProps) {
  const Icon = iconRegistry[name];

  return <Icon aria-hidden="true" {...props} />;
}
