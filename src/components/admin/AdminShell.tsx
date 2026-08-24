"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AdminCommandPalette } from "./AdminCommandPalette";
import { AdminUserProvider, getInitials, useAdminUser } from "./AdminUserProvider";
import { AdminVoucherDrawerProvider } from "./AdminVoucherDrawer";
import { IconSearch, IconTeam } from "./icons";

type NavItem =
  | {
      href: string;
      label: string;
      iconSrc: string;
    }
  | {
      href: string;
      label: string;
      icon: typeof IconTeam;
    };

const NAV: NavItem[] = [
  { href: "/admin", label: "Přehled", iconSrc: "/icons/prehled.svg" },
  { href: "/admin/poukazy", label: "Poukazy", iconSrc: "/icons/poukazy.svg" },
  {
    href: "/admin/uplatneni",
    label: "Uplatnění poukazu",
    iconSrc: "/icons/uplatneni.svg",
  },
  { href: "/admin/obchod", label: "Nastavení poukazů", iconSrc: "/icons/nastaveni.svg" },
  {
    href: "/admin/analytika",
    label: "Analytika",
    iconSrc: "/icons/analytika.svg",
  },
  { href: "/admin/tym", label: "Tým", icon: IconTeam },
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
  const { user } = useAdminUser();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchShortcut, setSearchShortcut] = useState("Ctrl K");
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [pathname]);

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
    setSearchShortcut(
      /Mac|iPhone|iPad|iPod/i.test(navigator.platform) ? "⌘K" : "Ctrl K",
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
          <Link href="/admin" className="admin-brand">
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
          {NAV.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

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
            <kbd className="admin-search-kbd">{searchShortcut}</kbd>
          </button>

          <div className="admin-topbar-actions">
            <div
              className={accountOpen ? "admin-account-menu is-open" : "admin-account-menu"}
              ref={accountMenuRef}
            >
              <button
                type="button"
                className="admin-avatar"
                aria-label="Účet"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((open) => !open)}
              >
                {getInitials(user.name)}
              </button>

              {accountOpen ? (
                <div className="admin-account-dropdown" role="menu">
                  <div className="admin-account-dropdown-head">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                  <div className="admin-account-dropdown-divider" aria-hidden />
                  <Link
                    href="/admin/ucet"
                    className="admin-account-dropdown-item"
                    role="menuitem"
                    onClick={() => setAccountOpen(false)}
                  >
                    <NavMaskIcon src="/icons/nastaveni.svg" />
                    <span>Nastavení účtu</span>
                  </Link>
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
