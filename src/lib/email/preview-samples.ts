import type { ShopId } from "@/data/admin-voucher-settings";
import {
  buildOpsFulfillmentEmailHtml,
  opsFulfillmentEmailSubject,
  type SendOpsFulfillmentEmailInput,
} from "@/lib/email/send-ops-fulfillment-email";
import {
  buildRedemptionEmailHtml,
  redemptionEmailSubject,
} from "@/lib/email/send-redemption-email";
import {
  buildVoucherEmailHtml,
  voucherEmailSubject,
  type SendVoucherEmailInput,
  type VoucherEmailAttachment,
} from "@/lib/email/send-voucher-email";
import { getEnabledShopIds, getShopBrand } from "@/data/shops";

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

export function getEmailPreviewSamples(): EmailPreviewSample[] {
  const samples: EmailPreviewSample[] = [];
  const shops: ShopId[] = getEnabledShopIds();

  for (const shopId of shops) {
    const brand = getShopBrand(shopId);
    const withPdf = voucherBase(shopId, {
      attachments: [fakePdf(`poukaz-HPLDZ9YX.pdf`)],
    });
    samples.push({
      id: `customer-email-pdf-${shopId}`,
      group: "customer",
      title: `${brand.brandName} - e-mail + PDF`,
      description: "Digitální doručení s přílohou poukazu (hlavní zákaznický mail).",
      subject: voucherEmailSubject(withPdf),
      shopId,
      html: buildVoucherEmailHtml(withPdf),
    });
  }

  const postCustomer = voucherBase("lss", {
    deliveryMethod: "post",
    recipientName: "Jana Nováková",
    attachments: [fakePdf("poukaz-HPLDZ9YX.pdf")],
  });
  samples.push({
    id: "customer-post",
    group: "customer",
    title: "Zákazník - pošta",
    description: "Zákazník dostane digitální kopii; fyzický poukaz jde poštou.",
    subject: voucherEmailSubject(postCustomer),
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
    title: "Zákazník - vyzvednutí",
    description: "Zákazník má digitální kopii; fyzický poukaz vyzvedne na pobočce.",
    subject: voucherEmailSubject(pickupCustomer),
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
    title: "Zákazník - poukaz + faktura",
    description:
      "Jeden mail, dvě PDF přílohy: dárkový poukaz + daňový doklad.",
    subject: voucherEmailSubject(withInvoice),
    shopId: "lss",
    html: buildVoucherEmailHtml(withInvoice),
  });

  const multiQty = voucherBase("lss", {
    codes: ["LSSAAA11111", "LSSBBB22222", "LSSCCC33333"],
    code: "LSSAAA11111",
    productName: "Chef's Table",
    attachments: [
      fakePdf("poukaz-LSSAAA11111.pdf"),
      fakePdf("poukaz-LSSBBB22222.pdf"),
      fakePdf("poukaz-LSSCCC33333.pdf"),
      fakePdf("faktura-LSS-20260928-001.pdf"),
    ],
  });
  samples.push({
    id: "customer-multi-qty",
    group: "customer",
    title: "Zákazník - množství (1 mail)",
    description:
      "Jeden e-mail se všemi PDF poukazy (+ faktura). Ne jeden mail na kus.",
    subject: voucherEmailSubject(multiQty),
    shopId: "lss",
    html: buildVoucherEmailHtml(multiQty),
  });

  const redemptionAmount = {
    shopId: "lss" as const,
    to: "maminka@example.cz",
    recipientName: "Jana Nováková",
    productName: "Poukaz 1 000 Kč",
    code: "HPLDZ9YX",
    validUntil: "28. 9. 2027",
    kind: "amount" as const,
    amountCzk: 400,
    remainingCzk: 600,
    fullyRedeemed: false,
  };
  samples.push({
    id: "customer-redemption-amount",
    group: "customer",
    title: "Obdarovaný - částečné uplatnění (částka)",
    description: "Jen když je dárek a máme e-mail obdarovaného.",
    subject: redemptionEmailSubject(redemptionAmount),
    shopId: "lss",
    html: buildRedemptionEmailHtml(redemptionAmount),
  });

  const redemptionPart = {
    shopId: "lss" as const,
    to: "maminka@example.cz",
    recipientName: "Jana Nováková",
    productName: "The Arc & Chef's Table",
    code: "HPLDZ9YX",
    validUntil: "28. 9. 2027",
    kind: "part" as const,
    partLabel: "Chef's Table",
    remainingPartLabels: ["Ubytování"],
    fullyRedeemed: false,
  };
  samples.push({
    id: "customer-redemption-part",
    group: "customer",
    title: "Obdarovaný - částečné uplatnění (kombinace)",
    description: "Uplatněna jedna část kombinovaného poukazu.",
    subject: redemptionEmailSubject(redemptionPart),
    shopId: "lss",
    html: buildRedemptionEmailHtml(redemptionPart),
  });

  const redemptionFull = {
    shopId: "lss" as const,
    to: "maminka@example.cz",
    recipientName: "Jana Nováková",
    productName: "The Arc | „Výklenek“",
    code: "HPLDZ9YX",
    validUntil: "28. 9. 2027",
    kind: "full" as const,
    fullyRedeemed: true,
  };
  samples.push({
    id: "customer-redemption-full",
    group: "customer",
    title: "Obdarovaný - plné uplatnění",
    description: "Poukaz je kompletně vyčerpaný.",
    subject: redemptionEmailSubject(redemptionFull),
    shopId: "lss",
    html: buildRedemptionEmailHtml(redemptionFull),
  });

  const opsPost: SendOpsFulfillmentEmailInput = {
    shopId: "lss",
    deliveryMethod: "post",
    productName: "Částka 2 000 Kč",
    quantity: 1,
    codes: ["LSSK7M2P9A"],
    buyerName: "Michal Novák",
    buyerEmail: "mi.novak8@gmail.com",
    buyerPhone: "723054281",
    recipientName: "Lenka",
    recipientEmail: "lenka@example.cz",
    shippingAddress: {
      name: "Lenka Nováková",
      address: "Národní 12",
      city: "Praha",
      postalCode: "110 00",
      country: "Česko",
    },
    message: null,
    unitPriceCzk: 2000,
    shippingFeeCzk: 89,
  };
  samples.push({
    id: "ops-post",
    group: "ops",
    title: "Provoz - odeslání poštou",
    description:
      "Interní notifikace na OPS_NOTIFY_EMAIL (provoz: reception@longstoryshort.cz).",
    subject: opsFulfillmentEmailSubject(opsPost),
    shopId: "lss",
    html: buildOpsFulfillmentEmailHtml(opsPost),
  });

  const opsPickup: SendOpsFulfillmentEmailInput = {
    shopId: "bistrocentral",
    deliveryMethod: "pickup",
    productName: "Částka 1 500 Kč",
    quantity: 1,
    codes: ["BCSHMZHK5D"],
    buyerName: "Jan Novák",
    buyerEmail: "jan@novak.cz",
    buyerPhone: "123123123",
    recipientName: "Jan Novák",
    recipientEmail: null,
    shippingAddress: null,
    message: null,
    unitPriceCzk: 1500,
    shippingFeeCzk: 0,
  };
  samples.push({
    id: "ops-pickup",
    group: "ops",
    title: "Provoz - vyzvednutí na pobočce",
    description:
      "Interní notifikace na OPS_NOTIFY_EMAIL (provoz: reception@longstoryshort.cz).",
    subject: opsFulfillmentEmailSubject(opsPickup),
    shopId: "bistrocentral",
    html: buildOpsFulfillmentEmailHtml(opsPickup),
  });

  return samples;
}
