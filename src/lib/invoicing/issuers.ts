import type { ShopId } from "@/data/admin-voucher-settings";
import { getShopBrand } from "@/data/shops";

/**
 * Dodavatel na faktuře.
 * Právní subjekt je jeden (LONG STORY SHORT s.r.o.) pro všechny shopy;
 * liší se jen logo / prefix čísla faktury.
 * Env `INVOICE_<SHOP>_…` případně přepíše jednotlivá pole.
 */
export interface InvoiceIssuerConfig {
  name: string;
  address: string;
  ico: string;
  dic: string;
  bankAccount: string;
  iban: string;
  swift: string;
  phone: string;
  email: string;
  currency: "CZK";
  /** Poznámka pod DIČ (zápis v OR, DPH apod.). */
  note: string;
  /** Prefix čísla faktury: LSS / BC / CA. */
  invoicePrefix: string;
  logoSrc: string;
}

type IssuerOverrides = Partial<
  Pick<
    InvoiceIssuerConfig,
    | "name"
    | "address"
    | "ico"
    | "dic"
    | "bankAccount"
    | "iban"
    | "swift"
    | "phone"
    | "email"
    | "note"
  >
>;

const ENV_KEYS: Record<
  ShopId,
  {
    name?: string;
    address?: string;
    ico?: string;
    dic?: string;
    bankAccount?: string;
    iban?: string;
    swift?: string;
    phone?: string;
    email?: string;
    note?: string;
  }
> = {
  lss: {
    name: "INVOICE_LSS_NAME",
    address: "INVOICE_LSS_ADDRESS",
    ico: "INVOICE_LSS_ICO",
    dic: "INVOICE_LSS_DIC",
    bankAccount: "INVOICE_LSS_BANK_ACCOUNT",
    iban: "INVOICE_LSS_IBAN",
    swift: "INVOICE_LSS_SWIFT",
    phone: "INVOICE_LSS_PHONE",
    email: "INVOICE_LSS_EMAIL",
    note: "INVOICE_LSS_NOTE",
  },
  bistrocentral: {
    name: "INVOICE_BISTROCENTRAL_NAME",
    address: "INVOICE_BISTROCENTRAL_ADDRESS",
    ico: "INVOICE_BISTROCENTRAL_ICO",
    dic: "INVOICE_BISTROCENTRAL_DIC",
    bankAccount: "INVOICE_BISTROCENTRAL_BANK_ACCOUNT",
    iban: "INVOICE_BISTROCENTRAL_IBAN",
    swift: "INVOICE_BISTROCENTRAL_SWIFT",
    phone: "INVOICE_BISTROCENTRAL_PHONE",
    email: "INVOICE_BISTROCENTRAL_EMAIL",
    note: "INVOICE_BISTROCENTRAL_NOTE",
  },
  culinaryacademy: {
    name: "INVOICE_CULINARYACADEMY_NAME",
    address: "INVOICE_CULINARYACADEMY_ADDRESS",
    ico: "INVOICE_CULINARYACADEMY_ICO",
    dic: "INVOICE_CULINARYACADEMY_DIC",
    bankAccount: "INVOICE_CULINARYACADEMY_BANK_ACCOUNT",
    iban: "INVOICE_CULINARYACADEMY_IBAN",
    swift: "INVOICE_CULINARYACADEMY_SWIFT",
    phone: "INVOICE_CULINARYACADEMY_PHONE",
    email: "INVOICE_CULINARYACADEMY_EMAIL",
    note: "INVOICE_CULINARYACADEMY_NOTE",
  },
};

/** Společný právní subjekt pro všechny značky. */
const LEGAL_ENTITY = {
  name: "LONG STORY SHORT s.r.o.",
  address: "1. máje 803/1, 779 00 Olomouc, Česká republika",
  ico: "04845099",
  dic: "CZ04845099",
  bankAccount: "2114248863/2700",
  iban: "CZ1027000000002114248863",
  swift: "BACXCZPP",
  phone: "+420 727 800 600",
  email: "reception@longstoryshort.cz",
  currency: "CZK" as const,
  note: "C 65365 vedená u Krajského soudu v Ostravě",
};

const DEFAULTS: Record<ShopId, InvoiceIssuerConfig> = {
  lss: {
    ...LEGAL_ENTITY,
    invoicePrefix: "LSS",
    logoSrc: "/logo.png",
  },
  bistrocentral: {
    ...LEGAL_ENTITY,
    invoicePrefix: "BC",
    logoSrc: "/bistrokruh.png",
  },
  culinaryacademy: {
    ...LEGAL_ENTITY,
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
    dic: envTrim(keys.dic),
    bankAccount: envTrim(keys.bankAccount),
    iban: envTrim(keys.iban),
    swift: envTrim(keys.swift),
    phone: envTrim(keys.phone),
    email: envTrim(keys.email),
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
    name: env.name ?? base.name,
    address: env.address ?? base.address,
    ico: env.ico ?? base.ico,
    dic: env.dic ?? base.dic,
    bankAccount: env.bankAccount ?? base.bankAccount,
    iban: env.iban ?? base.iban,
    swift: env.swift ?? base.swift,
    phone: env.phone ?? base.phone,
    email: env.email ?? base.email,
    note: env.note ?? base.note,
    logoSrc: brand.logoSrc || base.logoSrc,
  };
}
