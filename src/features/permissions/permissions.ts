export const ROLES = [
  "owner",
  "administrator",
  "campaign_manager",
  "sales_representative",
  "viewer",
] as const;

export type WorkspaceRole = (typeof ROLES)[number];

export const PERMISSIONS = [
  "workspace:view",
  "workspace:manage",
  "workspace:delete",
  "workspace:transfer_ownership",
  "team:view",
  "team:invite",
  "team:manage_roles",
  "billing:view",
  "billing:manage",
  "integrations:view",
  "integrations:manage",
  "campaign:view",
  "campaign:create",
  "campaign:update",
  "campaign:approve",
  "campaign:launch",
  "campaign:pause",
  "campaign:kill",
  "lead:view",
  "lead:create",
  "lead:update",
  "lead:delete",
  "lead:export",
  "message:generate",
  "message:edit",
  "message:approve",
  "message:send",
  "inbox:view",
  "inbox:reply",
  "analytics:view",
  "settings:manage",
  "audit:view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const allPermissions = new Set<Permission>(PERMISSIONS);

const rolePermissions: Record<WorkspaceRole, ReadonlySet<Permission>> = {
  owner: allPermissions,
  administrator: new Set(
    PERMISSIONS.filter(
      (permission) =>
        permission !== "workspace:delete" && permission !== "workspace:transfer_ownership",
    ),
  ),
  campaign_manager: new Set([
    "workspace:view",
    "team:view",
    "integrations:view",
    "campaign:view",
    "campaign:create",
    "campaign:update",
    "campaign:approve",
    "campaign:launch",
    "campaign:pause",
    "campaign:kill",
    "lead:view",
    "lead:create",
    "lead:update",
    "lead:delete",
    "lead:export",
    "message:generate",
    "message:edit",
    "message:approve",
    "message:send",
    "inbox:view",
    "inbox:reply",
    "analytics:view",
  ]),
  sales_representative: new Set([
    "workspace:view",
    "campaign:view",
    "lead:view",
    "lead:create",
    "lead:update",
    "message:generate",
    "message:edit",
    "inbox:view",
    "inbox:reply",
    "analytics:view",
  ]),
  viewer: new Set([
    "workspace:view",
    "campaign:view",
    "lead:view",
    "inbox:view",
    "analytics:view",
  ]),
};

export function hasPermission(role: WorkspaceRole, permission: Permission): boolean {
  return rolePermissions[role].has(permission);
}

export function permissionsForRole(role: WorkspaceRole): readonly Permission[] {
  return PERMISSIONS.filter((permission) => hasPermission(role, permission));
}

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "Owner",
  administrator: "Administrator",
  campaign_manager: "Campaign Manager",
  sales_representative: "Sales Representative",
  viewer: "Viewer",
};
