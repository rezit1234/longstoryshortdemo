import type { CSSProperties } from "react";

type BoneProps = {
  className?: string;
  style?: CSSProperties;
};

export function AdminSkeletonBone({ className = "", style }: BoneProps) {
  return (
    <span
      className={["admin-skeleton-bone", className].filter(Boolean).join(" ")}
      style={style}
      aria-hidden
    />
  );
}

export function AdminSkeletonStatCards({
  count = 3,
  className = "admin-stats",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <section
      className={className}
      aria-busy="true"
      aria-label="Načítám statistiky"
    >
      {Array.from({ length: count }, (_, index) => (
        <article key={index} className="admin-stat-card">
          <AdminSkeletonBone className="admin-skeleton-line is-sm is-w-40" />
          <AdminSkeletonBone className="admin-skeleton-line is-xl is-w-55 admin-skeleton-gap-md" />
          <AdminSkeletonBone className="admin-skeleton-line is-xs is-w-70 admin-skeleton-gap-sm" />
        </article>
      ))}
    </section>
  );
}

export function AdminSkeletonChart({
  ariaLabel = "Načítám graf",
}: {
  ariaLabel?: string;
}) {
  return (
    <div
      className="admin-skeleton-chart"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      <div className="admin-skeleton-chart-bars" aria-hidden>
        {[42, 68, 35, 78, 52, 88, 46, 70, 58, 74].map((height, index) => (
          <span
            key={index}
            className="admin-skeleton-chart-bar"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function AdminSkeletonPopularList({ rows = 4 }: { rows?: number }) {
  return (
    <ul
      className="admin-popular-list"
      aria-busy="true"
      aria-label="Načítám varianty"
    >
      {Array.from({ length: rows }, (_, index) => (
        <li key={index}>
          <div className="admin-popular-row">
            <AdminSkeletonBone className="admin-skeleton-line is-sm is-w-55" />
            <AdminSkeletonBone className="admin-skeleton-line is-xs is-w-12" />
          </div>
          <AdminSkeletonBone className="admin-skeleton-bar admin-skeleton-gap-sm" />
        </li>
      ))}
    </ul>
  );
}

export function AdminSkeletonVariantList({ rows = 4 }: { rows?: number }) {
  return (
    <ul
      className="admin-variant-list"
      aria-busy="true"
      aria-label="Načítám přehled variant"
    >
      {Array.from({ length: rows }, (_, index) => (
        <li key={index}>
          <div className="admin-variant-main">
            <AdminSkeletonBone className="admin-skeleton-line is-sm is-w-50" />
            <AdminSkeletonBone className="admin-skeleton-line is-xs is-w-24 admin-skeleton-gap-xs" />
          </div>
          <AdminSkeletonBone className="admin-skeleton-line is-sm is-w-20" />
        </li>
      ))}
    </ul>
  );
}

export function AdminSkeletonStatusList({ rows = 4 }: { rows?: number }) {
  return (
    <ul
      className="admin-status-list"
      aria-busy="true"
      aria-label="Načítám stavy poukazů"
    >
      {Array.from({ length: rows }, (_, index) => (
        <li key={index}>
          <AdminSkeletonBone className="admin-skeleton-line is-sm is-w-45" />
          <AdminSkeletonBone className="admin-skeleton-line is-sm is-w-12" />
        </li>
      ))}
    </ul>
  );
}

export function AdminSkeletonTableRows({
  rows = 5,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <tr key={rowIndex} className="admin-skeleton-table-row" aria-hidden>
          {Array.from({ length: cols }, (_, colIndex) => (
            <td key={colIndex}>
              <AdminSkeletonBone
                className={[
                  "admin-skeleton-line is-sm",
                  colIndex === 0 ? "is-w-45" : "is-w-60",
                ].join(" ")}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function AdminSkeletonMemberList({ rows = 4 }: { rows?: number }) {
  return (
    <ul
      className="admin-member-list"
      aria-busy="true"
      aria-label="Načítám tým"
    >
      {Array.from({ length: rows }, (_, index) => (
        <li key={index}>
          <div className="admin-member-list-item is-skeleton">
            <AdminSkeletonBone className="admin-skeleton-avatar" />
            <span className="admin-member-list-copy">
              <AdminSkeletonBone className="admin-skeleton-line is-sm is-w-50" />
            </span>
            <AdminSkeletonBone className="admin-skeleton-pill" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AdminSkeletonExperienceRows({ rows = 3 }: { rows?: number }) {
  return (
    <div
      className="admin-experience-list"
      aria-busy="true"
      aria-label="Načítám varianty"
    >
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="admin-experience-row is-skeleton">
          <AdminSkeletonBone className="admin-skeleton-icon" />
          <div className="admin-experience-row-copy" style={{ flex: 1 }}>
            <AdminSkeletonBone className="admin-skeleton-line is-sm is-w-40" />
            <AdminSkeletonBone className="admin-skeleton-line is-xs is-w-70 admin-skeleton-gap-xs" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminSkeletonAmountGrid({ slots = 5 }: { slots?: number }) {
  return (
    <div
      className="admin-amount-grid"
      aria-busy="true"
      aria-label="Načítám částky"
    >
      {Array.from({ length: slots }, (_, index) => (
        <div key={index} className="admin-amount-slot">
          <AdminSkeletonBone className="admin-skeleton-line is-xs is-w-30" />
          <AdminSkeletonBone className="admin-skeleton-control admin-skeleton-gap-sm" />
        </div>
      ))}
    </div>
  );
}

export function AdminSkeletonRedeemPanel() {
  return (
    <div
      className="admin-skeleton-redeem"
      aria-busy="true"
      aria-label="Načítám poukazy"
    >
      <AdminSkeletonBone className="admin-skeleton-line is-xs is-w-30" />
      <AdminSkeletonBone className="admin-skeleton-control is-tall admin-skeleton-gap-sm" />
      <AdminSkeletonBone className="admin-skeleton-control is-btn admin-skeleton-gap-md" />
    </div>
  );
}
