import { hasMembershipTransferQuery } from "@/auth/membership-transfer-flow";

export type PricingRouteDestination = "portal" | "loading" | "marketing";

interface ResolvePricingRouteDestinationOptions {
  hasUser: boolean;
  hasSessionToken: boolean;
  authLoading: boolean;
  search: string;
}

export function resolvePricingRouteDestination({
  hasUser,
  hasSessionToken,
  authLoading,
  search,
}: ResolvePricingRouteDestinationOptions): PricingRouteDestination {
  if (hasUser || hasMembershipTransferQuery(new URLSearchParams(search))) {
    return "portal";
  }

  if (authLoading) {
    return "loading";
  }

  // A retained backend session should keep the customer in the portal if
  // Firebase restoration or session verification experienced a network error.
  return hasSessionToken ? "portal" : "marketing";
}
