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

export type AdminRole = "owner" | "admin" | "staff";

export type AdminProfile = {
  id: string;
  username: string;
  full_name: string;
  role: AdminRole;
  created_at: string;
  avatar_url?: string | null;
};

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  owner: "Vlastník",
  admin: "Admin",
  staff: "Obsluha",
};

export const DEFAULT_AVATAR_SRC = "/lsspfp.webp";

export function resolveAvatarUrl(avatarUrl: string | null | undefined) {
  const trimmed = avatarUrl?.trim();
  return trimmed || DEFAULT_AVATAR_SRC;
}

/** Paths staff (obsluha) may open. Everyone can open account settings. */
export const STAFF_ALLOWED_PREFIXES = [
  "/admin/prehled",
  "/admin/poukazy",
  "/admin/uplatneni",
  "/admin/ucet",
] as const;

export function canManageTeam(role: AdminRole) {
  return role === "owner" || role === "admin";
}

export function canAccessAdminPath(role: AdminRole, pathname: string) {
  if (role === "owner" || role === "admin") return true;

  return STAFF_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const ASSIGNABLE_ROLES: Array<Exclude<AdminRole, "owner">> = [
  "admin",
  "staff",
];

