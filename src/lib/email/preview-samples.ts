import type { ShopId } from "@/data/admin-voucher-settings";
import {
  buildVoucherEmailHtml,
  voucherEmailSubject,
  type SendVoucherEmailInput,
  type VoucherEmailAttachment,
} from "@/lib/email/send-voucher-email";
import { getShopBrand } from "@/data/shops";

export type EmailPreviewSample = {
  id: string;
  group: "customer";
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
  const shops: ShopId[] = ["lss", "bistrocentral", "culinaryacademy"];

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

  const emailNoPdf = voucherBase("lss", { attachments: [] });
  samples.push({
    id: "customer-email-no-pdf",
    group: "customer",
    title: "LSS - e-mail bez PDF",
    description: "Když ještě není šablona / pozice - mail bez přílohy.",
    subject: voucherEmailSubject(emailNoPdf),
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
    description: "Budoucí stav: jeden mail, dvě PDF přílohy (až napojíme faktury).",
    subject: voucherEmailSubject(withInvoice),
    shopId: "lss",
    html: buildVoucherEmailHtml(withInvoice),
  });

  return samples;
}
