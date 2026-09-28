import { redirect } from "next/navigation";

/** Starý URL — přesměrování na Obchody → LSS. */
export default function AdminNastaveniPoukazuRedirect() {
  redirect("/admin/obchody/lss");
}
