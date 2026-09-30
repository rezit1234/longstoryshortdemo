import { NextResponse } from "next/server";
import { generateInvoicePdfBuffer } from "@/lib/invoicing/generate-invoice-pdf";

/** Dočasný náhled ukázkové faktury — otevři v prohlížeči `/test`. */
export async function GET() {
  const invoiceNumber = "LSS-2026-0001";
  const amount = 1500;

  const pdf = await generateInvoicePdfBuffer({
    shopId: "lss",
    invoiceNumber,
    issueDate: "2026-09-10",
    dueDate: "2026-09-10",
    dueDateLabel: "Datum úhrady",
    description: "Dárkový poukaz Long Story Short — 1 500 Kč",
    amount,
    customerName: "Ukázková firma s.r.o.",
    customerIco: "12345678",
    customerAddress: "Hlavní 1, 11000 Praha",
    paymentMethod: "Online platba (Comgate)",
    footerNote:
      "Tato faktura byla uhrazena online přes platební bránu Comgate.",
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="faktura-LSS-2026-0001.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
