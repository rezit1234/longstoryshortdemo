import Link from "next/link";

const SHOPS = [
  {
    id: "lss",
    name: "Long Story Short",
    description: "Nastavení dárkových poukazů a variant obchodu LSS.",
    widgetPath: "/lss",
  },
  {
    id: "bistrocentral",
    name: "Bistro Central",
    description: "Nastavení dárkových poukazů a variant obchodu Bistro Central.",
    widgetPath: "/bistrocentral",
  },
  {
    id: "culinaryacademy",
    name: "Culinary Academy",
    description: "Nastavení dárkových poukazů a variant obchodu Culinary Academy.",
    widgetPath: "/culinaryacademy",
  },
] as const;

function MaskIcon({ src }: { src: string }) {
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

export function AdminObchody() {
  return (
    <div className="admin-obchody">
      <div className="admin-page-head">
        <div>
          <h1>Obchody</h1>
          <p>Vyberte obchod, jehož poukazy a nastavení chcete spravovat.</p>
        </div>
      </div>

      <div className="admin-experience-list">
        {SHOPS.map((shop) => (
          <div key={shop.id} className="admin-experience-row">
            <Link
              href={`/admin/obchody/${shop.id}`}
              className="admin-experience-row-open"
            >
              <div className="admin-experience-row-copy">
                <strong>
                  {shop.name}{" "}
                  <span className="admin-obchody-path">({shop.widgetPath})</span>
                </strong>
                <span>{shop.description}</span>
              </div>
              <MaskIcon src="/icons/Edit.svg" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
