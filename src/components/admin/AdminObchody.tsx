import Link from "next/link";

const SHOPS = [
  {
    id: "lss",
    name: "Long Story Short",
    description: "Nastavení dárkových poukazů a variant obchodu LSS.",
    descriptionShort: "Nastavení poukazů a variant",
    widgetPath: "/lss",
  },
  {
    id: "bistrocentral",
    name: "Bistro Central",
    description: "Nastavení dárkových poukazů a variant obchodu Bistro Central.",
    descriptionShort: "Nastavení poukazů a variant",
    widgetPath: "/bistrocentral",
  },
  {
    id: "culinaryacademy",
    name: "Culinary Academy",
    description: "Nastavení dárkových poukazů a variant obchodu Culinary Academy.",
    descriptionShort: "Nastavení poukazů a variant",
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
                <span className="admin-obchody-desc admin-obchody-desc-full">
                  {shop.description}
                </span>
                <span className="admin-obchody-desc admin-obchody-desc-short">
                  {shop.descriptionShort}
                </span>
              </div>
              <MaskIcon src="/icons/Edit.svg" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
