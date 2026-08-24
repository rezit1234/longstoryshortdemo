"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AdminUserRole = "owner" | "admin" | "staff";

export type AdminUser = {
  name: string;
  username: string;
  email: string;
  role: AdminUserRole;
  roleLabel: string;
};

export type AdminUserUpdateResult =
  | { ok: true }
  | { ok: false; message: string };

type AdminUserContextValue = {
  user: AdminUser;
  updateName: (name: string) => AdminUserUpdateResult;
  updateUsername: (username: string, password: string) => AdminUserUpdateResult;
  updatePassword: (
    oldPassword: string,
    newPassword: string,
  ) => AdminUserUpdateResult;
};

const ROLE_LABELS: Record<AdminUserRole, string> = {
  owner: "Vlastník",
  admin: "Admin",
  staff: "Obsluha",
};

const INITIAL_USER: AdminUser = {
  name: "Long Story Short",
  username: "owner",
  email: "eatery@longstoryshort.cz",
  role: "owner",
  roleLabel: ROLE_LABELS.owner,
};

const MOCK_PASSWORD = "heslo123";

const AdminUserContext = createContext<AdminUserContextValue | null>(null);

export function AdminUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser>(INITIAL_USER);
  const [password, setPassword] = useState(MOCK_PASSWORD);

  const updateName = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { ok: false, message: "Jméno nemůže být prázdné." };
    }

    setUser((current) => ({ ...current, name: trimmed }));
    return { ok: true };
  }, []);

  const updateUsername = useCallback(
    (username: string, currentPassword: string) => {
      const trimmed = username.trim();
      if (!trimmed) {
        return { ok: false, message: "Přihlašovací jméno nemůže být prázdné." };
      }

      if (!currentPassword.trim()) {
        return { ok: false, message: "Pro změnu přihlašovacího jména zadejte heslo." };
      }

      if (currentPassword !== password) {
        return { ok: false, message: "Zadané heslo není správné." };
      }

      setUser((current) => ({ ...current, username: trimmed }));
      return { ok: true };
    },
    [password],
  );

  const updatePassword = useCallback(
    (oldPassword: string, newPassword: string) => {
      if (!oldPassword.trim()) {
        return { ok: false, message: "Zadejte současné heslo." };
      }

      if (oldPassword !== password) {
        return { ok: false, message: "Současné heslo není správné." };
      }

      if (newPassword.trim().length < 6) {
        return { ok: false, message: "Nové heslo musí mít alespoň 6 znaků." };
      }

      setPassword(newPassword);
      return { ok: true };
    },
    [password],
  );

  const value = useMemo(
    () => ({
      user,
      updateName,
      updateUsername,
      updatePassword,
    }),
    [user, updateName, updateUsername, updatePassword],
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
