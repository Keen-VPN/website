import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { captureUtmFromSearch } from "@/lib/utm-attribution";

/** Persists first-touch UTM params from the landing URL across the sign-up flow. */
export default function UtmCapture() {
  const location = useLocation();

  useEffect(() => {
    captureUtmFromSearch(location.search, location.pathname);
  }, [location.pathname, location.search]);

  return null;
}
