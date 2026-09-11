import type { Role } from "@/types";

// Explicit server-side permission checks. Hiding UI is NOT security.
export const PERMISSIONS: Record<string, Role[]> = {
  "owner.dashboard": ["OWNER"],
  "owner.settings": ["OWNER"],
  "owner.security": ["OWNER"],
  "admin.panel": ["ADMIN", "OWNER"],
  "admin.moderate": ["ADMIN", "OWNER"],
  "user.private": ["USER", "ADMIN", "OWNER"],
};

export function can(role: Role | undefined, permission: string): boolean {
  if (!role) return false;
  return PERMISSIONS[permission]?.includes(role) ?? false;
}

export function isOwner(role?: string): boolean { return role === "OWNER"; }
export function isAdmin(role?: string): boolean { return role === "ADMIN" || role === "OWNER"; }
