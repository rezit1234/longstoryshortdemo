import { NextResponse } from "next/server";
import { fetchAresCompanyByIco, searchAresCompanies } from "@/lib/ares";

export const runtime = "nodejs";

/**
 * ARES proxy (CORS + sjednocení odpovědi).
 * GET /api/ares?ico=27082440
 * GET /api/ares?q=Alza
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ico = url.searchParams.get("ico")?.trim() || "";
  const q = url.searchParams.get("q")?.trim() || "";

  try {
    if (ico) {
      const company = await fetchAresCompanyByIco(ico);
      if (!company) {
        return NextResponse.json(
          { error: "Subjekt s tímto IČO nebyl nalezen." },
          { status: 404 },
        );
      }
      return NextResponse.json({ company });
    }

    if (q) {
      const companies = await searchAresCompanies(q, 8);
      return NextResponse.json({ companies });
    }

    return NextResponse.json(
      { error: "Zadejte ico nebo q." },
      { status: 400 },
    );
  } catch (error) {
    console.error("ares api", error);
    return NextResponse.json(
      { error: "ARES je dočasně nedostupný." },
      { status: 502 },
    );
  }
}
