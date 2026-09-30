import { getSessionProfile } from "@/lib/admin-session";
import { buildAnalyticsPayload } from "@/lib/admin-analytics";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });
  }

  const url = new URL(request.url);
  try {
    const payload = await buildAnalyticsPayload({
      shop: url.searchParams.get("shop"),
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      period: url.searchParams.get("period"),
    });
    return NextResponse.json(payload);
  } catch (error) {
    console.error("admin analytics", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nepodařilo se načíst analytiku.",
      },
      { status: 500 },
    );
  }
}
