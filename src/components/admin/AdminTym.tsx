"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AdminAddMemberDrawer,
  type NewMemberPayload,
} from "./AdminAddMemberDrawer";

type TeamRole = "owner" | "admin" | "staff";

type TeamMember = {
  id: string;
  name: string;
  username: string;
  role: TeamRole;
  joinedAt: string;
};

const ROLE_LABELS: Record<TeamRole, string> = {
  owner: "Vlastník",
  admin: "Admin",
  staff: "Obsluha",
};

const TOAST_MS = 3400;

const INITIAL_MEMBERS: TeamMember[] = [
  {
    id: "1",
    name: "Long Story Short",
    username: "owner",
    role: "owner",
    joinedAt: "1. 3. 2026",
  },
  {
    id: "2",
    name: "Jana Nováková",
    username: "jana",
    role: "admin",
    joinedAt: "12. 3. 2026",
  },
  {
    id: "3",
    name: "Petr Svoboda",
    username: "petr",
    role: "staff",
    joinedAt: "4. 4. 2026",
  },
  {
    id: "4",
    name: "Lucie Dvořáková",
    username: "lucie",
    role: "staff",
    joinedAt: "10. 8. 2026",
  },
];

export function AdminTym() {
  const [members, setMembers] = useState(INITIAL_MEMBERS);
  const [addOpen, setAddOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastLeaving, setToastLeaving] = useState(false);

  const memberCount = useMemo(() => members.length, [members]);

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

  function handleMemberAdded({ name, username, role }: NewMemberPayload) {
    setMembers((prev) => [
      {
        id: `${Date.now()}`,
        name,
        username,
        role,
        joinedAt: new Date().toLocaleDateString("cs-CZ"),
      },
      ...prev,
    ]);
    setToastLeaving(false);
    setToastVisible(true);
  }

  return (
    <div className="admin-tym">
      <div className="admin-page-head">
        <div>
          <h1>Tým</h1>
          <p>
            Správa uživatelů s přístupem do administrace. Členů: {memberCount}.
          </p>
        </div>
        <div className="admin-page-head-actions">
          <button
            type="button"
            className="admin-primary-btn admin-page-head-primary"
            onClick={() => setAddOpen(true)}
          >
            <svg
              className="admin-page-head-btn-icon"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden
            >
              <path
                d="M7 2v10M2 7h10"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
            Přidat člena
          </button>
        </div>
      </div>

      <section className="admin-panel">
        <div className="admin-table-wrap">
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
              {members.map((member) => (
                <tr key={member.id}>
                  <td>
                    <div className="admin-member-cell">
                      <span className="admin-member-avatar" aria-hidden>
                        {member.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      <strong>{member.name}</strong>
                    </div>
                  </td>
                  <td>{member.username}</td>
                  <td>
                    <span className={`admin-role-pill is-${member.role}`}>
                      {ROLE_LABELS[member.role]}
                    </span>
                  </td>
                  <td>{member.joinedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {addOpen ? (
        <AdminAddMemberDrawer
          onClose={() => setAddOpen(false)}
          onMemberAdded={handleMemberAdded}
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
            <strong>Člen přidán</strong>
            <span>Účet byl úspěšně vytvořen.</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
