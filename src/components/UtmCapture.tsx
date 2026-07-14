import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { recordStickerLanding } from "@/auth/backend";
import { captureUtmFromSearch } from "@/lib/utm-attribution";
import { isStickerUtmSource } from "@/lib/sticker-campaigns";

/** Persists first-touch UTM params from the landing URL across the sign-up flow. */
export default function UtmCapture() {
  const location = useLocation();

  useEffect(() => {
    const captured = captureUtmFromSearch(
      location.search,
      location.pathname,
    );
    if (captured && isStickerUtmSource(captured.utm_source)) {
      void recordStickerLanding();
    }
  }, [location.pathname, location.search]);

  return null;
}
