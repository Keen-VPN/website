import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  initializePostHog,
  markInternalTraffic,
  identifyPostHogUser,
  resetPostHogUser,
  hadIdentifiedPostHogUser,
  trackPostHogPageView,
  flushPostHogSignupMethodSelected,
} from "@/lib/posthog-analytics";

export default function PostHogTracker() {
  const location = useLocation();
  const { user, keenUserId, authProvider, loading } = useAuth();
  const wasIdentifiedRef = useRef(false);
  const [analyticsReady, setAnalyticsReady] = useState(false);

  useEffect(() => {
    if (loading) {
      setAnalyticsReady(false);
      return;
    }

    // Pass email into init so staff opt-out / recording disable happens before
    // any capture or session recording starts.
    initializePostHog({ email: user?.email });

    if (!user || !keenUserId) {
      // After reload PostHog may still have the previous account identity in
      // persistence even though React refs are cold.
      if (wasIdentifiedRef.current || hadIdentifiedPostHogUser()) {
        resetPostHogUser();
      }
      wasIdentifiedRef.current = false;
    } else {
      markInternalTraffic(user.email);
      identifyPostHogUser(keenUserId, {
        email: user.email ?? null,
        auth_provider: authProvider ?? user.providerData[0]?.providerId ?? null,
      });
      flushPostHogSignupMethodSelected(user.email);
      wasIdentifiedRef.current = true;
    }

    setAnalyticsReady(true);
  }, [user, keenUserId, authProvider, loading]);

  useEffect(() => {
    if (!analyticsReady) return;
    trackPostHogPageView(location.pathname, location.search);
  }, [analyticsReady, location.pathname, location.search]);

  return null;
}
