"use client";

import Image from "next/image";
import { useState } from "react";
import {
  AMOUNT_VOUCHERS,
  EXPERIENCE_VOUCHERS,
  formatCzk,
  type ExperienceVoucher,
} from "@/data/vouchers";

type ShopTab = "amount" | "experience";

export function VoucherShop() {
  const [tab, setTab] = useState<ShopTab>("experience");
  const [selectedAmount, setSelectedAmount] = useState(
    AMOUNT_VOUCHERS[2]?.amount ?? 1500,
  );
  const [openId, setOpenId] = useState<string | null>(
    EXPERIENCE_VOUCHERS[0]?.id ?? null,
  );

  return (
    <div className="voucher-shop">
      <header className="shop-header">
        <Image
          src="/logo.png"
          alt="Long Story Short"
          width={180}
          height={28}
          className="shop-logo"
          priority
        />
        <p className="shop-kicker">Dárkové poukazy (DEMO UKÁZKA)</p>
      </header>

      <div className="shop-box">
        <section className="shop-hero" aria-label="Dárkové poukazy Long Story Short">
          <div className="shop-hero-media">
            <Image
              src="/poukazimg.jpeg"
              alt="Fyzické dárkové poukazy Long Story Short"
              fill
              priority
              sizes="(max-width: 720px) 100vw, 720px"
              className="shop-hero-image"
            />
          </div>
        </section>

        <div className="shop-box-body">
          <p className="shop-hero-copy">
            Vyberte poukaz na částku, nebo na konkrétní zážitek.
          </p>

          <div className="shop-tabs" role="tablist" aria-label="Typ poukazu">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "experience"}
              className={tab === "experience" ? "is-active" : undefined}
              onClick={() => setTab("experience")}
            >
              Zážitky
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "amount"}
              className={tab === "amount" ? "is-active" : undefined}
              onClick={() => setTab("amount")}
            >
              Na částku
            </button>
          </div>

          {tab === "experience" ? (
            <ExperiencePanel openId={openId} onToggle={setOpenId} />
          ) : (
            <AmountPanel
              selectedAmount={selectedAmount}
              onSelect={setSelectedAmount}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function AmountPanel({
  selectedAmount,
  onSelect,
}: {
  selectedAmount: number;
  onSelect: (amount: number) => void;
}) {
  return (
    <section className="amount-panel" aria-label="Poukaz na částku">
      <div className="amount-preview" aria-live="polite">
        <span className="amount-preview-label">Voucher</span>
        <span className="amount-preview-oval" />
        <strong className="amount-preview-value">
          {formatCzk(selectedAmount)}
        </strong>
        <span className="amount-preview-meta">Long Story Short</span>
      </div>

      <p className="panel-lead">Vyberte hodnotu poukazu</p>

      <div className="amount-grid">
        {AMOUNT_VOUCHERS.map((voucher) => {
          const active = voucher.amount === selectedAmount;
          return (
            <button
              key={voucher.id}
              type="button"
              className={active ? "amount-chip is-active" : "amount-chip"}
              aria-pressed={active}
              onClick={() => onSelect(voucher.amount)}
            >
              {formatCzk(voucher.amount)}
            </button>
          );
        })}
      </div>

      <button type="button" className="buy-button">
        Koupit · {formatCzk(selectedAmount)}
      </button>
    </section>
  );
}

function ExperiencePanel({
  openId,
  onToggle,
}: {
  openId: string | null;
  onToggle: (id: string | null) => void;
}) {
  return (
    <section className="experience-panel" aria-label="Zážitkové poukazy">
      <ul className="experience-list">
        {EXPERIENCE_VOUCHERS.map((voucher) => (
          <ExperienceItem
            key={voucher.id}
            voucher={voucher}
            open={openId === voucher.id}
            onToggle={() =>
              onToggle(openId === voucher.id ? null : voucher.id)
            }
          />
        ))}
      </ul>
    </section>
  );
}

function ExperienceItem({
  voucher,
  open,
  onToggle,
}: {
  voucher: ExperienceVoucher;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <li className={open ? "experience-item is-open" : "experience-item"}>
      <div className="experience-top">
        <div className="experience-heading">
          <h2>{voucher.title}</h2>
          {voucher.subtitle ? <span>{voucher.subtitle}</span> : null}
        </div>
        <p className="experience-price">{formatCzk(voucher.price)}</p>
      </div>

      <p className="experience-suitable">Pro {voucher.suitableFor}</p>

      <div className="experience-actions">
        <button type="button" className="buy-button buy-button-compact">
          Koupit
        </button>
        <button
          type="button"
          className="more-button"
          aria-expanded={open}
          onClick={onToggle}
        >
          {open ? "Méně" : "Více informací"}
        </button>
      </div>

      <div
        className="experience-details"
        hidden={!open}
        id={`${voucher.id}-details`}
      >
        <p>{voucher.description}</p>
      </div>
    </li>
  );
}
