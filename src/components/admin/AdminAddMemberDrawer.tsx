"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminDismissButton } from "./AdminDismissButton";
import { AdminSelect } from "./AdminSelect";

const DRAWER_ANIMATION_MS = 220;

export type MemberRole = "admin" | "staff";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Obsluha" },
];

export type NewMemberPayload = {
  name: string;
  username: string;
  password: string;
  role: MemberRole;
};

type AdminAddMemberDrawerProps = {
  onClose: () => void;
  onMemberAdded: (payload: NewMemberPayload) => Promise<void> | void;
};

export function AdminAddMemberDrawer({
  onClose,
  onMemberAdded,
}: AdminAddMemberDrawerProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<MemberRole>("staff");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    name.trim().length > 0 &&
    username.trim().length > 0 &&
    password.trim().length > 0 &&
    !submitting;

  const requestClose = useCallback(() => {
    setIsClosing(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [requestClose]);

  useEffect(() => {
    if (!isClosing) return;

    const timer = window.setTimeout(onClose, DRAWER_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [isClosing, onClose]);

  async function handleSubmit() {
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      await onMemberAdded({
        name: name.trim(),
        username: username.trim(),
        password,
        role,
      });
      requestClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Člena se nepodařilo přidat.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={
          isClosing
            ? "admin-voucher-drawer-backdrop is-closing"
            : "admin-voucher-drawer-backdrop"
        }
        aria-label="Zavřít přidání člena"
        onClick={requestClose}
      />

      <aside
        className={
          isClosing
            ? "admin-voucher-drawer admin-add-member-drawer is-closing"
            : "admin-voucher-drawer admin-add-member-drawer"
        }
        role="dialog"
        aria-modal="true"
        aria-label="Přidat člena"
      >
        <div className="admin-voucher-drawer-head">
          <p className="admin-voucher-drawer-kicker">Tým</p>
          <AdminDismissButton label="Zavřít přidání člena" onClick={requestClose} />
        </div>

        <div className="admin-voucher-drawer-body admin-add-member-drawer-body">
          <div className="admin-settings-drawer-intro">
            <h2>Přidat člena</h2>
            <p>Vytvořte účet s přístupem do administrace.</p>
          </div>

          <label className="admin-field">
            <span>Jméno uživatele</span>
            <input
              type="text"
              value={name}
              placeholder="Jan Novák"
              autoComplete="name"
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <label className="admin-field">
            <span>Přihlašovací jméno</span>
            <input
              type="text"
              value={username}
              placeholder="jan.novak"
              autoComplete="username"
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>

          <label className="admin-field">
            <span>Heslo</span>
            <input
              type="password"
              value={password}
              placeholder="••••••••"
              autoComplete="new-password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <div className="admin-field">
            <span>Role</span>
            <AdminSelect
              ariaLabel="Vyberte roli"
              value={role}
              options={ROLE_OPTIONS}
              onChange={(value) => setRole(value as MemberRole)}
            />
          </div>

          {error ? <p className="admin-drawer-error">{error}</p> : null}
        </div>

        <div className="admin-voucher-drawer-footer admin-add-voucher-footer">
          <button type="button" className="admin-outline-btn" onClick={requestClose}>
            Zrušit
          </button>
          <button
            type="button"
            className="admin-voucher-drawer-cta"
            disabled={!canSubmit}
            onClick={() => {
              void handleSubmit();
            }}
          >
            <svg
              className="admin-voucher-drawer-cta-icon"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden
            >
              <path
                d="M7 2v10M2 7h10"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
            </svg>
            {submitting ? "Přidávám…" : "Přidat člena"}
          </button>
        </div>
      </aside>
    </>
  );
}
