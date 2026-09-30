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
| `issuers.ts` | dodavatel per shop (+ env) |
| `spayd.ts` | SPAYD string + QR data URL |

## Env (před ostreem doplnit)

```
INVOICE_LSS_ICO=
INVOICE_LSS_ADDRESS=
INVOICE_LSS_BANK_ACCOUNT=
INVOICE_LSS_IBAN=
INVOICE_LSS_NOTE=Neplátce DPH
# stejně INVOICE_BISTROCENTRAL_* / INVOICE_CULINARYACADEMY_*
```

## Migrace

- `007_invoice_sequences.sql` — základ
- `013_voucher_order_invoices.sql` — sloupce na order + prefixované RPC

## Později

- ARES napojení na odběratele (firma dnes bere jméno z kupujícího)
- název firmy ve formuláři checkoutu
