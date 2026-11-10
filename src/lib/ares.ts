/** Veřejné ARES REST API (bez klíče). */

const ARES_BASE =
  "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty";

export type AresCompany = {
  ico: string;
  name: string;
  dic: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  addressText: string;
};

type AresSidlo = {
  textovaAdresa?: string;
  nazevObce?: string;
  nazevCastiObce?: string;
  nazevUlice?: string;
  cisloDomovni?: number | string;
  cisloOrientacni?: number | string;
  psc?: number | string;
};

type AresSubject = {
  ico?: string;
  obchodniJmeno?: string;
  dic?: string;
  sidlo?: AresSidlo;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

/** IČO vždy 8 číslic (doplnění nulami zleva). */
export function normalizeIco(value: string): string | null {
  const digits = digitsOnly(value);
  if (!digits) return null;
  if (digits.length > 8) return null;
  return digits.padStart(8, "0");
}

function formatStreet(sidlo: AresSidlo | undefined): string {
  if (!sidlo) return "";
  const street = (sidlo.nazevUlice || "").trim();
  const house = [sidlo.cisloDomovni, sidlo.cisloOrientacni]
    .filter((part) => part !== undefined && part !== null && `${part}` !== "")
    .join("/");
  if (street && house) return `${street} ${house}`;
  if (street) return street;
  if (house) return house;
  return "";
}

export function mapAresSubject(raw: AresSubject): AresCompany | null {
  const ico = normalizeIco(String(raw.ico ?? ""));
  const name = String(raw.obchodniJmeno ?? "").trim();
  if (!ico || !name) return null;

  const sidlo = raw.sidlo;
  const city = String(sidlo?.nazevObce ?? "").trim();
  const postalCode = String(sidlo?.psc ?? "")
    .replace(/\D/g, "")
    .trim();
  const addressLine1 =
    formatStreet(sidlo) ||
    String(sidlo?.textovaAdresa ?? "")
      .split(",")[0]
      ?.trim() ||
    "";
  const addressText = String(sidlo?.textovaAdresa ?? "").trim();

  return {
    ico,
    name,
    dic: String(raw.dic ?? "").trim().toUpperCase(),
    addressLine1,
    city,
    postalCode,
    addressText:
      addressText ||
      [addressLine1, [postalCode, city].filter(Boolean).join(" ")]
        .filter(Boolean)
        .join(", "),
  };
}

export async function fetchAresCompanyByIco(
  icoRaw: string,
): Promise<AresCompany | null> {
  // Vyžaduj přesně 8 číslic (nepadovat krátké vstupy zleva).
  if (digitsOnly(icoRaw).length !== 8) return null;
  const ico = normalizeIco(icoRaw);
  if (!ico) return null;

  const response = await fetch(`${ARES_BASE}/${ico}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`ARES lookup selhal (${response.status}).`);
  }
  const json = (await response.json()) as AresSubject;
  return mapAresSubject(json);
}

export async function searchAresCompanies(
  query: string,
  limit = 8,
): Promise<AresCompany[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const digits = digitsOnly(q);
  if (digits.length === 8 && /^\d+$/.test(q.replace(/\s/g, ""))) {
    const one = await fetchAresCompanyByIco(digits);
    return one ? [one] : [];
  }

  const response = await fetch(`${ARES_BASE}/vyhledat`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      obchodniJmeno: q,
      start: 0,
      pocet: Math.min(Math.max(limit, 1), 20),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    // Příliš obecný dotaz → prázdno, ne hard fail ve widgetu.
    if (response.status === 400) return [];
    throw new Error(`ARES search selhal (${response.status}).`);
  }

  const json = (await response.json()) as {
    ekonomickeSubjekty?: AresSubject[];
  };
  const rows = Array.isArray(json.ekonomickeSubjekty)
    ? json.ekonomickeSubjekty
    : [];
  return rows
    .map(mapAresSubject)
    .filter((row): row is AresCompany => Boolean(row));
}
