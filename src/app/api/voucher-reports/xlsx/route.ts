import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/admin-session";
import { canManageTeam } from "@/lib/auth";
import { shopLineLabel, type VoucherReport } from "@/lib/voucher-reports";

export const runtime = "nodejs";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF0A0A0A" },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  name: "Calibri",
  size: 11,
};

function styleHeaderRow(row: ExcelJS.Row) {
  row.height = 22;
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });
}

function cellDisplayLength(value: ExcelJS.CellValue | undefined): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number") {
    return Math.max(String(Math.round(value)).length + 2, 4);
  }
  if (typeof value === "boolean") return value ? 4 : 5;
  if (typeof value === "string") return value.length;
  if (value instanceof Date) return 10;
  if (typeof value === "object" && "text" in value && typeof value.text === "string") {
    return value.text.length;
  }
  if (typeof value === "object" && "richText" in value && Array.isArray(value.richText)) {
    return value.richText.reduce(
      (sum, part) => sum + (typeof part.text === "string" ? part.text.length : 0),
      0,
    );
  }
  return String(value).length;
}

/** Excel column width ≈ character count; pad so text isn’t flush to the edge. */
function autofitColumns(sheet: ExcelJS.Worksheet, minWidth = 10, maxWidth = 48) {
  sheet.columns.forEach((column, index) => {
    let maxLen = 0;
    const colNumber = index + 1;
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const cell = row.getCell(colNumber);
      maxLen = Math.max(maxLen, cellDisplayLength(cell.value));
    });
    column.width = Math.min(maxWidth, Math.max(minWidth, maxLen + 2));
  });
}

async function buildWorkbook(report: VoucherReport) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Long Story Short";
  workbook.created = new Date();

  const vouchersSheet = workbook.addWorksheet("Poukazy", {
    views: [{ state: "frozen", ySplit: 1, activeCell: "A2" }],
  });
  vouchersSheet.columns = [
    { header: "Kód", key: "code" },
    { header: "Varianta", key: "variant" },
    { header: "Obchod", key: "shop" },
    { header: "Prodej", key: "soldAt" },
    { header: "Stav", key: "status" },
    { header: "Částka (Kč)", key: "amount" },
    { header: "DPH", key: "vat" },
    { header: "Režim", key: "regime" },
  ];
  styleHeaderRow(vouchersSheet.getRow(1));

  for (const row of report.vouchers) {
    const excelRow = vouchersSheet.addRow({
      code: row.code,
      variant: row.variantName,
      shop: shopLineLabel(row.shopId),
      soldAt: row.soldAt,
      status: row.status,
      amount: row.amountCzk,
      vat: row.vatLabel,
      regime: row.taxRegime === "legacy" ? "Legacy" : "VOUCHY",
    });
    excelRow.getCell("amount").numFmt = "#,##0";
    excelRow.getCell("amount").alignment = { horizontal: "right" };
  }
  autofitColumns(vouchersSheet);

  const summarySheet = workbook.addWorksheet("Souhrn DPH", {
    views: [{ state: "frozen", ySplit: 1, activeCell: "A2" }],
  });
  summarySheet.columns = [
    { header: "Sekce", key: "section" },
    { header: "Položka", key: "metric" },
    { header: "Počet", key: "count" },
    { header: "Částka (Kč)", key: "amount" },
  ];
  styleHeaderRow(summarySheet.getRow(1));

  for (const row of report.aggregateRows) {
    const excelRow = summarySheet.addRow({
      section: row.section,
      metric: row.metric,
      count: row.count,
      amount: row.amountCzk,
    });
    excelRow.getCell("count").numFmt = "#,##0";
    excelRow.getCell("amount").numFmt = "#,##0";
    excelRow.getCell("count").alignment = { horizontal: "right" };
    excelRow.getCell("amount").alignment = { horizontal: "right" };
  }
  autofitColumns(summarySheet);

  return workbook.xlsx.writeBuffer();
}

export async function POST(request: Request) {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });
  }

  if (!canManageTeam(session.profile.role)) {
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

  const buffer = await buildWorkbook(report);
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
