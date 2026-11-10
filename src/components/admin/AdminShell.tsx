"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AdminCommandPalette } from "./AdminCommandPalette";
import { AdminUserProvider, useAdminUser } from "./AdminUserProvider";
import { AdminVoucherDrawerProvider } from "./AdminVoucherDrawer";
import { IconSearch, IconTeam } from "./icons";
import {
  canAccessAdminPath,
  canManageTeam,
  canViewManagement,
  defaultAdminPath,
  resolveAvatarUrl,
} from "@/lib/auth";

type NavItem =
  | {
      href: string;
      label: string;
      iconSrc: string;
      requiresManageTeam?: boolean;
      requiresViewManagement?: boolean;
    }
  | {
      href: string;
      label: string;
      icon: typeof IconTeam;
      requiresManageTeam?: boolean;
      requiresViewManagement?: boolean;
    };

const NAV: NavItem[] = [
  { href: "/admin/prehled", label: "Přehled", iconSrc: "/icons/prehled.svg" },
  { href: "/admin/poukazy", label: "Poukazy", iconSrc: "/icons/poukazy.svg" },
  {
    href: "/admin/uplatneni",
    label: "Uplatnění poukazu",
    iconSrc: "/icons/uplatneni.svg",
  },
  {
    href: "/admin/historie-uplatneni",
    label: "Historie uplatnění",
    iconSrc: "/icons/historie-uplatneni.svg",
  },
  {
    href: "/admin/obchody",
    label: "Obchody",
    iconSrc: "/icons/obchod.svg",
    requiresViewManagement: true,
  },
  {
    href: "/admin/analytika",
    label: "Analytika a reporty",
    iconSrc: "/icons/analytika.svg",
    requiresViewManagement: true,
  },
  { href: "/admin/tym", label: "Tým", icon: IconTeam, requiresManageTeam: true },
];

function NavMaskIcon({ src }: { src: string }) {
  return (
    <span
      className="admin-nav-icon"
      style={{
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
      }}
      aria-hidden
    />
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <AdminUserProvider>
      <AdminShellInner>{children}</AdminShellInner>
    </AdminUserProvider>
  );
}

function AdminShellInner({ children }: { children: ReactNode }) {
  const { user, loading: userLoading } = useAdminUser();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [modifierKey, setModifierKey] = useState("Ctrl");
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountCloseTimerRef = useRef<number | null>(null);

  function clearAccountCloseTimer() {
    if (accountCloseTimerRef.current != null) {
      window.clearTimeout(accountCloseTimerRef.current);
      accountCloseTimerRef.current = null;
    }
  }

  function openAccountMenu() {
    clearAccountCloseTimer();
    setAccountOpen(true);
  }

  function scheduleCloseAccountMenu() {
    clearAccountCloseTimer();
    accountCloseTimerRef.current = window.setTimeout(() => {
      setAccountOpen(false);
      accountCloseTimerRef.current = null;
    }, 120);
  }

  const visibleNav = NAV.filter((item) => {
    if (item.requiresManageTeam && !canManageTeam(user.role)) return false;
    if (item.requiresViewManagement && !canViewManagement(user.role)) {
      return false;
    }
    return canAccessAdminPath(user.role, item.href);
  });

  useEffect(() => {
    if (userLoading || !user.id) return;
    if (!canAccessAdminPath(user.role, pathname)) {
      router.replace(defaultAdminPath(user.role));
    }
  }, [pathname, router, user.id, user.role, userLoading]);

  useEffect(() => {
    setMenuOpen(false);
    clearAccountCloseTimer();
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    return () => clearAccountCloseTimer();
  }, []);

  useEffect(() => {
    if (!accountOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountOpen(false);
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountOpen]);

  useEffect(() => {
    setModifierKey(
      /Mac|iPhone|iPad|iPod/i.test(navigator.platform) ? "⌘" : "Ctrl",
    );
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <AdminVoucherDrawerProvider>
    <div className={menuOpen ? "admin-app is-menu-open" : "admin-app"}>
      <button
        type="button"
        className="admin-backdrop"
        aria-label="Zavřít menu"
        onClick={() => setMenuOpen(false)}
      />

      <aside className="admin-sidebar" id="admin-sidebar">
        <div className="admin-sidebar-top">
          <Link href="/admin/prehled" className="admin-brand">
            <Image
              src="/logo.png"
              alt="Long Story Short"
              width={140}
              height={28}
              className="admin-brand-logo"
              priority
            />
          </Link>
          <button
            type="button"
            className="admin-icon-btn admin-menu-close"
            aria-label="Zavřít menu"
            onClick={() => setMenuOpen(false)}
          >
            <span className="admin-menu-close-icon" aria-hidden />
          </button>
        </div>

        <nav className="admin-nav" aria-label="Administrace">
          {visibleNav.map((item) => {
            const active = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "admin-nav-link is-active" : "admin-nav-link"}
              >
                {"iconSrc" in item ? (
                  <NavMaskIcon src={item.iconSrc} />
                ) : (
                  <item.icon className="admin-nav-icon admin-nav-icon-svg" />
                )}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <button type="button" className="admin-nav-link admin-logout" onClick={handleLogout}>
            <NavMaskIcon src="/icons/odhlaseni.svg" />
            <span>Odhlásit se</span>
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-icon-btn admin-menu-toggle"
            aria-label="Otevřít menu"
            aria-expanded={menuOpen}
            aria-controls="admin-sidebar"
            onClick={() => setMenuOpen(true)}
          >
            <span className="admin-burger" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </button>

          <button
            type="button"
            className="admin-search"
            aria-label="Otevřít vyhledávání"
            onClick={() => setCommandOpen(true)}
          >
            <IconSearch className="admin-search-icon" />
            <span className="admin-search-placeholder">
              Hledat poukazy, zákazníky…
            </span>
            <kbd className="admin-search-kbd">
              <span>{modifierKey}</span>
              <span className="admin-search-kbd-plus" aria-hidden>
                <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
                  <path
                    d="M4 1.25v5.5M1.25 4h5.5"
                    stroke="currentColor"
                    strokeWidth="1.35"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span>K</span>
            </kbd>
          </button>

          <div className="admin-topbar-actions">
            <div
              className={accountOpen ? "admin-account-menu is-open" : "admin-account-menu"}
              ref={accountMenuRef}
              onMouseEnter={openAccountMenu}
              onMouseLeave={scheduleCloseAccountMenu}
            >
              <button
                type="button"
                className="admin-account-pill"
                aria-label={`Účet ${user.name}`}
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                onClick={() => {
                  const canHover =
                    typeof window !== "undefined" &&
                    window.matchMedia("(hover: hover) and (pointer: fine)")
                      .matches;
                  if (canHover) return;
                  setAccountOpen((open) => !open);
                }}
                onFocus={openAccountMenu}
              >
                <span className="admin-account-pill-avatar" aria-hidden>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveAvatarUrl(user.avatarUrl)}
                    alt=""
                    className="admin-avatar-img"
                  />
                </span>
                <span className="admin-account-pill-copy">
                  <strong className="admin-account-pill-name">{user.name}</strong>
                  <span className="admin-account-pill-username">
                    {user.roleLabel}
                  </span>
                </span>
                <span
                  className={
                    accountOpen
                      ? "admin-account-pill-chevron is-open"
                      : "admin-account-pill-chevron"
                  }
                  aria-hidden
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M3 4.5L6 7.5L9 4.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>

              {accountOpen ? (
                <div className="admin-account-dropdown" role="menu">
                  <div className="admin-account-dropdown-head">
                    <strong>{user.name}</strong>
                    <span>{user.roleLabel}</span>
                  </div>
                  <div
                    className="admin-account-dropdown-divider"
                    aria-hidden
                  />
                  <Link
                    href="/admin/ucet"
                    className="admin-account-dropdown-item"
                    role="menuitem"
                    onClick={() => setAccountOpen(false)}
                  >
                    <NavMaskIcon src="/icons/nastaveni.svg" />
                    <span>Nastavení účtu</span>
                  </Link>
                  <button
                    type="button"
                    className="admin-account-dropdown-item admin-account-dropdown-logout"
                    role="menuitem"
                    onClick={() => {
                      setAccountOpen(false);
                      void handleLogout();
                    }}
                  >
                    <NavMaskIcon src="/icons/odhlaseni.svg" />
                    <span>Odhlásit se</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="admin-content">{children}</div>
      </div>

      <AdminCommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
      />
    </div>
    </AdminVoucherDrawerProvider>
  );
}
