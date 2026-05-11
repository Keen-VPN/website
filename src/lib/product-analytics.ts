type ProductAnalyticsPayload = Record<string, string | number | boolean | null>;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function trackProductEngagement(
  eventName: "why_keenvpn_viewed" | "comparison_section_clicked",
  payload: ProductAnalyticsPayload = {},
): void {
  if (typeof window === "undefined") return;

  const detail = {
    ...payload,
    event: eventName,
  };

  window.dataLayer?.push(detail);
  window.dispatchEvent(
    new CustomEvent("keen_product_engagement", { detail }),
  );
}
