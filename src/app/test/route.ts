import { NextResponse } from "next/server";
import { generateInvoicePdfBuffer } from "@/lib/invoicing/generate-invoice-pdf";
import { buildInvoiceQrDataUrl } from "@/lib/invoicing/spayd";

/** Dočasný náhled ukázkové faktury — otevři v prohlížeči `/test`. */
export async function GET() {
  const invoiceNumber = "VOUCHY-2026-0001";
  const amount = 1500;

  const qrCodeDataUrl = await buildInvoiceQrDataUrl({
    amount,
    invoiceNumber,
  });

  const pdf = await generateInvoicePdfBuffer({
    invoiceNumber,
    issueDate: "2026-09-10",
    dueDate: "2026-09-24",
    description: "Dárkový poukaz Long Story Short — 1 500 Kč",
    amount,
    customerName: "Ukázková firma s.r.o.",
    customerIco: "12345678",
    customerAddress: "Hlavní 1, 11000 Praha",
    qrCodeDataUrl,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="faktura-VOUCHY-2026-0001.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
