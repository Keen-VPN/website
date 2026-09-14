import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  initializePostHog,
  markInternalTraffic,
  identifyPostHogUser,
  resetPostHogUser,
  trackPostHogPageView,
} from "@/lib/posthog-analytics";

export default function PostHogTracker() {
  const location = useLocation();
  const { user, keenUserId, authProvider, loading } = useAuth();
  const wasIdentifiedRef = useRef(false);

  useEffect(() => {
    initializePostHog();
  }, []);

  useEffect(() => {
    trackPostHogPageView(location.pathname, location.search);
  }, [location.pathname, location.search]);

  useEffect(() => {
    // Wait for auth bootstrap so the initial anonymous pageview is not reset.
    if (loading) return;

    if (!user || !keenUserId) {
      if (wasIdentifiedRef.current) {
        resetPostHogUser();
        wasIdentifiedRef.current = false;
      }
      return;
    }

    markInternalTraffic(user.email);
    identifyPostHogUser(keenUserId, {
      auth_provider: authProvider ?? user.providerData[0]?.providerId ?? null,
    });
    wasIdentifiedRef.current = true;
  }, [user, keenUserId, authProvider, loading]);

  return null;
}
