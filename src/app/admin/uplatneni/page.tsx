import { Suspense } from "react";
import { AdminUplatneni } from "@/components/admin/AdminUplatneni";

export default function AdminUplatneniPage() {
  return (
    <Suspense fallback={null}>
      <AdminUplatneni />
    </Suspense>
  );
}
