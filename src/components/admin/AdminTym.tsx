"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminAvatar } from "./AdminAvatar";
import {
  AdminAddMemberDrawer,
  type NewMemberPayload,
} from "./AdminAddMemberDrawer";
import { AdminDismissButton } from "./AdminDismissButton";
import { AdminSelect } from "./AdminSelect";
import {
  AdminSkeletonMemberList,
  AdminSkeletonTableRows,
} from "./AdminSkeleton";
import { useAdminUser } from "./AdminUserProvider";
import { IconAddMember, IconCancel } from "./icons";
import {
  ADMIN_ROLE_LABELS,
  ADMIN_ROLE_TOOLTIPS,
  ASSIGNABLE_ROLES,
  type AdminRole,
} from "@/lib/auth";

type TeamRole = AdminRole;

type TeamMember = {
  id: string;
  name: string;
  username: string;
  role: TeamRole;
  avatarUrl?: string | null;
  joinedAt: string;
};

const TOAST_MS = 3400;
const DRAWER_ANIMATION_MS = 220;

const ROLE_OPTIONS = ASSIGNABLE_ROLES.map((role) => ({
  value: role,
  label: ADMIN_ROLE_LABELS[role],
  title: ADMIN_ROLE_TOOLTIPS[role],
}));

function YouBadge() {
  return <span className="admin-you-badge">Vy</span>;
}

function AdminMemberRemoveConfirm({
  memberName,
  onCancel,
  onConfirm,
}: {
  memberName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div
      className="admin-confirm-root"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        className="admin-confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-member-remove-title"
        aria-describedby="admin-member-remove-desc"
      >
        <h2 id="admin-member-remove-title">Odebrat člena</h2>
        <p id="admin-member-remove-desc">
          Opravdu si přejete odebrat člena <strong>{memberName}</strong>? Tuto
          akci nelze vrátit zpět.
        </p>
        <div className="admin-confirm-actions">
          <button type="button" className="admin-outline-btn" onClick={onCancel}>
            <IconCancel className="admin-page-head-btn-icon" />
            <span className="admin-page-head-btn-label">Zrušit</span>
          </button>
          <button
            type="button"
            className="admin-primary-btn admin-confirm-danger"
            onClick={onConfirm}
          >
            Odebrat
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminMemberDetailDrawer({
  member,
  isSelf,
  canManageRoles,
  onClose,
  onRequestRemove,
  onRoleChange,
  confirmOpen = false,
}: {
  member: TeamMember;
  isSelf: boolean;
  canManageRoles: boolean;
  onClose: () => void;
  onRequestRemove: () => void;
  onRoleChange: (role: Exclude<AdminRole, "owner" | "developer">) => Promise<void>;
  confirmOpen?: boolean;
}) {
  const [isClosing, setIsClosing] = useState(false);
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const canRemove =
    member.role !== "owner" &&
    member.role !== "developer" &&
    !isSelf;
  const canEditRole =
    canManageRoles &&
    member.role !== "owner" &&
    member.role !== "developer" &&
    !isSelf;

  const requestClose = useCallback(() => {
    setIsClosing(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !confirmOpen) requestClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [confirmOpen, requestClose]);

  useEffect(() => {
    if (!isClosing) return;

    const timer = window.setTimeout(onClose, DRAWER_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [isClosing, onClose]);

  async function handleRoleChange(value: string) {
    if (value === member.role) return;
    setRoleError(null);
    setRoleSaving(true);
    try {
      await onRoleChange(value as Exclude<AdminRole, "owner" | "developer">);
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : "Roli se nepodařilo změnit.");
    } finally {
      setRoleSaving(false);
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
        aria-label="Zavřít detail člena"
        onClick={requestClose}
      />

      <aside
        className={
          isClosing
            ? "admin-voucher-drawer admin-member-drawer is-closing"
            : "admin-voucher-drawer admin-member-drawer"
        }
        role="dialog"
        aria-modal="true"
        aria-label={`Detail člena ${member.name}`}
      >
        <div className="admin-voucher-drawer-head">
          <p className="admin-voucher-drawer-kicker">Člen týmu</p>
          <AdminDismissButton label="Zavřít detail člena" onClick={requestClose} />
        </div>

        <div className="admin-voucher-drawer-body">
          <div className="admin-member-detail-head">
            <AdminAvatar
              src={member.avatarUrl}
              name={member.name}
              className="admin-member-avatar is-lg"
            />
            <div>
              <h2>
                {member.name}
                {isSelf ? <YouBadge /> : null}
              </h2>
              <span className={`admin-role-pill is-${member.role}`}>
                {ADMIN_ROLE_LABELS[member.role]}
              </span>
            </div>
          </div>

          <dl className="admin-voucher-drawer-fields">
            <div>
              <dt>Přihlašovací jméno</dt>
              <dd>{member.username}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{ADMIN_ROLE_LABELS[member.role]}</dd>
            </div>
            <div>
              <dt>Přidán</dt>
              <dd>{member.joinedAt}</dd>
            </div>
          </dl>

          {canEditRole ? (
            <div className="admin-member-role-edit">
              <div className="admin-field">
                <span>Změnit roli</span>
                <AdminSelect
                  ariaLabel="Změnit roli člena"
                  value={member.role === "owner" ? "admin" : member.role}
                  options={ROLE_OPTIONS}
                  onChange={(value) => {
                    void handleRoleChange(value);
                  }}
                />
              </div>
              {roleSaving ? (
                <p className="admin-member-role-hint">Ukládám roli…</p>
              ) : null}
              {roleError ? <p className="admin-drawer-error">{roleError}</p> : null}
            </div>
          ) : null}
        </div>

        {canRemove ? (
          <div className="admin-voucher-drawer-footer">
            <button
              type="button"
              className="admin-outline-btn admin-member-remove-btn"
              onClick={onRequestRemove}
            >
              <svg
                className="admin-member-remove-icon"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path
                  d="M19.5 5.5L18.8803 15.5251C18.7219 18.0864 18.6428 19.3671 18.0008 20.2879C17.6833 20.7431 17.2747 21.1273 16.8007 21.416C15.8421 22 14.559 22 11.9927 22C9.42312 22 8.1383 22 7.17905 21.4149C6.7048 21.1257 6.296 20.7408 5.97868 20.2848C5.33688 19.3626 5.25945 18.0801 5.10461 15.5152L4.5 5.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M3 5.5H21M16.0557 5.5L15.3731 4.09173C14.9196 3.15626 14.6928 2.68852 14.3017 2.39681C14.215 2.3321 14.1231 2.27454 14.027 2.2247C13.5939 2 13.0741 2 12.0345 2C10.9688 2 10.436 2 9.99568 2.23412C9.8981 2.28601 9.80498 2.3459 9.71729 2.41317C9.32164 2.7167 9.10063 3.20155 8.65861 4.17126L8.05292 5.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M9.5 16.5L9.5 10.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M14.5 16.5L14.5 10.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span className="admin-page-head-btn-label">Odebrat člena</span>
            </button>
          </div>
        ) : null}
      </aside>
    </>
  );
}

export function AdminTym() {
  const router = useRouter();
  const { user, loading: userLoading, canManageTeam } = useAdminUser();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastLeaving, setToastLeaving] = useState(false);
  const [toastMessage, setToastMessage] = useState({
    title: "Člen přidán",
    detail: "Účet byl úspěšně vytvořen.",
  });

  const memberCount = useMemo(() => members.length, [members]);
  const activeMember =
    members.find((member) => member.id === activeMemberId) ?? null;

  useEffect(() => {
    if (userLoading) return;
    if (!canManageTeam) {
      router.replace("/admin/prehled");
    }
  }, [canManageTeam, router, userLoading]);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const response = await fetch("/api/team");
      const data = (await response.json().catch(() => null)) as {
        members?: TeamMember[];
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(data?.error || "Nepodařilo se načíst tým.");
      }

      setMembers(data?.members ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Nepodařilo se načíst tým.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canManageTeam) return;
    void loadMembers();
  }, [canManageTeam, loadMembers]);

  useEffect(() => {
    if (!toastVisible) return;

    const leaveTimer = window.setTimeout(() => setToastLeaving(true), TOAST_MS - 280);
    const hideTimer = window.setTimeout(() => {
      setToastVisible(false);
      setToastLeaving(false);
    }, TOAST_MS);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(hideTimer);
    };
  }, [toastVisible]);

  function showToast(title: string, detail: string) {
    setToastMessage({ title, detail });
    setToastLeaving(false);
    setToastVisible(true);
  }

  async function handleMemberAdded({
    name,
    username,
    password,
    role,
  }: NewMemberPayload) {
    const response = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, password, role }),
    });

    const data = (await response.json().catch(() => null)) as {
      member?: TeamMember;
      error?: string;
    } | null;

    if (!response.ok || !data?.member) {
      throw new Error(data?.error || "Člena se nepodařilo přidat.");
    }

    await loadMembers();
    showToast(
      "Člen přidán",
      `${data.member.name} se teď může přihlásit jménem „${data.member.username}“.`,
    );
  }

  async function handleRoleChange(
    role: Exclude<AdminRole, "owner" | "developer">,
  ) {
    if (!activeMember) return;

    const response = await fetch(`/api/team/${activeMember.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });

    const data = (await response.json().catch(() => null)) as {
      member?: TeamMember;
      error?: string;
    } | null;

    if (!response.ok || !data?.member) {
      throw new Error(data?.error || "Roli se nepodařilo změnit.");
    }

    setMembers((prev) =>
      prev.map((member) =>
        member.id === data.member!.id ? data.member! : member,
      ),
    );
    showToast(
      "Role změněna",
      `${data.member.name} je teď ${ADMIN_ROLE_LABELS[data.member.role]}.`,
    );
  }

  async function handleConfirmRemove() {
    if (!activeMember) return;

    const response = await fetch(`/api/team/${activeMember.id}`, {
      method: "DELETE",
    });

    const data = (await response.json().catch(() => null)) as {
      removedName?: string;
      error?: string;
    } | null;

    if (!response.ok) {
      showToast("Odebrání selhalo", data?.error || "Člena se nepodařilo odebrat.");
      return;
    }

    const removedName = data?.removedName || activeMember.name;
    setMembers((prev) => prev.filter((member) => member.id !== activeMember.id));
    setRemoveConfirmOpen(false);
    setActiveMemberId(null);
    showToast("Člen odebrán", `${removedName} už nemá přístup do administrace.`);
  }

  if (!canManageTeam) {
    return null;
  }

  return (
    <div className="admin-tym">
      <div className="admin-page-head">
        <div>
          <h1>Tým</h1>
          <p>
            Správa uživatelů s přístupem do administrace.
            {loading ? " Načítám…" : ` Členů: ${memberCount}.`}
          </p>
        </div>
        <div className="admin-page-head-actions">
          <button
            type="button"
            className="admin-primary-btn admin-page-head-primary"
            onClick={() => setAddOpen(true)}
          >
            <IconAddMember className="admin-page-head-btn-icon" />
            <span className="admin-page-head-btn-label">Přidat člena</span>
          </button>
        </div>
      </div>

      <section className="admin-panel">
        {loadError ? <p className="admin-inline-error">{loadError}</p> : null}

        <div className="admin-table-wrap admin-tym-table">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Uživatel</th>
                <th>Přihlašovací jméno</th>
                <th>Role</th>
                <th>Přidán</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminSkeletonTableRows rows={4} cols={4} />
              ) : (
                members.map((member) => {
                  const isSelf = Boolean(user.id) && member.id === user.id;

                  return (
                    <tr
                      key={member.id}
                      className={
                        activeMemberId === member.id
                          ? "is-clickable is-selected"
                          : "is-clickable"
                      }
                      onClick={() => setActiveMemberId(member.id)}
                    >
                      <td>
                        <div className="admin-member-cell">
                          <AdminAvatar
                            src={member.avatarUrl}
                            name={member.name}
                          />
                          <div className="admin-member-cell-copy">
                            <strong>{member.name}</strong>
                            {isSelf ? <YouBadge /> : null}
                          </div>
                        </div>
                      </td>
                      <td>{member.username}</td>
                      <td>
                        <span className={`admin-role-pill is-${member.role}`}>
                          {ADMIN_ROLE_LABELS[member.role]}
                        </span>
                      </td>
                      <td>{member.joinedAt}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {loading ? (
          <AdminSkeletonMemberList rows={4} />
        ) : (
          <ul className="admin-member-list">
            {members.map((member) => {
              const isSelf = Boolean(user.id) && member.id === user.id;

              return (
                <li key={member.id}>
                  <button
                    type="button"
                    className="admin-member-list-item"
                    onClick={() => setActiveMemberId(member.id)}
                  >
                    <AdminAvatar src={member.avatarUrl} name={member.name} />
                    <span className="admin-member-list-copy">
                      <strong>{member.name}</strong>
                      {isSelf ? <YouBadge /> : null}
                    </span>
                    <span className={`admin-role-pill is-${member.role}`}>
                      {ADMIN_ROLE_LABELS[member.role]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {addOpen ? (
        <AdminAddMemberDrawer
          onClose={() => setAddOpen(false)}
          onMemberAdded={handleMemberAdded}
        />
      ) : null}

      {activeMember ? (
        <AdminMemberDetailDrawer
          member={activeMember}
          isSelf={Boolean(user.id) && activeMember.id === user.id}
          canManageRoles={canManageTeam}
          confirmOpen={removeConfirmOpen}
          onClose={() => {
            setRemoveConfirmOpen(false);
            setActiveMemberId(null);
          }}
          onRequestRemove={() => setRemoveConfirmOpen(true)}
          onRoleChange={handleRoleChange}
        />
      ) : null}

      {activeMember && removeConfirmOpen ? (
        <AdminMemberRemoveConfirm
          memberName={activeMember.name}
          onCancel={() => setRemoveConfirmOpen(false)}
          onConfirm={() => {
            void handleConfirmRemove();
          }}
        />
      ) : null}

      {toastVisible ? (
        <div
          className={toastLeaving ? "admin-toast is-leaving" : "admin-toast"}
          role="status"
          aria-live="polite"
        >
          <span className="admin-toast-check" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3.2 8.2 6.4 11.4 12.8 4.6"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="admin-toast-copy">
            <strong>{toastMessage.title}</strong>
            <span>{toastMessage.detail}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
