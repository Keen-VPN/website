import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { recordStickerLanding } from "@/auth/backend";
import {
  captureUtmFromSearch,
  captureFirstLandingPage,
  parseUtmAttributionFromSearch,
} from "@/lib/utm-attribution";
import { isStickerUtmSource } from "@/lib/sticker-campaigns";

/** Persists first-touch UTM params from the landing URL across the sign-up flow. */
export default function UtmCapture() {
  const location = useLocation();

  useEffect(() => {
    captureFirstLandingPage(location.pathname);
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
  }, [location.pathname, location.search]);

  return null;
}
