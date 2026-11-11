import { EmbedHeightReporter } from "@/components/EmbedHeightReporter";
import { VoucherShop } from "@/components/VoucherShop";

export default function BistroCentralShopPage() {
  return (
    <main>
      <EmbedHeightReporter />
      <VoucherShop shopId="bistrocentral" />
    </main>
  );
}
