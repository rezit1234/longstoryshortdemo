import { notFound } from "next/navigation";
import { VoucherShop } from "@/components/VoucherShop";
import { isShopEnabled } from "@/data/shops";

export default function CulinaryAcademyShopPage() {
  if (!isShopEnabled("culinaryacademy")) {
    notFound();
  }

  return (
    <main>
      <VoucherShop shopId="culinaryacademy" />
    </main>
  );
}
