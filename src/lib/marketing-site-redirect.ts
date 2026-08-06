import { marketingSiteUrl } from "@/lib/site-urls";

export function resolveMarketingRedirectUrl(
  path: string,
  currentSearch: string,
  currentHash: string,
): string {
  const destination = new URL(marketingSiteUrl(path));
  destination.search = currentSearch;
  if (!destination.hash && currentHash) {
    destination.hash = currentHash;
  }
  return destination.toString();
}

export function shouldReplaceWithMarketingUrl(
  destination: string,
  currentUrl: string,
): boolean {
  try {
    return new URL(destination).href !== new URL(currentUrl).href;
  } catch {
    return false;
  }
}
