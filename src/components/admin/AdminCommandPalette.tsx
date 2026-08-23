"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getRecentAdminVouchers,
  searchAdminVouchers,
  type AdminSoldVoucher,
} from "@/data/admin-vouchers";
import { useAdminVoucherDrawer } from "./AdminVoucherDrawer";
import { AdminDismissButton } from "./AdminDismissButton";
import { IconSearch } from "./icons";

const QUICK_LINKS = [
  {
    href: "/admin",
    label: "Přehled",
    description: "Přehled obchodu",
    iconSrc: "/icons/prehled.svg",
  },
  {
    href: "/admin/poukazy",
    label: "Poukazy",
    description: "Tabulka prodaných poukazů",
    iconSrc: "/icons/poukazy.svg",
  },
  {
    href: "/admin/uplatneni",
    label: "Uplatnění poukazu",
    description: "Ověření a uplatnění kódu",
    iconSrc: "/icons/uplatneni.svg",
  },
  {
    href: "/admin/analytika",
    label: "Analytika",
    description: "Tržby a statistiky",
    iconSrc: "/icons/analytika.svg",
  },
] as const;

const NAV_LINKS = [
  ...QUICK_LINKS,
  { href: "/admin/obchod", label: "Nastavení poukazů", description: "Vzhled a varianty poukazů", iconSrc: "/icons/nastaveni.svg" },
  { href: "/admin/tym", label: "Tým" },
  { href: "/admin/napoveda", label: "Nápověda" },
] as const;

const VOUCHER_ICON = "/icons/poukazy.svg";
const CUSTOMER_ICON = "/icons/user.svg";

type SearchItem =
  | {
      type: "nav";
      href: string;
      label: string;
      description?: string;
      iconSrc?: string;
    }
  | {
      type: "voucher";
      voucher: AdminSoldVoucher;
      iconVariant: "voucher" | "customer";
      showProductAsLabel?: boolean;
    };

function normalizeSearch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function getVoucherIconVariant(
  query: string,
  voucher: AdminSoldVoucher,
): "voucher" | "customer" {
  const normalized = normalizeSearch(query);
  if (!normalized) return "voucher";

  const customerMatch =
    normalizeSearch(voucher.customer).includes(normalized) ||
    normalizeSearch(voucher.email).includes(normalized);
  const voucherMatch =
    normalizeSearch(voucher.code).includes(normalized) ||
    normalizeSearch(voucher.product).includes(normalized) ||
    normalizeSearch(voucher.value).includes(normalized);

  if (customerMatch && !voucherMatch) return "customer";
  if (voucherMatch && !customerMatch) return "voucher";
  if (normalizeSearch(voucher.code).includes(normalized)) return "voucher";
  return "customer";
}

function CommandMaskIcon({ src }: { src: string }) {
  return (
    <span
      className="admin-command-item-icon"
      style={{
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
      }}
      aria-hidden
    />
  );
}

export function AdminCommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { openVoucher, vouchers } = useAdminVoucherDrawer();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const recentVouchers = useMemo(() => getRecentAdminVouchers(4, vouchers), [vouchers]);

  const searchItems = useMemo<SearchItem[]>(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const normalized = trimmed.toLowerCase();
    const navMatches = NAV_LINKS.filter((item) =>
      item.label.toLowerCase().includes(normalized),
    ).map((item) => ({ type: "nav" as const, ...item }));

    const voucherMatches = searchAdminVouchers(trimmed, vouchers).map((voucher) => ({
      type: "voucher" as const,
      voucher,
      iconVariant: getVoucherIconVariant(trimmed, voucher),
    }));

    return [...navMatches, ...voucherMatches];
  }, [query, vouchers]);

  const defaultItems = useMemo<SearchItem[]>(
    () => [
      ...QUICK_LINKS.map((item) => ({ type: "nav" as const, ...item })),
      ...recentVouchers.map((voucher) => ({
        type: "voucher" as const,
        voucher,
        iconVariant: "voucher" as const,
        showProductAsLabel: true,
      })),
    ],
    [recentVouchers],
  );

  const selectableItems = query.trim() ? searchItems : defaultItems;
  const quickLinkCount = query.trim() ? 0 : QUICK_LINKS.length;

  useEffect(() => {
    if (!open) return;

    setQuery("");
    setActiveIndex(0);

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;

    const active = listRef.current?.querySelector<HTMLElement>(
      `[data-command-index="${activeIndex}"]`,
    );
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, query]);

  function openVoucherDetail(voucher: AdminSoldVoucher) {
    onClose();
    window.requestAnimationFrame(() => openVoucher(voucher));
  }

  function activateItem(item: SearchItem) {
    if (item.type === "nav") {
      onClose();
      router.push(item.href);
      return;
    }

    openVoucherDetail(item.voucher);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        Math.min(current + 1, Math.max(selectableItems.length - 1, 0)),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      const item = selectableItems[activeIndex];
      if (!item) return;
      event.preventDefault();
      activateItem(item);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  function renderItem(item: SearchItem, index: number) {
    const isNav = item.type === "nav";

    return (
      <li key={isNav ? `nav-${item.href}` : `voucher-${item.voucher.code}`}>
        <button
          type="button"
          className={
            index === activeIndex
              ? "admin-command-item is-active"
              : "admin-command-item"
          }
          data-command-index={index}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => activateItem(item)}
        >
          {isNav && item.iconSrc ? (
            <span className="admin-command-item-row">
              <CommandMaskIcon src={item.iconSrc} />
              <span className="admin-command-item-copy">
                <span className="admin-command-item-label">{item.label}</span>
                {item.description ? (
                  <span className="admin-command-item-meta">{item.description}</span>
                ) : null}
              </span>
            </span>
          ) : isNav ? (
            <>
              <span className="admin-command-item-label">{item.label}</span>
              <span className="admin-command-item-meta">Stránka</span>
            </>
          ) : (
            <span className="admin-command-item-row">
              <CommandMaskIcon
                src={item.iconVariant === "customer" ? CUSTOMER_ICON : VOUCHER_ICON}
              />
              <span className="admin-command-item-copy">
                <span className="admin-command-item-label">
                  {item.showProductAsLabel
                    ? item.voucher.product
                    : item.voucher.customer}
                </span>
                <span className="admin-command-item-meta">
                  {item.showProductAsLabel
                    ? `${item.voucher.customer} · ${item.voucher.value}`
                    : `${item.voucher.code} · ${item.voucher.product}`}
                </span>
              </span>
            </span>
          )}
        </button>
      </li>
    );
  }

  if (!open) return null;

  return (
    <div
      className="admin-command-root"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="admin-command-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Globální vyhledávání"
        onKeyDown={handleKeyDown}
      >
        <div className="admin-command-input-wrap">
          <IconSearch className="admin-command-input-icon" />
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            className="admin-command-input"
            placeholder="Hledat poukazy, zákazníky, stránky…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <AdminDismissButton
            label="Zavřít vyhledávání"
            onClick={onClose}
          />
        </div>

        <div className="admin-command-body" ref={listRef}>
          {query.trim() ? (
            selectableItems.length > 0 ? (
              <section className="admin-command-section">
                <h3 className="admin-command-section-title">Výsledky</h3>
                <ul className="admin-command-list">
                  {selectableItems.map((item, index) => renderItem(item, index))}
                </ul>
              </section>
            ) : (
              <p className="admin-command-empty">
                Pro „{query.trim()}“ jsme nic nenašli.
              </p>
            )
          ) : (
            <>
              <section className="admin-command-section">
                <h3 className="admin-command-section-title">Rychlé odkazy</h3>
                <ul className="admin-command-list">
                  {selectableItems
                    .slice(0, quickLinkCount)
                    .map((item, index) => renderItem(item, index))}
                </ul>
              </section>

              <section className="admin-command-section">
                <h3 className="admin-command-section-title">Nedávné poukazy</h3>
                <ul className="admin-command-list">
                  {selectableItems
                    .slice(quickLinkCount)
                    .map((item, index) => renderItem(item, index + quickLinkCount))}
                </ul>
              </section>
            </>
          )}
        </div>

        <div className="admin-command-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigace
          </span>
          <span>
            <kbd>Enter</kbd> otevřít
          </span>
          <span>
            <kbd>Esc</kbd> zavřít
          </span>
        </div>
      </div>
    </div>
  );
}
