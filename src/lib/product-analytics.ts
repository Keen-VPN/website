type ProductAnalyticsPayload = Record<string, string | number | boolean | null>;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export type AnnualSubscriptionEventName =
  | "annual_plan_viewed"
  | "annual_upgrade_clicked"
  | "annual_upgrade_completed";

export function trackAnnualSubscriptionEvent(
  eventName: AnnualSubscriptionEventName,
  payload: ProductAnalyticsPayload = {},
): void {
  if (typeof window === "undefined") return;

  const detail = {
    ...payload,
    event: eventName,
  };

  window.dataLayer?.push(detail);
  window.dispatchEvent(
    new CustomEvent("keen_annual_subscription", { detail }),
  );
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

export type SwitchPageEventName =
  | "switch_page_viewed"
  | "switch_cta_clicked"
  | "switch_request_started"
  | "switch_request_completed";

export function trackSwitchPageEvent(
  eventName: SwitchPageEventName,
  payload: ProductAnalyticsPayload = {},
): void {
  if (typeof window === "undefined") return;

  const detail = {
    ...payload,
    event: eventName,
  };

  window.dataLayer?.push(detail);
  window.dispatchEvent(new CustomEvent("keen_switch_page", { detail }));
}

export type ServerPageEventName =
  | "servers_page_viewed"
  | "server_location_searched"
  | "server_location_requested";

export function trackServerPageEvent(
  eventName: ServerPageEventName,
  payload: ProductAnalyticsPayload = {},
): void {
  if (typeof window === "undefined") return;

  const detail = {
    ...payload,
    event: eventName,
  };

  window.dataLayer?.push(detail);
  window.dispatchEvent(new CustomEvent("keen_server_page", { detail }));
}
