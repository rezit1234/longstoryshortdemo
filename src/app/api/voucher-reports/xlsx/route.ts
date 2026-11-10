import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/admin-session";
import { canViewManagement } from "@/lib/auth";
import { buildVoucherReportWorkbook } from "@/lib/voucher-report-xlsx";
import type { VoucherReport } from "@/lib/voucher-reports";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });
  }

  if (!canViewManagement(session.profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const report = (body as { report?: VoucherReport } | null)?.report;
  if (
    !report ||
    !Array.isArray(report.vouchers) ||
    !Array.isArray(report.aggregateRows)
  ) {
    return NextResponse.json({ error: "Missing report" }, { status: 400 });
  }

  if (!Array.isArray(report.staffRows)) {
    report.staffRows = [];
  }

  const buffer = await buildVoucherReportWorkbook(report);
  const filename = `report-poukazy-${report.from}_${report.to}.xlsx`;

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
