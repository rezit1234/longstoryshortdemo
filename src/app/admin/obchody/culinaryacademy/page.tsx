import { notFound } from "next/navigation";
import { AdminObchod } from "@/components/admin/AdminObchod";
import { isShopEnabled } from "@/data/shops";

export default function AdminObchodCulinaryAcademyPage() {
  if (!isShopEnabled("culinaryacademy")) {
    notFound();
  }

  return (
    <AdminObchod shopId="culinaryacademy" shopName="Culinary Academy" />
  );
}
