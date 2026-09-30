import type { ShopId } from "@/data/admin-voucher-settings";
import { getShopBrand } from "@/data/shops";

/**
 * Dodavatel na faktuře per shop.
 * Reálné IČO / účet / IBAN / adresa: env `INVOICE_<SHOP>_…`
 * (zatím placeholdery — doplnit před ostrým provozem).
 */
export interface InvoiceIssuerConfig {
  name: string;
  address: string;
  ico: string;
  bankAccount: string;
  iban: string;
  currency: "CZK";
  /** Poznámka pod IČO (např. Neplátce DPH). */
  note: string;
  /** Prefix čísla faktury: LSS / BC / CA. */
  invoicePrefix: string;
  logoSrc: string;
}

type IssuerOverrides = Partial<
  Pick<
    InvoiceIssuerConfig,
    "name" | "address" | "ico" | "bankAccount" | "iban" | "note"
  >
>;

const ENV_KEYS: Record<
  ShopId,
  {
    name?: string;
    address?: string;
    ico?: string;
    bankAccount?: string;
    iban?: string;
    note?: string;
  }
> = {
  lss: {
    name: "INVOICE_LSS_NAME",
    address: "INVOICE_LSS_ADDRESS",
    ico: "INVOICE_LSS_ICO",
    bankAccount: "INVOICE_LSS_BANK_ACCOUNT",
    iban: "INVOICE_LSS_IBAN",
    note: "INVOICE_LSS_NOTE",
  },
  bistrocentral: {
    name: "INVOICE_BISTROCENTRAL_NAME",
    address: "INVOICE_BISTROCENTRAL_ADDRESS",
    ico: "INVOICE_BISTROCENTRAL_ICO",
    bankAccount: "INVOICE_BISTROCENTRAL_BANK_ACCOUNT",
    iban: "INVOICE_BISTROCENTRAL_IBAN",
    note: "INVOICE_BISTROCENTRAL_NOTE",
  },
  culinaryacademy: {
    name: "INVOICE_CULINARYACADEMY_NAME",
    address: "INVOICE_CULINARYACADEMY_ADDRESS",
    ico: "INVOICE_CULINARYACADEMY_ICO",
    bankAccount: "INVOICE_CULINARYACADEMY_BANK_ACCOUNT",
    iban: "INVOICE_CULINARYACADEMY_IBAN",
    note: "INVOICE_CULINARYACADEMY_NOTE",
  },
};

const DEFAULTS: Record<ShopId, InvoiceIssuerConfig> = {
  lss: {
    name: "Long Story Short",
    address: "Olomouc, Česká republika",
    ico: "00000000",
    bankAccount: "0000000000/0000",
    iban: "CZ0000000000000000000000",
    currency: "CZK",
    note: "Neplátce DPH",
    invoicePrefix: "LSS",
    logoSrc: "/logo.png",
  },
  bistrocentral: {
    name: "Bistro Central",
    address: "Olomouc, Česká republika",
    ico: "00000000",
    bankAccount: "0000000000/0000",
    iban: "CZ0000000000000000000000",
    currency: "CZK",
    note: "Neplátce DPH",
    invoicePrefix: "BC",
    logoSrc: "/bistrokruh.webp",
  },
  culinaryacademy: {
    name: "Culinary Academy",
    address: "Olomouc, Česká republika",
    ico: "00000000",
    bankAccount: "0000000000/0000",
    iban: "CZ0000000000000000000000",
    currency: "CZK",
    note: "Neplátce DPH",
    invoicePrefix: "CA",
    logoSrc: "/CACA.webp",
  },
};

function envTrim(key: string | undefined): string | undefined {
  if (!key) return undefined;
  const value = process.env[key]?.trim();
  return value || undefined;
}

function overridesFromEnv(shopId: ShopId): IssuerOverrides {
  const keys = ENV_KEYS[shopId];
  return {
    name: envTrim(keys.name),
    address: envTrim(keys.address),
    ico: envTrim(keys.ico),
    bankAccount: envTrim(keys.bankAccount),
    iban: envTrim(keys.iban),
    note: envTrim(keys.note),
  };
}

/** @deprecated Prefer getInvoiceIssuer(shopId). */
export const INVOICE_ISSUER: InvoiceIssuerConfig = DEFAULTS.lss;

export function getInvoiceIssuer(shopId: ShopId | string): InvoiceIssuerConfig {
  const id = (shopId in DEFAULTS ? shopId : "lss") as ShopId;
  const brand = getShopBrand(id);
  const base = DEFAULTS[id];
  const env = overridesFromEnv(id);

  return {
    ...base,
    name: env.name ?? brand.brandName,
    address: env.address ?? base.address,
    ico: env.ico ?? base.ico,
    bankAccount: env.bankAccount ?? base.bankAccount,
    iban: env.iban ?? base.iban,
    note: env.note ?? base.note,
    logoSrc: brand.logoSrc || base.logoSrc,
  };
}
