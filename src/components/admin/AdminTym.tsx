"use client";

import { useMemo, useState } from "react";

type TeamRole = "owner" | "admin" | "staff";
type MemberStatus = "active" | "invited";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: MemberStatus;
  joinedAt: string;
};

const ROLE_LABELS: Record<TeamRole, string> = {
  owner: "Vlastník",
  admin: "Admin",
  staff: "Obsluha",
};

const INITIAL_MEMBERS: TeamMember[] = [
  {
    id: "1",
    name: "Long Story Short",
    email: "eatery@longstoryshort.cz",
    role: "owner",
    status: "active",
    joinedAt: "1. 3. 2026",
  },
  {
    id: "2",
    name: "Jana Nováková",
    email: "jana@longstoryshort.cz",
    role: "admin",
    status: "active",
    joinedAt: "12. 3. 2026",
  },
  {
    id: "3",
    name: "Petr Svoboda",
    email: "petr@longstoryshort.cz",
    role: "staff",
    status: "active",
    joinedAt: "4. 4. 2026",
  },
  {
    id: "4",
    name: "Lucie Dvořáková",
    email: "lucie@example.cz",
    role: "staff",
    status: "invited",
    joinedAt: "10. 8. 2026",
  },
];

function createInviteToken() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export function AdminTym() {
  const [members, setMembers] = useState(INITIAL_MEMBERS);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<Exclude<TeamRole, "owner">>("staff");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  const activeCount = useMemo(
    () => members.filter((member) => member.status === "active").length,
    [members],
  );

  function handleCreateInvite() {
    const token = createInviteToken();
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    const link = `${origin}/admin/pozvanka?token=${token}&role=${inviteRole}`;
    setInviteLink(link);
    setInviteOpen(true);
    setCopied(false);

    setMembers((prev) => [
      {
        id: token,
        name: "Čeká na přijetí",
        email: `pozvánka · ${ROLE_LABELS[inviteRole].toLowerCase()}`,
        role: inviteRole,
        status: "invited",
        joinedAt: new Date().toLocaleDateString("cs-CZ"),
      },
      ...prev,
    ]);
  }

  async function handleCopy() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="admin-tym">
      <div className="admin-page-head">
        <div>
          <h1>Tým</h1>
          <p>
            Správa uživatelů s přístupem do administrace. Aktivní členové:{" "}
            {activeCount}.
          </p>
        </div>
        <button type="button" className="admin-primary-btn" onClick={handleCreateInvite}>
          Vytvořit odkaz na pozvánku
        </button>
      </div>

      {inviteOpen ? (
        <section className="admin-panel admin-invite-panel">
          <div className="admin-invite-head">
            <div>
              <h2>Odkaz na pozvánku</h2>
              <p>Pošlete odkaz kolegovi. Po přijetí získá zvolenou roli.</p>
            </div>
            <label className="admin-invite-role">
              <span>Role</span>
              <select
                value={inviteRole}
                onChange={(event) => {
                  const role = event.target.value as Exclude<TeamRole, "owner">;
                  setInviteRole(role);
                  const token = inviteLink.split("token=")[1]?.split("&")[0] ?? createInviteToken();
                  const origin =
                    typeof window === "undefined" ? "" : window.location.origin;
                  setInviteLink(
                    `${origin}/admin/pozvanka?token=${token}&role=${role}`,
                  );
                }}
              >
                <option value="admin">Admin</option>
                <option value="staff">Obsluha</option>
              </select>
            </label>
          </div>

          <div className="admin-invite-row">
            <input type="text" readOnly value={inviteLink} aria-label="Odkaz na pozvánku" />
            <button type="button" className="admin-outline-btn" onClick={handleCopy}>
              {copied ? "Zkopírováno" : "Kopírovat"}
            </button>
            <button
              type="button"
              className="admin-outline-btn"
              onClick={() => setInviteOpen(false)}
            >
              Zavřít
            </button>
          </div>
        </section>
      ) : null}

      <section className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Uživatel</th>
                <th>E-mail</th>
                <th>Role</th>
                <th>Stav</th>
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
                  <td>{member.email}</td>
                  <td>
                    <span className={`admin-role-pill is-${member.role}`}>
                      {ROLE_LABELS[member.role]}
                    </span>
                  </td>
                  <td>
                    <span
                      className={
                        member.status === "active"
                          ? "admin-status is-active"
                          : "admin-status is-cancelled"
                      }
                    >
                      {member.status === "active" ? "Aktivní" : "Pozván"}
                    </span>
                  </td>
                  <td>{member.joinedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
