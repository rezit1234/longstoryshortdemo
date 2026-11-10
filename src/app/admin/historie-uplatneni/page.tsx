import { Suspense } from "react";
import { AdminHistorieUplatneni } from "@/components/admin/AdminHistorieUplatneni";

export default function AdminHistorieUplatneniPage() {
  return (
    <Suspense fallback={null}>
      <AdminHistorieUplatneni />
    </Suspense>
  );
}
