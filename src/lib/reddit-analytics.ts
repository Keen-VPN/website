type RedditPixelMetadata = Record<string, string | number | boolean>;

type RedditPixelFunction = (
  command: "init" | "track",
  eventOrPixelId: string,
  metadata?: RedditPixelMetadata,
) => void;

type QueuedRedditPixelFunction = RedditPixelFunction & {
  callQueue?: unknown[][];
  sendEvent?: (...args: unknown[]) => void;
};

declare global {
  interface Window {
    rdt?: QueuedRedditPixelFunction;
  }
}

const PIXEL_ID = import.meta.env.VITE_REDDIT_PIXEL_ID?.trim();
const SCRIPT_ID = "reddit-pixel-script";
const EVENT_DEDUPE_PREFIX = "keen_reddit_event:";
let initialized = false;

export function initializeRedditPixel(): boolean {
  if (typeof window === "undefined" || !PIXEL_ID) return false;
  if (initialized) return true;
  if (!window.rdt) {
    const queued = function (...args: unknown[]) {
      if (queued.sendEvent) {
        queued.sendEvent(...args);
        return;
      }
      queued.callQueue = queued.callQueue || [];
      queued.callQueue.push(args);
    } as QueuedRedditPixelFunction;
    window.rdt = queued;
  }
  if (!document.getElementById(SCRIPT_ID)) {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = "https://www.redditstatic.com/ads/pixel.js";
    document.head.appendChild(script);
  }
  window.rdt("init", PIXEL_ID);
  initialized = true;
  return true;
}

export function trackRedditEvent(
  eventName: string,
  metadata?: RedditPixelMetadata,
  dedupeKey?: string,
): void {
  if (!initializeRedditPixel() || !window.rdt) return;
  if (dedupeKey && wasTracked(dedupeKey)) return;
  window.rdt("track", eventName, metadata);
  if (dedupeKey) markTracked(dedupeKey);
}

export function trackRedditPageVisit(path: string): void {
  void path;
  trackRedditEvent("PageVisit");
}

export function trackRedditLandingEngagement(path: string): void {
  trackRedditEvent("ViewContent", undefined, `engagement:${path}`);
}

export function trackRedditLeadCompleted(userId: string): void {
  const conversionId = `lead:${userId}`;
  trackRedditEvent("Lead", { conversionId }, `lead-completed:${userId}`);
}

export function trackRedditConfirmedTrial(conversionId: string): void {
  trackRedditEvent(
    "SignUp",
    { conversionId },
    `trial-confirmed:${conversionId}`,
  );
}

const ENGAGED_CONTENT_PATHS = new Set(["/", "/pricing", "/servers", "/switch"]);

export function isRedditEngagedContentPath(pathname: string): boolean {
  return ENGAGED_CONTENT_PATHS.has(pathname);
}

export function getRedditUuidCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("_rdt_uuid="));
  if (!match) return undefined;
  let value: string;
  try {
    value = decodeURIComponent(match.slice("_rdt_uuid=".length)).trim();
  } catch {
    return undefined;
  }
  return value ? value.slice(0, 500) : undefined;
}

function wasTracked(key: string): boolean {
  try {
    return sessionStorage.getItem(`${EVENT_DEDUPE_PREFIX}${key}`) === "1";
  } catch {
    return false;
  }
}

function markTracked(key: string): void {
  try {
    sessionStorage.setItem(`${EVENT_DEDUPE_PREFIX}${key}`, "1");
  } catch {
    // Storage can be blocked; Reddit still receives the event.
  }
}
