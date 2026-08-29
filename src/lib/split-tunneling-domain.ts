const MAX_DOMAINS = 200;
const DOMAIN_RE =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

/** Max domains the account preference API accepts. */
export const SPLIT_TUNNELING_MAX_DOMAINS = MAX_DOMAINS;

/**
 * Normalize a website exclusion entry to match the backend policy
 * (strip scheme/www/path, lowercase, validate).
 *
 * Wildcard prefixes like `*.bank.com` are intentionally collapsed to `bank.com`.
 * Account exclusions match the registrable domain and its subdomains in clients
 * that enforce them (Chrome: host === domain || host.endsWith(`.${domain}`)),
 * so storing a bare apex is the supported form — there is no separate
 * "all-subdomains-only" wildcard rule.
 */
export function normalizeSplitTunnelingDomain(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;

  let value = raw.trim().toLowerCase();
  value = value.replace(/^https?:\/\//, "");
  value = value.replace(/^www\./, "");
  value = value.split("/")[0] ?? "";
  value = value.split("?")[0] ?? "";
  value = value.split("#")[0] ?? "";
  value = value.replace(/:\d+$/, "");

  // Same as backend: `*.example.com` → `example.com` (apex covers subdomains).
  if (value.startsWith("*.")) {
    value = value.slice(2);
  }

  if (
    !value ||
    value.includes(" ") ||
    value.includes("..") ||
    value.includes("*") ||
    value.length > 253
  ) {
    return null;
  }

  if (value === "localhost") return value;
  if (!DOMAIN_RE.test(value)) return null;
  return value;
}
