"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconCopy } from "./icons";

const CHART_LABELS = ["13.7.", "18.7.", "23.7.", "28.7.", "2.8.", "7.8."];

/** Values in Kč for last 30 days mock series (0–8000 scale). */
const CHART_VALUES = [
  3100, 3600, 3300, 4100, 3800, 4700, 4400, 5200, 4900, 5800, 5500, 6400, 6100,
  7000,
];

const STATS = [
  {
    title: "Prodané poukazy",
    value: "128",
    trend: { direction: "up" as const, label: "↑ 12.4 % oproti minulému období" },
  },
  {
    title: "Celkové tržby",
    value: "186 400 Kč",
    trend: { direction: "up" as const, label: "↑ 8.1 % oproti minulému období" },
  },
  {
    title: "Průměrná hodnota poukazu",
    value: "1 456 Kč",
    trend: {
      direction: "down" as const,
      label: "↓ 2.3 % oproti minulému období",
    },
  },
];

type SaleStatus = "active" | "redeemed" | "expired" | "cancelled";

const RECENT_SALES: {
  voucher: string;
  customer: string;
  value: string;
  date: string;
  status: SaleStatus;
  statusLabel: string;
}[] = [
  {
    voucher: "Chef's Table",
    customer: "Jana Nováková",
    value: "1 290 Kč",
    date: "22. 4. 2026",
    status: "active",
    statusLabel: "Aktivní",
  },
  {
    voucher: "The Nook | „Koutek“",
    customer: "Petr Svoboda",
    value: "2 490 Kč",
    date: "21. 4. 2026",
    status: "redeemed",
    statusLabel: "Uplatněný",
  },
  {
    voucher: "Poukaz 1 500 Kč",
    customer: "Lucie Dvořáková",
    value: "1 800 Kč",
    date: "20. 4. 2026",
    status: "expired",
    statusLabel: "Expirovaný",
  },
  {
    voucher: "Poukaz 500 Kč",
    customer: "Martin Černý",
    value: "500 Kč",
    date: "19. 4. 2026",
    status: "cancelled",
    statusLabel: "Stornovaný",
  },
  {
    voucher: "Chef's Table s vinným párováním",
    customer: "Eva Horáková",
    value: "1 100 Kč",
    date: "18. 4. 2026",
    status: "active",
    statusLabel: "Aktivní",
  },
];

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

function buildChartPoints(
  values: number[],
  width: number,
  height: number,
  padX: number,
  padY: number,
) {
  const max = 8000;
  const min = 0;
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;
  return values.map((value, index) => {
    const x = padX + (index / (values.length - 1)) * usableW;
    const y = padY + usableH - ((value - min) / (max - min)) * usableH;
    return { x, y };
  });
}

function pointsToString(points: { x: number; y: number }[]) {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

export function AdminOverview() {
  const [copied, setCopied] = useState(false);
  const [shopUrl, setShopUrl] = useState("/");

  useEffect(() => {
    setShopUrl(`${window.location.origin}/`);
  }, []);

  const chartPoints = useMemo(() => {
    const pts = buildChartPoints(CHART_VALUES, 720, 320, 8, 20);
    return {
      line: pointsToString(pts),
      area: `${pts[0].x},300 ${pointsToString(pts)} ${pts[pts.length - 1].x},300`,
    };
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="admin-overview">
      <div className="admin-overview-head">
        <div>
          <h1>Vítejte, Long Story Short</h1>
          <p>Přehled vašeho obchodu.</p>
        </div>

        <div className="admin-shop-link">
          <span className="admin-shop-link-label">Odkaz na váš obchod</span>
          <div className="admin-shop-link-row">
            <input type="text" readOnly value={shopUrl} aria-label="Odkaz na obchod" />
            <button
              type="button"
              className="admin-icon-btn"
              onClick={copyLink}
              aria-label="Kopírovat odkaz"
              title={copied ? "Zkopírováno" : "Kopírovat"}
            >
              <IconCopy className="admin-icon" />
            </button>
            <button
              type="button"
              className="admin-icon-btn"
              aria-label="QR kód obchodu"
              title="QR kód"
            >
              <HeaderMaskIcon src="/icons/qrcode.svg" />
            </button>
          </div>
        </div>
      </div>

      <section className="admin-stats" aria-label="Statistiky">
        {STATS.map((stat) => (
          <article key={stat.title} className="admin-stat-card">
            <h2>{stat.title}</h2>
            <p className="admin-stat-value">{stat.value}</p>
            <p
              className={
                stat.trend.direction === "up"
                  ? "admin-stat-trend is-up"
                  : "admin-stat-trend is-down"
              }
            >
              {stat.trend.label}
            </p>
          </article>
        ))}
      </section>

      <section className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <h2>Tržby za posledních 30 dní</h2>
            <p>Souhrn v Kč bez DPH za posledních 30 dní.</p>
          </div>
        </div>
        <div className="admin-chart" role="img" aria-label="Graf tržeb za posledních 30 dní">
          <div className="admin-chart-y">
            <span>8k</span>
            <span>6k</span>
            <span>4k</span>
            <span>2k</span>
            <span>0</span>
          </div>
          <div className="admin-chart-plot">
            <svg
              viewBox="0 0 720 320"
              className="admin-chart-svg"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="adminChartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[64, 128, 192, 256].map((y) => (
                <line
                  key={y}
                  x1="0"
                  x2="720"
                  y1={y}
                  y2={y}
                  className="admin-chart-grid"
                />
              ))}
              <polygon points={chartPoints.area} fill="url(#adminChartFill)" />
              <polyline points={chartPoints.line} className="admin-chart-line" />
            </svg>
            <div className="admin-chart-labels">
              {CHART_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-head">
          <h2>Poslední prodané poukazy</h2>
          <Link href="/admin/poukazy" className="admin-text-link">
            Zobrazit vše
          </Link>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Poukaz</th>
                <th>Zákazník</th>
                <th>Hodnota</th>
                <th>Datum nákupu</th>
                <th>Stav</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_SALES.map((sale) => (
                <tr key={`${sale.customer}-${sale.date}-${sale.voucher}`}>
                  <td>{sale.voucher}</td>
                  <td>{sale.customer}</td>
                  <td>{sale.value}</td>
                  <td>{sale.date}</td>
                  <td>
                    <span className={`admin-status is-${sale.status}`}>
                      {sale.statusLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
