import Image from "next/image";
import { getShopBrand, shopIdFromOrderNumber } from "@/data/shops";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status = first(params.status).toLowerCase();
  const refId = first(params.refId);
  const brand = getShopBrand(shopIdFromOrderNumber(refId));

  const title =
    status === "paid"
      ? "Platba proběhla"
      : status === "cancelled"
        ? "Platba byla zrušena"
        : status === "pending"
          ? "Platba se zpracovává"
          : "Stav platby";

  const copy =
    status === "paid"
      ? "Děkujeme. Objednávka je zaplacená a poukaz(y) se právě vystavují. E-mail s PDF přijde v další fázi."
      : status === "cancelled"
        ? "Platba neproběhla nebo byla zrušena. Můžete to zkusit znovu."
        : status === "pending"
          ? "Čekáme na potvrzení od platební brány. Stav se aktualizuje automaticky."
          : "Vraťte se na webové stránky nebo zkontrolujte e-mail s potvrzením.";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem 1.25rem",
        background: "#f4f4f5",
        color: "#0a0a0a",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: "min(100%, 28rem)",
          background: "#fff",
          borderRadius: 16,
          padding: "1.75rem 1.5rem",
          boxShadow: "0 10px 40px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            marginBottom: "1.1rem",
          }}
        >
          <Image
            src={brand.logoSrc}
            alt={brand.brandName}
            width={220}
            height={80}
            style={{
              width: "auto",
              height: "3.75rem",
              maxWidth: "14rem",
              objectFit: "contain",
            }}
            priority
          />
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "1.55rem",
            fontWeight: 650,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h1>
        <p style={{ margin: "0.75rem 0 0", lineHeight: 1.5, color: "#3f3f46" }}>
          {copy}
        </p>
        {refId ? (
          <p
            style={{
              margin: "0.85rem 0 0",
              fontSize: "0.9rem",
              color: "#71717a",
            }}
          >
            Objednávka: <strong style={{ color: "#0a0a0a" }}>{refId}</strong>
          </p>
        ) : null}
        <a
          href={brand.websiteUrl}
          style={{
            display: "inline-flex",
            marginTop: "1.5rem",
            padding: "0.75rem 1.1rem",
            borderRadius: 999,
            background: "#0a0a0a",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "0.92rem",
          }}
        >
          Zpět na webové stránky
        </a>
      </div>
    </main>
  );
}
