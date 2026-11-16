import { EmbedHeightReporter } from "@/components/EmbedHeightReporter";
import { MetaPixel } from "@/components/MetaPixel";
import { VoucherShop } from "@/components/VoucherShop";

export default function LssShopPage() {
  return (
    <main>
      <MetaPixel />
      <EmbedHeightReporter />
      <VoucherShop shopId="lss" />
    </main>
  );
}
