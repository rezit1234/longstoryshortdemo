import { generateInvoicePdfBuffer } from "@/lib/invoicing/generate-invoice-pdf";
import { buildInvoiceQrDataUrl } from "@/lib/invoicing/spayd";
import { writeFileSync } from "fs";
import path from "path";

async function main() {
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

  const out = path.join(process.cwd(), "tmp-faktura-ukazka.pdf");
  writeFileSync(out, pdf);
  console.log(`OK → ${out} (${pdf.length} bytes)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
