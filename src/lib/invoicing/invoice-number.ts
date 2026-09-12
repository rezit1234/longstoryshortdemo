import { createAdminClient } from "@/lib/supabase/admin";

const INVOICE_PREFIX = "VOUCHY";

/** Z `VOUCHY-2026-0001` → `20260001` (jen číslice pro VS / SPAYD). */
export function invoiceNumberToVariableSymbol(invoiceNumber: string): string {
  return invoiceNumber.replace(/\D/g, "");
}

export function formatInvoiceNumber(year: number, sequence: number): string {
  return `${INVOICE_PREFIX}-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Atomicky vrátí další číslo faktury ve formátu `VOUCHY-YYYY-NNNN`.
 * Vyžaduje migraci `007_invoice_sequences.sql` (RPC `get_next_invoice_number`).
 */
export async function getNextInvoiceNumber(): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_next_invoice_number");

  if (error) throw error;
  if (data === null || data === undefined) {
    throw new Error("Nepodařilo se vygenerovat číslo faktury");
  }

  return String(data);
}
