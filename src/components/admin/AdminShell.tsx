"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
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
  { href: "/admin/obchod", label: "Můj obchod", iconSrc: "/icons/obchod.svg" },
  {
    href: "/admin/analytika",
    label: "Analytika",
    iconSrc: "/icons/analytika.svg",
  },
  { href: "/admin/tym", label: "Tým", icon: IconTeam },
  {
    href: "/admin/napoveda",
    label: "Nápověda",
    iconSrc: "/icons/napoveda.svg",
  },
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

function HeaderMaskIcon({ src }: { src: string }) {
  return (
    <span
      className="admin-mask-icon"
      style={{
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
      }}
      aria-hidden
    />
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
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
          <label className="admin-search">
            <IconSearch className="admin-search-icon" />
            <input
              type="search"
              placeholder="Hledat poukazy, zákazníky…"
              aria-label="Hledat poukazy, zákazníky"
            />
          </label>

          <div className="admin-topbar-actions">
            <button type="button" className="admin-icon-btn" aria-label="Oznámení">
              <HeaderMaskIcon src="/icons/bell.svg" />
            </button>
            <button type="button" className="admin-avatar" aria-label="Účet">
              A
            </button>
          </div>
        </header>

        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
