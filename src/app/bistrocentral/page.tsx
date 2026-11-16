import { EmbedHeightReporter } from "@/components/EmbedHeightReporter";
import { MetaPixel } from "@/components/MetaPixel";
import { VoucherShop } from "@/components/VoucherShop";

export default function BistroCentralShopPage() {
  return (
    <main>
      <MetaPixel />
      <EmbedHeightReporter />
      <VoucherShop shopId="bistrocentral" />
    </main>
  );
}
