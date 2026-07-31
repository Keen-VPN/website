import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  initializeRedditPixel,
  trackRedditLandingEngagement,
  trackRedditPageVisit,
} from "@/lib/reddit-analytics";

export default function RedditPixelTracker() {
  const location = useLocation();

  useEffect(() => {
    initializeRedditPixel();
  }, []);

  useEffect(() => {
    const path = `${location.pathname}${location.search}`;
    trackRedditPageVisit(path);
    const timer = window.setTimeout(
      () => trackRedditLandingEngagement(path),
      10_000,
    );
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.search]);

  return null;
}
