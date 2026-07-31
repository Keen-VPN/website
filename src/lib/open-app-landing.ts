import { serverLocations } from "@/constants/server-locations";

export interface OpenAppLandingContent {
  eyebrow: string;
  title: string;
  description: string;
  instruction: string;
}

const DEFAULT_CONTENT: OpenAppLandingContent = {
  eyebrow: "KeenVPN",
  title: "Open KeenVPN",
  description: "Continue in the KeenVPN app to connect securely.",
  instruction: "Choose a server in the app and connect.",
};

function toLocationSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolveOpenAppLandingContent(
  location: string | null | undefined,
): OpenAppLandingContent {
  const normalized = location ? toLocationSlug(location) : "";
  if (!normalized) {
    return DEFAULT_CONTENT;
  }

  const server = serverLocations.find(
    (candidate) =>
      candidate.available &&
      (toLocationSlug(candidate.id) === normalized ||
        toLocationSlug(candidate.country) === normalized ||
        toLocationSlug(candidate.city) === normalized ||
        toLocationSlug(`${candidate.country}-${candidate.city}`) ===
          normalized ||
        (candidate.aliases?.some(
          (alias) => toLocationSlug(alias) === normalized,
        ) ??
          false)),
  );
  if (!server) {
    return DEFAULT_CONTENT;
  }

  return {
    eyebrow: "New server available",
    title: `Connect through ${server.country}`,
    description: `Our ${server.city} VPN server is now available in the KeenVPN app.`,
    instruction: `Open KeenVPN, refresh your server list, and select ${server.country} to connect.`,
  };
}
