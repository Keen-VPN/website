import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { recordStickerLanding } from "@/auth/backend";
import {
  captureUtmFromSearch,
  captureFirstLandingPage,
  captureFirstLandingFromSearch,
  hasForwardedLandingHandoff,
  parseUtmAttributionFromSearch,
} from "@/lib/utm-attribution";
import { isStickerUtmSource } from "@/lib/sticker-campaigns";

/** Persists first-touch UTM params from the landing URL across the sign-up flow. */
export default function UtmCapture() {
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await captureFirstLandingFromSearch(location.search);
      if (cancelled) return;

      if (!hasForwardedLandingHandoff(location.search)) {
        captureFirstLandingPage(location.pathname);
      }
      captureUtmFromSearch(location.search, location.pathname);

      const stickerAttribution = parseUtmAttributionFromSearch(
        location.search,
        location.pathname,
      );
      if (
        stickerAttribution &&
        isStickerUtmSource(stickerAttribution.utm_source)
      ) {
        void recordStickerLanding(stickerAttribution);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search]);

  return null;
}
