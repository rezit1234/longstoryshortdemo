# Faktury (PDF)

Serverové generování PDF faktur ve stylu Rezit (`@react-pdf/renderer`).
Po Comgate PAID se faktura vystaví v `fulfillPaidOrder`, uloží do storage
a přiloží k prvnímu zákaznickému mailu.

## Soubory

| Soubor | Účel |
|--------|------|
| `generate-invoice-pdf.tsx` | `generateInvoicePdfBuffer(data)` → `Buffer` |
| `issue-invoice-for-order.ts` | PAID → číslo + PDF + `voucher_orders` |
| `invoice-pdf.tsx` | React-PDF layout A4 |
| `register-pdf-fonts.ts` | Roboto Regular + Bold |
| `invoice-logo.ts` | logo shopu → PNG data URL |
| `invoice-number.ts` | `LSS\|BC\|CA-YYYY-NNNN` + VS |
| `issuers.ts` | dodavatel (právní subjekt + env) |
| `spayd.ts` | SPAYD string + QR data URL |

## Dodavatel (výchozí)

Všechny shopy vystavují za **LONG STORY SHORT s.r.o.**  
(IČO 04845099, DIČ CZ04845099, účet 2114248863/2700, kontakt recepce).

Volitelně přepsat přes env:

```
INVOICE_LSS_NAME=
INVOICE_LSS_ADDRESS=
INVOICE_LSS_ICO=
INVOICE_LSS_DIC=
INVOICE_LSS_BANK_ACCOUNT=
INVOICE_LSS_IBAN=
INVOICE_LSS_SWIFT=
INVOICE_LSS_PHONE=
INVOICE_LSS_EMAIL=
INVOICE_LSS_NOTE=
# stejně INVOICE_BISTROCENTRAL_* / INVOICE_CULINARYACADEMY_*
```

## Migrace

- `007_invoice_sequences.sql` - základ
- `013_voucher_order_invoices.sql` - sloupce na order + prefixované RPC

## Později

- ARES napojení na odběratele (firma dnes bere jméno z kupujícího)
- název firmy ve formuláři checkoutu
