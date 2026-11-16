"use client";

import { useEffect } from "react";
import { trackMetaEvent } from "@/lib/meta-pixel";

type MetaPurchaseTrackerProps = {
  orderNumber: string;
  valueCzk: number | null;
};

/**
 * Po úspěšné platbě pošle Meta Purchase (jednou na objednávku v session).
 */
export function MetaPurchaseTracker({
  orderNumber,
  valueCzk,
}: MetaPurchaseTrackerProps) {
  useEffect(() => {
    if (!orderNumber) return;

    const key = `meta-purchase:${orderNumber}`;
    try {
      if (sessionStorage.getItem(key) === "1") return;
      sessionStorage.setItem(key, "1");
    } catch {
      // private mode / blocked storage — stejně zkusíme tracknout
    }

    trackMetaEvent(
      "Purchase",
      valueCzk != null && valueCzk > 0
        ? { value: valueCzk, currency: "CZK", content_type: "product" }
        : { currency: "CZK", content_type: "product" },
    );
  }, [orderNumber, valueCzk]);

  return null;
}
