export const STICKER_UTM_SOURCE = "sticker";
export const STICKER_UTM_MEDIUM = "physical";
export const DEFAULT_STICKER_CAMPAIGN = "launch_2026";
export const KEENVPN_MARKETING_ORIGIN = "https://vpnkeen.com";

export type StickerCampaignKind =
  | "generic"
  | "conference"
  | "employee"
  | "partner"
  | "event";

export interface StickerCampaignTemplate {
  id: string;
  label: string;
  kind: StickerCampaignKind;
  campaign: string;
  content: string;
  landingPath?: string;
  description?: string;
}

/** Predefined sticker campaigns — extend utm_content for one-off batches. */
export const STICKER_CAMPAIGN_TEMPLATES: StickerCampaignTemplate[] = [
  {
    id: "launch-generic",
    label: "Launch (generic)",
    kind: "generic",
    campaign: DEFAULT_STICKER_CAMPAIGN,
    content: "generic",
    description: "Default launch sticker without a specific batch label.",
  },
  {
    id: "conference-defcon",
    label: "Conference — DEF CON",
    kind: "conference",
    campaign: DEFAULT_STICKER_CAMPAIGN,
    content: "defcon_2026",
    description: "Conference booth / swag bag stickers.",
  },
  {
    id: "conference-techfest",
    label: "Conference — TechFest",
    kind: "conference",
    campaign: DEFAULT_STICKER_CAMPAIGN,
    content: "techfest_houston",
    description: "Local tech event stickers.",
  },
  {
    id: "employee-team",
    label: "Employee — team batch",
    kind: "employee",
    campaign: DEFAULT_STICKER_CAMPAIGN,
    content: "employee_team",
    description: "Internal team stickers (shared batch).",
  },
  {
    id: "partner-generic",
    label: "Partner — generic",
    kind: "partner",
    campaign: DEFAULT_STICKER_CAMPAIGN,
    content: "partner_generic",
    description: "Partner co-brand stickers without a named partner slug.",
  },
  {
    id: "event-meetup",
    label: "Event — meetup",
    kind: "event",
    campaign: DEFAULT_STICKER_CAMPAIGN,
    content: "meetup_generic",
    description: "Meetup / community event stickers.",
  },
];

export interface BuildStickerUrlParams {
  campaign?: string;
  content?: string;
  medium?: string;
  term?: string;
  landingPath?: string;
  origin?: string;
}

export function buildStickerCampaignUrl(
  params: BuildStickerUrlParams = {},
): string {
  const origin = (params.origin ?? KEENVPN_MARKETING_ORIGIN).replace(/\/$/, "");
  const rawPath = params.landingPath?.trim() || "/";
  const landingPath =
    rawPath.startsWith("http://") || rawPath.startsWith("https://")
      ? "/"
      : rawPath.startsWith("/")
        ? rawPath
        : `/${rawPath}`;
  const url = new URL(landingPath, `${origin}/`);
  url.searchParams.set("utm_source", STICKER_UTM_SOURCE);
  url.searchParams.set(
    "utm_medium",
    params.medium?.trim() || STICKER_UTM_MEDIUM,
  );
  url.searchParams.set(
    "utm_campaign",
    params.campaign?.trim() || DEFAULT_STICKER_CAMPAIGN,
  );
  if (params.content?.trim()) {
    url.searchParams.set("utm_content", params.content.trim());
  }
  if (params.term?.trim()) {
    url.searchParams.set("utm_term", params.term.trim());
  }
  return url.toString();
}

export function buildStickerUrlFromTemplate(
  template: StickerCampaignTemplate,
  origin?: string,
): string {
  return buildStickerCampaignUrl({
    campaign: template.campaign,
    content: template.content,
    landingPath: template.landingPath,
    origin,
  });
}

/** Public QR image API — encodes the full landing URL (offline sticker scans). */
export function stickerQrCodeImageUrl(
  targetUrl: string,
  size = 240,
): string {
  const safeSize = Math.min(512, Math.max(120, size));
  return `https://api.qrserver.com/v1/create-qr-code/?size=${safeSize}x${safeSize}&data=${encodeURIComponent(targetUrl)}`;
}

export function isStickerUtmSource(value: string | undefined): boolean {
  return (value ?? "").trim().toLowerCase() === STICKER_UTM_SOURCE;
}
