"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ADMIN_ROLE_LABELS,
  ADMIN_ROLE_TOOLTIPS,
  ASSIGNABLE_ROLES,
  type AdminRole,
} from "@/lib/auth";
import { AdminDismissButton } from "./AdminDismissButton";
import { AdminSelect } from "./AdminSelect";
import { IconAddMember, IconCancel } from "./icons";

const DRAWER_ANIMATION_MS = 220;

export type MemberRole = Exclude<AdminRole, "owner" | "developer">;

const ROLE_OPTIONS = ASSIGNABLE_ROLES.map((role) => ({
  value: role,
  label: ADMIN_ROLE_LABELS[role],
  title: ADMIN_ROLE_TOOLTIPS[role],
}));

function RoleHelpTooltip() {
  return (
    <span className="admin-field-tooltip">
      <button
        type="button"
        className="admin-field-tooltip-trigger"
        aria-label="Zobrazit popis rolí"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 2.75C6.89137 2.75 2.75 6.89137 2.75 12C2.75 17.1086 6.89137 21.25 12 21.25C17.1086 21.25 21.25 17.1086 21.25 12C21.25 6.89137 17.1086 2.75 12 2.75ZM1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12ZM12 7.75C11.3787 7.75 10.875 8.25368 10.875 8.875C10.875 9.28921 10.5392 9.625 10.125 9.625C9.71079 9.625 9.375 9.28921 9.375 8.875C9.375 7.42525 10.5503 6.25 12 6.25C13.4497 6.25 14.625 7.42525 14.625 8.875C14.625 9.83834 14.1056 10.6796 13.3353 11.1354C13.1385 11.2518 12.9761 11.3789 12.8703 11.5036C12.7675 11.6246 12.75 11.7036 12.75 11.75V13C12.75 13.4142 12.4142 13.75 12 13.75C11.5858 13.75 11.25 13.4142 11.25 13V11.75C11.25 11.2441 11.4715 10.8336 11.7266 10.533C11.9786 10.236 12.2929 10.0092 12.5715 9.84439C12.9044 9.64739 13.125 9.28655 13.125 8.875C13.125 8.25368 12.6213 7.75 12 7.75ZM12 17C12.5523 17 13 16.5523 13 16C13 15.4477 12.5523 15 12 15C11.4477 15 11 15.4477 11 16C11 16.5523 11.4477 17 12 17Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <span
        className="admin-field-tooltip-bubble admin-role-help-bubble"
        role="tooltip"
      >
        {ASSIGNABLE_ROLES.map((role) => (
          <span key={role} className="admin-role-help-row">
            <strong>{ADMIN_ROLE_LABELS[role]}</strong>
            <span>{ADMIN_ROLE_TOOLTIPS[role]}</span>
          </span>
        ))}
      </span>
    </span>
  );
}

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
            <span className="admin-field-label">
              Role
              <RoleHelpTooltip />
            </span>
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
            <IconCancel className="admin-page-head-btn-icon" />
            <span className="admin-page-head-btn-label">Zrušit</span>
          </button>
          <button
            type="button"
            className="admin-voucher-drawer-cta"
            disabled={!canSubmit}
            onClick={() => {
              void handleSubmit();
            }}
          >
            {submitting ? (
              "Přidávám…"
            ) : (
              <>
                <IconAddMember className="admin-page-head-btn-icon" />
                <span className="admin-voucher-drawer-cta-label">Přidat člena</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
