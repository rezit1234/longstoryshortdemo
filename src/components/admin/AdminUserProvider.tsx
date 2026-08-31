"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ADMIN_ROLE_LABELS,
  canManageTeam,
  isValidPassword,
  MIN_PASSWORD_LENGTH,
  type AdminRole,
} from "@/lib/auth";

export type AdminUserRole = AdminRole;

export type AdminUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: AdminUserRole;
  roleLabel: string;
  avatarUrl: string | null;
};

export type AdminUserUpdateResult =
  | { ok: true }
  | { ok: false; message: string };

type AdminUserContextValue = {
  user: AdminUser;
  loading: boolean;
  canManageTeam: boolean;
  updateName: (name: string) => Promise<AdminUserUpdateResult>;
  updateUsername: (
    username: string,
    password: string,
  ) => Promise<AdminUserUpdateResult>;
  updatePassword: (
    oldPassword: string,
    newPassword: string,
  ) => Promise<AdminUserUpdateResult>;
  updateAvatar: (file: File) => Promise<AdminUserUpdateResult>;
  resetAvatar: () => Promise<AdminUserUpdateResult>;
};

const FALLBACK_USER: AdminUser = {
  id: "",
  name: "…",
  username: "…",
  email: "",
  role: "staff",
  roleLabel: ADMIN_ROLE_LABELS.staff,
  avatarUrl: null,
};

const AdminUserContext = createContext<AdminUserContextValue | null>(null);

function mapUser(data: {
  id?: string;
  name: string;
  username: string;
  email: string;
  role: AdminRole;
  roleLabel: string;
  avatarUrl?: string | null;
}): AdminUser {
  return {
    id: data.id ?? "",
    name: data.name,
    username: data.username,
    email: data.email,
    role: data.role,
    roleLabel: data.roleLabel,
    avatarUrl: data.avatarUrl ?? null,
  };
}

async function patchMe(
  body: Record<string, string>,
): Promise<{ ok: true; user: AdminUser } | { ok: false; message: string }> {
  const response = await fetch("/api/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => null)) as
    | (AdminUser & { error?: string })
    | { error?: string }
    | null;

  if (!response.ok) {
    return {
      ok: false,
      message: data?.error || "Změnu se nepodařilo uložit.",
    };
  }

  if (!data || !("name" in data) || !data.name) {
    return { ok: false, message: "Neplatná odpověď serveru." };
  }

  return {
    ok: true,
    user: mapUser(data as AdminUser),
  };
}

export function AdminUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser>(FALLBACK_USER);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      try {
        const response = await fetch("/api/me");
        if (!response.ok) return;
        const data = (await response.json()) as AdminUser;
        if (cancelled) return;
        setUser(mapUser(data));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateName = useCallback(async (name: string): Promise<AdminUserUpdateResult> => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { ok: false, message: "Jméno nemůže být prázdné." };
    }

    const result = await patchMe({ action: "name", name: trimmed });
    if (!result.ok) return result;

    setUser(result.user);
    return { ok: true };
  }, []);

  const updateUsername = useCallback(
    async (
      username: string,
      currentPassword: string,
    ): Promise<AdminUserUpdateResult> => {
      const trimmed = username.trim();
      if (!trimmed) {
        return { ok: false, message: "Přihlašovací jméno nemůže být prázdné." };
      }

      if (!currentPassword.trim()) {
        return {
          ok: false,
          message: "Pro změnu přihlašovacího jména zadejte heslo.",
        };
      }

      const result = await patchMe({
        action: "username",
        username: trimmed,
        password: currentPassword,
      });
      if (!result.ok) return result;

      setUser(result.user);
      return { ok: true };
    },
    [],
  );

  const updatePassword = useCallback(
    async (
      oldPassword: string,
      newPassword: string,
    ): Promise<AdminUserUpdateResult> => {
      if (!oldPassword.trim()) {
        return { ok: false, message: "Zadejte současné heslo." };
      }

      if (!isValidPassword(newPassword)) {
        return {
          ok: false,
          message: `Nové heslo musí mít alespoň ${MIN_PASSWORD_LENGTH} znaky.`,
        };
      }

      const result = await patchMe({
        action: "password",
        oldPassword,
        newPassword,
      });
      if (!result.ok) return result;

      return { ok: true };
    },
    [],
  );

  const updateAvatar = useCallback(async (file: File): Promise<AdminUserUpdateResult> => {
    const form = new FormData();
    form.append("file", file);

    const response = await fetch("/api/me/avatar", {
      method: "POST",
      body: form,
    });

    const data = (await response.json().catch(() => null)) as
      | (AdminUser & { error?: string })
      | { error?: string }
      | null;

    if (!response.ok) {
      return {
        ok: false,
        message: data?.error || "Profilovku se nepodařilo nahrát.",
      };
    }

    if (!data || !("name" in data) || !data.name) {
      return { ok: false, message: "Neplatná odpověď serveru." };
    }

    setUser(mapUser(data as AdminUser));
    return { ok: true };
  }, []);

  const resetAvatar = useCallback(async (): Promise<AdminUserUpdateResult> => {
    const response = await fetch("/api/me/avatar", { method: "DELETE" });
    const data = (await response.json().catch(() => null)) as
      | (AdminUser & { error?: string })
      | { error?: string }
      | null;

    if (!response.ok) {
      return {
        ok: false,
        message: data?.error || "Výchozí profilovku se nepodařilo nastavit.",
      };
    }

    if (!data || !("name" in data) || !data.name) {
      return { ok: false, message: "Neplatná odpověď serveru." };
    }

    setUser(mapUser(data as AdminUser));
    return { ok: true };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      canManageTeam: canManageTeam(user.role),
      updateName,
      updateUsername,
      updatePassword,
      updateAvatar,
      resetAvatar,
    }),
    [
      user,
      loading,
      updateName,
      updateUsername,
      updatePassword,
      updateAvatar,
      resetAvatar,
    ],
  );

  return (
    <AdminUserContext.Provider value={value}>{children}</AdminUserContext.Provider>
  );
}

export function useAdminUser() {
  const context = useContext(AdminUserContext);
  if (!context) {
    throw new Error("useAdminUser must be used within AdminUserProvider");
  }
  return context;
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
