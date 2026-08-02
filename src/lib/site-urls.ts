const DEFAULT_MARKETING_SITE_URL = "https://vpnkeen.com";

export const MARKETING_SITE_URL = (
  import.meta.env.VITE_MARKETING_SITE_URL?.trim() || DEFAULT_MARKETING_SITE_URL
).replace(/\/+$/, "");

export function marketingSiteUrl(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${MARKETING_SITE_URL}${normalizedPath}`;
}
