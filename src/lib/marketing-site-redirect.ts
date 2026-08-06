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
