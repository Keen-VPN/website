import { getSessionToken } from "@/auth/backend";
import { trackProductEngagement } from "@/lib/product-analytics";

export type AnnualPlanAnalyticsEvent =
  | "annual_plan_viewed"
  | "annual_upgrade_clicked"
  | "annual_upgrade_completed";

type TrackAnnualPlanEventOptions = {
  source?: string;
  /** When false, only pushes to dataLayer (e.g. anonymous pricing page view). */
  persistToBackend?: boolean;
};

export async function trackAnnualPlanEvent(
  eventName: AnnualPlanAnalyticsEvent,
  options: TrackAnnualPlanEventOptions = {},
): Promise<void> {
  const { source, persistToBackend = true } = options;

  trackProductEngagement(eventName, {
    platform: "web",
    ...(source ? { source } : {}),
  });

  if (!persistToBackend) return;

  const token = getSessionToken();
  if (!token) return;

  try {
    const backendUrl =
      import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
    await fetch(`${backendUrl}/subscription/events/annual-plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        event_name: eventName,
        platform: "web",
        ...(source ? { source } : {}),
      }),
    });
  } catch {
    // Analytics must not block UX
  }
}
