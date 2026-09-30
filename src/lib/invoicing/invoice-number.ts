import type { ShopId } from "@/data/admin-voucher-settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { getInvoiceIssuer } from "./issuers";

/** Z `LSS-2026-0001` → `20260001` (jen číslice pro VS / SPAYD). */
export function invoiceNumberToVariableSymbol(invoiceNumber: string): string {
  return invoiceNumber.replace(/\D/g, "");
}

export function formatInvoiceNumber(
  prefix: string,
  year: number,
  sequence: number,
): string {
  return `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Atomicky vrátí další číslo faktury ve formátu `LSS|BC|CA-YYYY-NNNN`.
 * Vyžaduje migraci `007` + `013` (RPC `get_next_invoice_number`).
 */
export async function getNextInvoiceNumber(
  shopId: ShopId | string = "lss",
): Promise<string> {
  const prefix = getInvoiceIssuer(shopId).invoicePrefix;
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_next_invoice_number", {
    p_prefix: prefix,
  });

  if (error) {
    // Fallback: starší RPC bez parametru (jen VOUCHY-…).
    const legacy = await supabase.rpc("get_next_invoice_number");
    if (legacy.error) throw error;
    if (legacy.data == null) {
      throw new Error("Nepodařilo se vygenerovat číslo faktury");
    }
    return String(legacy.data).replace(/^VOUCHY-/i, `${prefix}-`);
  }

  if (data === null || data === undefined) {
    throw new Error("Nepodařilo se vygenerovat číslo faktury");
  }

  return String(data);
}
