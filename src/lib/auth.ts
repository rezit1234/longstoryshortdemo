import type { ShopId } from "@/data/admin-voucher-settings";

/** Synthetic email for username-based Supabase Auth. */
export const AUTH_EMAIL_DOMAIN = "lss.local";

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function usernameToEmail(username: string) {
  return `${normalizeUsername(username)}@${AUTH_EMAIL_DOMAIN}`;
}

export function isValidUsername(username: string) {
  return /^[a-z0-9._-]{2,32}$/.test(normalizeUsername(username));
}

/** App-side minimum. Supabase Auth also enforces >= 6. */
export const MIN_PASSWORD_LENGTH = 6;

export function isValidPassword(password: string) {
  return password.trim().length >= MIN_PASSWORD_LENGTH;
}

export type AdminRole =
  | "developer"
  | "owner"
  | "admin"
  | "reception"
  | "staff_plus"
  | "staff";

export type AdminProfile = {
  id: string;
  username: string;
  full_name: string;
  role: AdminRole;
  created_at: string;
  avatar_url?: string | null;
};

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  developer: "Developer",
  owner: "Vlastník",
  admin: "Admin",
  reception: "Recepce",
  staff_plus: "Obsluha+",
  staff: "Obsluha",
};

/** Stručný popis oprávnění pro UI týmu. */
export const ADMIN_ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  developer: [
    "Interní developerský účet",
    "Stejná práva jako vlastník (včetně správy týmu)",
    "Nezobrazuje se v seznamu týmu",
  ],
  owner: [
    "Úpravy všeho v administraci",
    "Vystavení i uplatnění poukazů (včetně zrušení uplatnění)",
    "Jediná role, která spravuje tým (přidání, role, odebrání)",
  ],
  admin: [
    "Zobrazení celé administrace (obchody, analytika, poukazy)",
    "Bez vystavení poukazu",
    "Bez uplatnění / zrušení uplatnění",
    "Bez vytváření nových položek a úprav nastavení",
    "Bez správy týmu",
  ],
  reception: [
    "Vystavení poukazu",
    "Uplatnění poukazu",
    "Zrušení uplatnění",
  ],
  staff_plus: [
    "Vystavení poukazu",
    "Uplatnění poukazu",
    "Zrušení uplatnění",
    "Výchozí obchod při přidání: Bistro Central",
  ],
  staff: [
    "Uplatnění poukazu",
    "Zrušení uplatnění",
    "Bez vystavení poukazu",
  ],
};

/** Jednořádkový popis role pro tooltip v selectu. */
export const ADMIN_ROLE_TOOLTIPS: Record<AdminRole, string> = {
  developer: "Interní účet nad vlastníkem. Neviditelný v týmu.",
  owner: "Úpravy všeho včetně správy týmu, vystavení i uplatnění poukazů.",
  admin:
    "Prohlížení celé administrace; bez vystavení, uplatnění, úprav nastavení a správy týmu.",
  reception: "Vystavení poukazu, uplatnění a zrušení uplatnění.",
  staff_plus:
    "Vystavení, uplatnění a zrušení uplatnění; výchozí obchod Bistro Central.",
  staff: "Jen uplatnění poukazu a zrušení uplatnění.",
};

export const DEFAULT_AVATAR_SRC = "/lsspfp.webp";

export function resolveAvatarUrl(avatarUrl: string | null | undefined) {
  const trimmed = avatarUrl?.trim();
  return trimmed || DEFAULT_AVATAR_SRC;
}

/** Vlastník nebo skrytý developer — plná práva. */
export function isPrivilegedAdmin(role: AdminRole) {
  return role === "owner" || role === "developer";
}

/** Developerský účet se v týmu vůbec neukazuje. */
export function isHiddenTeamRole(role: AdminRole, username?: string) {
  if (role === "developer") return true;
  if (username && normalizeUsername(username) === "rezit") return true;
  return false;
}

/** Správa týmu — vlastník + developer. */
export function canManageTeam(role: AdminRole) {
  return isPrivilegedAdmin(role);
}

/** Obchody / analytika — vlastník + admin (admin jen ke čtení). */
export function canViewManagement(role: AdminRole) {
  return isPrivilegedAdmin(role) || role === "admin";
}

/** Zápis nastavení poukazů / nových položek — vlastník + developer. */
export function canEditShopSettings(role: AdminRole) {
  return isPrivilegedAdmin(role);
}

export function canCreateVoucher(role: AdminRole) {
  return (
    isPrivilegedAdmin(role) ||
    role === "reception" ||
    role === "staff_plus"
  );
}

export function canRedeemVoucher(role: AdminRole) {
  return (
    isPrivilegedAdmin(role) ||
    role === "reception" ||
    role === "staff_plus" ||
    role === "staff"
  );
}

/** Výchozí obchod u ručního přidání poukazu. */
export function defaultShopIdForRole(role: AdminRole): ShopId {
  if (role === "staff_plus") return "bistrocentral";
  return "lss";
}

const ROLE_PATH_PREFIXES: Record<AdminRole, readonly string[]> = {
  developer: [
    "/admin/prehled",
    "/admin/poukazy",
    "/admin/uplatneni",
    "/admin/obchody",
    "/admin/analytika",
    "/admin/tym",
    "/admin/ucet",
  ],
  owner: [
    "/admin/prehled",
    "/admin/poukazy",
    "/admin/uplatneni",
    "/admin/obchody",
    "/admin/analytika",
    "/admin/tym",
    "/admin/ucet",
  ],
  admin: [
    "/admin/prehled",
    "/admin/poukazy",
    "/admin/uplatneni",
    "/admin/obchody",
    "/admin/analytika",
    "/admin/ucet",
  ],
  reception: ["/admin/poukazy", "/admin/uplatneni", "/admin/ucet"],
  staff_plus: ["/admin/poukazy", "/admin/uplatneni", "/admin/ucet"],
  staff: ["/admin/uplatneni", "/admin/ucet"],
};

export function canAccessAdminPath(role: AdminRole, pathname: string) {
  const prefixes = ROLE_PATH_PREFIXES[role] ?? ROLE_PATH_PREFIXES.staff;
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function defaultAdminPath(role: AdminRole) {
  const prefixes = ROLE_PATH_PREFIXES[role] ?? ROLE_PATH_PREFIXES.staff;
  return prefixes[0] ?? "/admin/ucet";
}

export const ASSIGNABLE_ROLES: Array<
  Exclude<AdminRole, "owner" | "developer">
> = ["admin", "reception", "staff_plus", "staff"];

export function isAssignableRole(
  role: string,
): role is Exclude<AdminRole, "owner" | "developer"> {
  return (ASSIGNABLE_ROLES as string[]).includes(role);
}
