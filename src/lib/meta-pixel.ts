/** Meta Pixel ID (Events Manager) — společný pro LSS i Bistro Central. */
export const META_PIXEL_ID = "1445390744424139";

export type MetaPixelEventParams = {
  value?: number;
  currency?: string;
  content_name?: string;
  content_ids?: string[];
  content_type?: string;
  num_items?: number;
};

declare global {
  interface Window {
    fbq?: (
      action: "init" | "track" | "trackCustom" | "trackSingle",
      eventOrId: string,
      params?: MetaPixelEventParams | string,
      options?: Record<string, unknown>,
    ) => void;
  }
}

export function trackMetaEvent(
  event: string,
  params?: MetaPixelEventParams,
) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") {
    return;
  }
  window.fbq("track", event, params);
}
