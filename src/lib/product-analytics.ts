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

export type PerkAnalyticsEventName =
  | "perk_viewed"
  | "perk_clicked"
  | "perk_claimed"
  | "perk_unclaimed"
  | "perk_snoozed"
  | "perk_restored_to_new"
  | "perk_marked_not_interested"
  | "perk_moved_from_snoozed_to_not_interested"
  | "perk_moved_from_not_interested_to_snoozed"
  | "perk_workflow_cancelled";

export function trackPerksEvent(
  eventName: PerkAnalyticsEventName,
  payload: ProductAnalyticsPayload = {},
): void {
  if (typeof window === "undefined") return;

  const detail = {
    ...payload,
    event: eventName,
  };

  window.dataLayer?.push(detail);
  window.dispatchEvent(new CustomEvent("keen_perks", { detail }));
}

export type PerksLandingEventName =
  | "perks_section_viewed"
  | "perks_cta_clicked"
  | "perks_page_visited"
  | "signup_after_perks_view"
  | "trial_after_perks_view"
  | "subscription_after_perks_view";

export function trackPerksLandingEvent(
  eventName: PerksLandingEventName,
  payload: ProductAnalyticsPayload = {},
): void {
  if (typeof window === "undefined") return;

  const detail = {
    ...payload,
    event: eventName,
  };

  window.dataLayer?.push(detail);
  window.dispatchEvent(new CustomEvent("keen_perks_landing", { detail }));
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
