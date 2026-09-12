# Faktury (PDF)

Serverové generování PDF faktur ve stylu Rezit (`@react-pdf/renderer`).

## Soubory

| Soubor | Účel |
|--------|------|
| `generate-invoice-pdf.tsx` | `generateInvoicePdfBuffer(data)` → `Buffer` |
| `invoice-pdf.tsx` | React-PDF layout A4 |
| `register-pdf-fonts.ts` | Roboto Regular + Bold |
| `invoice-logo.ts` | `public/logo.png` → PNG data URL |
| `invoice-number.ts` | `VOUCHY-YYYY-NNNN` + VS (jen číslice) |
| `issuers.ts` | jeden fixní dodavatel (placeholder) |
| `spayd.ts` | SPAYD string + QR data URL |

## Fonty a logo

- Fonty: `public/fonts/Roboto-Regular.ttf`, `public/fonts/Roboto-Bold.ttf`
- Logo: `public/logo.png`

## Volání

```ts
import { generateInvoicePdfBuffer } from "@/lib/invoicing/generate-invoice-pdf";
import { getNextInvoiceNumber } from "@/lib/invoicing/invoice-number";
import { buildInvoiceQrDataUrl } from "@/lib/invoicing/spayd";

const invoiceNumber = await getNextInvoiceNumber(); // VOUCHY-2026-0001
const qrCodeDataUrl = await buildInvoiceQrDataUrl({
  amount: 1500,
  invoiceNumber,
});

const pdf = await generateInvoicePdfBuffer({
  invoiceNumber,
  issueDate: "2026-09-10",
  dueDate: "2026-09-24",
  description: "Dárkový poukaz Long Story Short",
  amount: 1500,
  customerName: "Firma s.r.o.",
  customerIco: "12345678",
  customerAddress: "Ulice 1, 110 00 Praha",
  qrCodeDataUrl, // volitelné — bez něj se QR nevykreslí
  // footerNote: "Tato faktura již byla uhrazena…",
});

// pdf je Buffer — uložte do storage / pošlete e-mailem
```

Dodavatel (`issuerName` / `issuerAddress`) se defaultně bere z `issuers.ts`.

## Číslování

Migrace: `supabase/migrations/007_invoice_sequences.sql`  
RPC `get_next_invoice_number()` → `VOUCHY-2026-0001`  
VS z čísla: `20260001`

## Později

- ARES napojení na odběratele
- splatnost z objednávky
- zda vždy QR, nebo jen u neuhrazených
- konkrétní IČO / účet / IBAN / název dodavatele v `issuers.ts`
