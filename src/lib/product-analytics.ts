type ProductAnalyticsPayload = Record<string, string | number | boolean | null>;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export type ProductEngagementEvent =
  | "why_keenvpn_viewed"
  | "comparison_section_clicked"
  | "annual_plan_viewed"
  | "annual_upgrade_clicked"
  | "annual_upgrade_completed";

export function trackProductEngagement(
  eventName: ProductEngagementEvent,
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
