import "server-only";

import { getWorkspaceContext } from "@/features/workspaces/data";
import { hasPermission, type Permission } from "@/features/permissions/permissions";

export async function checkPermission(permission: Permission): Promise<boolean> {
  const context = await getWorkspaceContext();
  return Boolean(context && hasPermission(context.activeWorkspace.role, permission));
}

export async function requirePermission(permission: Permission) {
  const context = await getWorkspaceContext();
  if (!context || !hasPermission(context.activeWorkspace.role, permission)) {
    return null;
  }

  return context;
}
