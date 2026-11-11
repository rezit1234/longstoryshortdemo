import { EmbedHeightReporter } from "@/components/EmbedHeightReporter";
import { VoucherShop } from "@/components/VoucherShop";

export default function LssShopPage() {
  return (
    <main>
      <EmbedHeightReporter />
      <VoucherShop shopId="lss" />
    </main>
  );
}
