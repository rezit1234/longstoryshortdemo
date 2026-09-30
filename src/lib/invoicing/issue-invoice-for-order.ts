import type { ShopId } from "@/data/admin-voucher-settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateInvoicePdfBuffer } from "./generate-invoice-pdf";
import { getNextInvoiceNumber } from "./invoice-number";

export type OrderInvoicePayload = {
  recipientType?: "company" | "person" | null;
  companyId?: string;
  vatId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  addressLine1?: string;
  city?: string;
  postalCode?: string;
  note?: string;
};

type IssueInvoiceInput = {
  orderId: string;
  orderNumber: string;
  shopId: ShopId;
  totalCzk: number;
  shippingFeeCzk: number;
  quantity: number;
  productName: string;
  buyerName: string;
  invoice: OrderInvoicePayload;
  paidAt?: string | null;
};

function asTrimmed(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toDateOnly(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function customerFromInvoice(
  invoice: OrderInvoicePayload,
  buyerName: string,
): { name: string; ico: string; address: string } {
  if (invoice.recipientType === "person") {
    const name =
      [asTrimmed(invoice.firstName), asTrimmed(invoice.lastName)]
        .filter(Boolean)
        .join(" ") || buyerName;
    const parts = [
      asTrimmed(invoice.addressLine1),
      [asTrimmed(invoice.postalCode), asTrimmed(invoice.city)]
        .filter(Boolean)
        .join(" "),
    ].filter(Boolean);
    return { name, ico: "", address: parts.join(", ") };
  }

  // Firma — zatím bez ARES: jméno = kupující, IČO z formuláře.
  const ico = asTrimmed(invoice.companyId);
  const name = buyerName || (ico ? `Odběratel IČO ${ico}` : "Odběratel");
  return { name, ico, address: "" };
}

function invoiceDescription(params: {
  productName: string;
  quantity: number;
  shippingFeeCzk: number;
}) {
  const base =
    params.quantity > 1
      ? `${params.productName} × ${params.quantity}`
      : params.productName;
  if (params.shippingFeeCzk > 0) {
    return `${base} + doprava`;
  }
  return base;
}

function createInvoicePdfPath(shopId: ShopId, invoiceNumber: string) {
  const safe = invoiceNumber.replace(/[^\w.-]+/g, "_");
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}`;
  return `invoices/${shopId}/${safe}-${id}.pdf`;
}

/**
 * Vystaví PDF fakturu pro zaplacenou objednávku, uloží do storage
 * a zapíše číslo + URL na voucher_orders.
 * Idempotentní — pokud už invoice_number existuje, nic negeneruje.
 */
export async function issueInvoiceForPaidOrder(input: IssueInvoiceInput) {
  const admin = createAdminClient();

  const { data: existing, error: existingError } = await admin
    .from("voucher_orders")
    .select("invoice_number, invoice_pdf_url")
    .eq("id", input.orderId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing?.invoice_number && existing?.invoice_pdf_url) {
    return {
      skipped: true as const,
      invoiceNumber: String(existing.invoice_number),
      pdfUrl: String(existing.invoice_pdf_url),
      pdfBytes: null as Buffer | null,
    };
  }

  const issuedAt = input.paidAt ? new Date(input.paidAt) : new Date();
  const issueDate = toDateOnly(issuedAt);
  const invoiceNumber =
    existing?.invoice_number && String(existing.invoice_number).trim()
      ? String(existing.invoice_number)
      : await getNextInvoiceNumber(input.shopId);

  const customer = customerFromInvoice(input.invoice, input.buyerName);
  const description = invoiceDescription({
    productName: input.productName,
    quantity: input.quantity,
    shippingFeeCzk: input.shippingFeeCzk,
  });

  const pdfBytes = await generateInvoicePdfBuffer({
    shopId: input.shopId,
    invoiceNumber,
    issueDate,
    dueDate: issueDate,
    dueDateLabel: "Datum úhrady",
    description,
    amount: input.totalCzk,
    customerName: customer.name,
    customerIco: customer.ico,
    customerAddress: customer.address,
    paymentMethod: "Online platba (Comgate)",
    footerNote:
      "Tato faktura byla uhrazena online přes platební bránu Comgate.",
  });

  const path = createInvoicePdfPath(input.shopId, invoiceNumber);
  const { error: uploadError } = await admin.storage
    .from("voucher-pdfs")
    .upload(path, pdfBytes, {
      contentType: "application/pdf",
      upsert: false,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("voucher-pdfs").getPublicUrl(path);

  const { error: updateError } = await admin
    .from("voucher_orders")
    .update({
      invoice_number: invoiceNumber,
      invoice_pdf_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.orderId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    skipped: false as const,
    invoiceNumber,
    pdfUrl: publicUrl,
    pdfBytes,
  };
}
