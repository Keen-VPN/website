import { forwardProductEventToPostHog } from "@/lib/posthog-analytics";

type ProductAnalyticsPayload = Record<string, string | number | boolean | null>;

function emitProductEvent(
  eventName: string,
  payload: ProductAnalyticsPayload,
  customEventName: string,
): void {
  if (typeof window === "undefined") return;

  const detail = {
    ...payload,
    event: eventName,
  };

  window.dataLayer?.push(detail);
  window.dispatchEvent(new CustomEvent(customEventName, { detail }));
  // Keep navigation_path out of PostHog — it can carry Stripe session ids.
  const { navigation_path: _navigationPath, ...posthogPayload } = payload;
  void _navigationPath;
  forwardProductEventToPostHog(eventName, posthogPayload);
}

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
  emitProductEvent(eventName, payload, "keen_annual_subscription");
}

export type TwoYearSubscriptionEventName =
  | "two_year_plan_viewed"
  | "two_year_switch_clicked"
  | "two_year_switch_completed";

export function trackTwoYearSubscriptionEvent(
  eventName: TwoYearSubscriptionEventName,
  payload: ProductAnalyticsPayload = {},
): void {
  emitProductEvent(eventName, payload, "keen_two_year_subscription");
}

export function trackProductEngagement(
  eventName: "why_keenvpn_viewed" | "comparison_section_clicked",
  payload: ProductAnalyticsPayload = {},
): void {
  emitProductEvent(eventName, payload, "keen_product_engagement");
}

export type WorkspaceEventName =
  | "workspace_impression"
  | "workspace_feature_opened";

export function trackWorkspaceEvent(
  eventName: WorkspaceEventName,
  payload: ProductAnalyticsPayload = {},
): void {
  emitProductEvent(eventName, payload, "keen_workspace");
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
  emitProductEvent(eventName, payload, "keen_switch_page");
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
  emitProductEvent(eventName, payload, "keen_perks");
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
  emitProductEvent(eventName, payload, "keen_perks_landing");
}

export type ServerPageEventName =
  | "servers_page_viewed"
  | "server_location_searched"
  | "server_location_requested";

export function trackServerPageEvent(
  eventName: ServerPageEventName,
  payload: ProductAnalyticsPayload = {},
): void {
  emitProductEvent(eventName, payload, "keen_server_page");
}
