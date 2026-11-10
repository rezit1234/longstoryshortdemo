import Link from "next/link";
import { getEnabledShopBrands } from "@/data/shops";

const SHOP_COPY: Record<
  string,
  { description: string; descriptionShort: string; widgetPath: string }
> = {
  lss: {
    description: "Nastavení dárkových poukazů a variant obchodu LSS.",
    descriptionShort: "Nastavení poukazů a variant",
    widgetPath: "/lss",
  },
  bistrocentral: {
    description: "Nastavení dárkových poukazů a variant obchodu Bistro Central.",
    descriptionShort: "Nastavení poukazů a variant",
    widgetPath: "/bistrocentral",
  },
  culinaryacademy: {
    description:
      "Nastavení dárkových poukazů a variant obchodu Culinary Academy.",
    descriptionShort: "Nastavení poukazů a variant",
    widgetPath: "/culinaryacademy",
  },
};

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
  const shops = getEnabledShopBrands().map((brand) => ({
    id: brand.id,
    name: brand.brandName,
    ...(SHOP_COPY[brand.id] ?? {
      description: `Nastavení dárkových poukazů obchodu ${brand.brandName}.`,
      descriptionShort: "Nastavení poukazů a variant",
      widgetPath: `/${brand.id}`,
    }),
  }));

  return (
    <div className="admin-obchody">
      <div className="admin-page-head">
        <div>
          <h1>Obchody</h1>
          <p>Vyberte obchod, jehož poukazy a nastavení chcete spravovat.</p>
        </div>
      </div>

      <div className="admin-experience-list">
        {shops.map((shop) => (
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
