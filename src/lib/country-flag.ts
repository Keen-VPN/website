/** ISO 3166-1 alpha-2 → flag emoji (e.g. "US" → 🇺🇸). */
export function countryCodeToFlag(code: string): string {
  const normalized = code.toUpperCase();
  if (normalized.length !== 2) return "";
  return String.fromCodePoint(
    ...[...normalized].map((char) => 127397 + char.charCodeAt(0)),
  );
}
