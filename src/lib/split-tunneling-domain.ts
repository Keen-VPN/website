const MAX_DOMAINS = 200;
const DOMAIN_RE =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

/** Common multi-part public suffixes (domain alone must not be excludable). */
const MULTI_PART_PUBLIC_SUFFIXES = new Set([
  "co.uk",
  "org.uk",
  "ac.uk",
  "gov.uk",
  "ltd.uk",
  "plc.uk",
  "com.au",
  "net.au",
  "org.au",
  "edu.au",
  "gov.au",
  "co.nz",
  "org.nz",
  "co.jp",
  "or.jp",
  "ne.jp",
  "com.br",
  "com.mx",
  "co.in",
  "com.sg",
  "com.hk",
  "co.za",
  "com.tr",
  "com.tw",
  "com.cn",
  "com.ar",
  "github.io",
  "herokuapp.com",
  "netlify.app",
  "vercel.app",
  "pages.dev",
]);

const COMPOUND_PUBLIC_SLDS = new Set([
  "co",
  "com",
  "org",
  "net",
  "ac",
  "gov",
  "edu",
  "ltd",
  "plc",
]);

/** Max domains the account preference API accepts. */
export const SPLIT_TUNNELING_MAX_DOMAINS = MAX_DOMAINS;

/**
 * True when `domain` is (or looks like) a public suffix with no private label.
 * Excluding these would match every host under that registry via suffix rules.
 */
function isPublicSuffixOnly(domain: string): boolean {
  if (MULTI_PART_PUBLIC_SUFFIXES.has(domain)) return true;

  const parts = domain.split(".");
  if (parts.length !== 2) return false;

  const [sld, tld] = parts;
  // e.g. co.uk / com.au — two labels, first is a known compound SLD, second a ccTLD.
  return tld.length === 2 && COMPOUND_PUBLIC_SLDS.has(sld);
}

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
  // Reject embedded wildcards before www. stripping so `www.*.bank.com` cannot
  // become `*.bank.com` and then silently collapse to `bank.com`.
  if (value.includes("*") && !value.startsWith("*.")) return null;
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
  if (isPublicSuffixOnly(value)) return null;
  return value;
}
