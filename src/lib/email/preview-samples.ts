import type { ShopId } from "@/data/admin-voucher-settings";
import {
  buildOpsFulfillmentEmailHtml,
  type SendOpsFulfillmentEmailInput,
} from "@/lib/email/send-ops-fulfillment-email";
import {
  buildVoucherEmailHtml,
  type SendVoucherEmailInput,
  type VoucherEmailAttachment,
} from "@/lib/email/send-voucher-email";
import { getShopBrand } from "@/data/shops";

export type EmailPreviewSample = {
  id: string;
  group: "customer" | "ops";
  title: string;
  description: string;
  subject: string;
  shopId: ShopId;
  html: string;
};

function fakePdf(filename: string): VoucherEmailAttachment {
  return {
    filename,
    content: Buffer.from("%PDF-1.4 preview-placeholder"),
  };
}

function voucherBase(
  shopId: ShopId,
  overrides: Partial<SendVoucherEmailInput> = {},
): SendVoucherEmailInput {
  return {
    shopId,
    to: "zakaznik@example.cz",
    buyerName: "Tomáš Dočekal",
    recipientName: "Tomáš Dočekal",
    productName: "The Arc | „Výklenek“",
    code: "HPLDZ9YX",
    validUntil: "28. 9. 2027",
    orderNumber: "LSS-20260928-001",
    deliveryMethod: "email",
    message: null,
    ...overrides,
  };
}

function opsBase(
  shopId: ShopId,
  deliveryMethod: "post" | "pickup",
  overrides: Partial<SendOpsFulfillmentEmailInput> = {},
): SendOpsFulfillmentEmailInput {
  return {
    shopId,
    orderNumber:
      shopId === "bistrocentral"
        ? "BC-20260928-014"
        : shopId === "culinaryacademy"
          ? "CA-20260928-003"
          : "LSS-20260928-001",
    deliveryMethod,
    productName: "Poukaz 1 000 Kč",
    quantity: 1,
    codes: ["UG2HC4XH"],
    buyerName: "Tomáš Dočekal",
    buyerEmail: "tomas@example.cz",
    buyerPhone: "+420 777 123 456",
    recipientName: "Jana Nováková",
    shippingAddress:
      deliveryMethod === "post"
        ? {
            name: "Jana Nováková",
            address: "Národní 12",
            city: "Praha",
            postalCode: "110 00",
            country: "Česko",
          }
        : null,
    message: deliveryMethod === "post" ? "Veselé Vánoce!" : null,
    unitPriceCzk: 1000,
    shippingFeeCzk: deliveryMethod === "post" ? 105 : 0,
    ...overrides,
  };
}

function voucherSubject(input: SendVoucherEmailInput) {
  const brand = getShopBrand(input.shopId);
  const hasInvoice = (input.attachments ?? []).some((file) =>
    /faktura|invoice/i.test(file.filename),
  );
  return hasInvoice
    ? `Váš dárkový poukaz a faktura ${input.code} – ${brand.brandName}`
    : `Váš dárkový poukaz ${input.code} – ${brand.brandName}`;
}

function opsSubject(input: SendOpsFulfillmentEmailInput) {
  const brand = getShopBrand(input.shopId);
  const kindLabel =
    input.deliveryMethod === "post" ? "k odeslání" : "k vyzvednutí";
  return `${brand.brandName}: objednávka ${input.orderNumber} ${kindLabel}`;
}

export function getEmailPreviewSamples(): EmailPreviewSample[] {
  const samples: EmailPreviewSample[] = [];

  const shops: ShopId[] = ["lss", "bistrocentral", "culinaryacademy"];

  for (const shopId of shops) {
    const brand = getShopBrand(shopId);
    const withPdf = voucherBase(shopId, {
      attachments: [fakePdf(`poukaz-HPLDZ9YX.pdf`)],
    });
    samples.push({
      id: `customer-email-pdf-${shopId}`,
      group: "customer",
      title: `${brand.brandName} · e-mail + PDF`,
      description: "Digitální doručení s přílohou poukazu (hlavní zákaznický mail).",
      subject: voucherSubject(withPdf),
      shopId,
      html: buildVoucherEmailHtml(withPdf),
    });
  }

  const emailNoPdf = voucherBase("lss", { attachments: [] });
  samples.push({
    id: "customer-email-no-pdf",
    group: "customer",
    title: "LSS · e-mail bez PDF",
    description: "Když ještě není šablona / pozice — mail bez přílohy.",
    subject: voucherSubject(emailNoPdf),
    shopId: "lss",
    html: buildVoucherEmailHtml(emailNoPdf),
  });

  const postCustomer = voucherBase("lss", {
    deliveryMethod: "post",
    recipientName: "Jana Nováková",
    attachments: [fakePdf("poukaz-HPLDZ9YX.pdf")],
  });
  samples.push({
    id: "customer-post",
    group: "customer",
    title: "Zákazník · pošta",
    description: "Zákazník dostane digitální kopii; fyzický poukaz jde poštou.",
    subject: voucherSubject(postCustomer),
    shopId: "lss",
    html: buildVoucherEmailHtml(postCustomer),
  });

  const pickupCustomer = voucherBase("bistrocentral", {
    deliveryMethod: "pickup",
    productName: "Poukaz 1 500 Kč",
    attachments: [fakePdf("poukaz-HPLDZ9YX.pdf")],
  });
  samples.push({
    id: "customer-pickup",
    group: "customer",
    title: "Zákazník · vyzvednutí",
    description: "Zákazník má digitální kopii; fyzický poukaz vyzvedne na pobočce.",
    subject: voucherSubject(pickupCustomer),
    shopId: "bistrocentral",
    html: buildVoucherEmailHtml(pickupCustomer),
  });

  const withInvoice = voucherBase("lss", {
    attachments: [
      fakePdf("poukaz-HPLDZ9YX.pdf"),
      fakePdf("faktura-LSS-20260928-001.pdf"),
    ],
  });
  samples.push({
    id: "customer-voucher-invoice",
    group: "customer",
    title: "Zákazník · poukaz + faktura",
    description: "Budoucí stav: jeden mail, dvě PDF přílohy (až napojíme faktury).",
    subject: voucherSubject(withInvoice),
    shopId: "lss",
    html: buildVoucherEmailHtml(withInvoice),
  });

  const opsPost = opsBase("lss", "post");
  samples.push({
    id: "ops-post",
    group: "ops",
    title: "Interní · pošta",
    description: "Notifikace provozu: připravit balení a odeslat.",
    subject: opsSubject(opsPost),
    shopId: "lss",
    html: buildOpsFulfillmentEmailHtml(opsPost),
  });

  const opsPickup = opsBase("culinaryacademy", "pickup", {
    productName: "Kurz: Základy kuchyně",
    codes: ["CA7K2M9P", "CA8N3Q1R"],
    quantity: 2,
    unitPriceCzk: 3200,
  });
  samples.push({
    id: "ops-pickup",
    group: "ops",
    title: "Interní · vyzvednutí",
    description: "Notifikace provozu: připravit poukazy k osobnímu převzetí.",
    subject: opsSubject(opsPickup),
    shopId: "culinaryacademy",
    html: buildOpsFulfillmentEmailHtml(opsPickup),
  });

  return samples;
}
