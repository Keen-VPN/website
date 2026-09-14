import { useEffect } from "react";
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
  const { user, authProvider } = useAuth();

  useEffect(() => {
    initializePostHog();
  }, []);

  useEffect(() => {
    const path = `${location.pathname}${location.search}`;
    trackPostHogPageView(path);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!user) {
      resetPostHogUser();
      return;
    }

    markInternalTraffic(user.email);
    if (user.uid) {
      identifyPostHogUser(user.uid, {
        auth_provider: authProvider ?? user.providerData[0]?.providerId ?? null,
      });
    }
  }, [user, authProvider]);

  return null;
}
