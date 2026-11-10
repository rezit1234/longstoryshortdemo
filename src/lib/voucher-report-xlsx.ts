import ExcelJS from "exceljs";
import { shopLineLabel, type VoucherReport } from "@/lib/voucher-reports";

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
  if (
    typeof value === "object" &&
    "text" in value &&
    typeof value.text === "string"
  ) {
    return value.text.length;
  }
  if (
    typeof value === "object" &&
    "richText" in value &&
    Array.isArray(value.richText)
  ) {
    return value.richText.reduce(
      (sum, part) =>
        sum + (typeof part.text === "string" ? part.text.length : 0),
      0,
    );
  }
  return String(value).length;
}

function autofitColumns(
  sheet: ExcelJS.Worksheet,
  minWidth = 10,
  maxWidth = 48,
) {
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

export async function buildVoucherReportWorkbook(
  report: VoucherReport,
  options?: { demoNote?: string },
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Long Story Short";
  workbook.created = new Date();

  if (options?.demoNote) {
    const noteSheet = workbook.addWorksheet("Poznámka");
    noteSheet.getColumn(1).width = 92;
    noteSheet.getCell("A1").value = "UKÁZKOVÝ REPORT";
    noteSheet.getCell("A1").font = { bold: true, size: 16 };
    noteSheet.getCell("A3").value = options.demoNote;
    noteSheet.getCell("A3").alignment = { wrapText: true, vertical: "top" };
    noteSheet.getRow(3).height = 90;
  }

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
    { header: "Vystavil", key: "issuedBy" },
    { header: "Uplatnil", key: "redeemedBy" },
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
      issuedBy: row.issuedByName ?? "",
      redeemedBy: row.redeemedByName ?? "",
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

  if (Array.isArray(report.staffRows) && report.staffRows.length > 0) {
    const staffSheet = workbook.addWorksheet("Podle uživatele", {
      views: [{ state: "frozen", ySplit: 1, activeCell: "A2" }],
    });
    staffSheet.columns = [
      { header: "Uživatel", key: "name" },
      { header: "Role", key: "role" },
      { header: "Vystaveno", key: "issued" },
      { header: "Uplatněno", key: "redeemed" },
    ];
    styleHeaderRow(staffSheet.getRow(1));
    for (const row of report.staffRows) {
      const excelRow = staffSheet.addRow({
        name: row.name,
        role: row.roleLabel,
        issued: row.issued,
        redeemed: row.redeemed,
      });
      excelRow.getCell("issued").numFmt = "#,##0";
      excelRow.getCell("redeemed").numFmt = "#,##0";
      excelRow.getCell("issued").alignment = { horizontal: "right" };
      excelRow.getCell("redeemed").alignment = { horizontal: "right" };
    }
    autofitColumns(staffSheet);
  }

  return workbook.xlsx.writeBuffer();
}
