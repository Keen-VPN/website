export const LANDING_HANDOFF_SIGNATURE_PARAM = "landing_sig";

const MAX_HANDOFF_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_HANDOFF_FUTURE_MS = 5 * 60 * 1000;

export const MARKETING_REDIRECT_ROUTES = new Set([
  "/",
  "/switch",
  "/servers",
  "/privacy",
  "/terms",
  "/my-ip-address",
  "/pricing",
]);

export function landingHandoffSecret(): string | undefined {
  const secret = import.meta.env.VITE_LANDING_HANDOFF_SECRET?.trim();
  return secret || undefined;
}

export function isReplaceableLandingPlaceholder(path: string): boolean {
  return MARKETING_REDIRECT_ROUTES.has(path.trim());
}

export function parseValidHandoffCapturedAt(value?: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const timestamp = parsed.getTime();
  const now = Date.now();
  if (timestamp > now + MAX_HANDOFF_FUTURE_MS) return null;
  if (timestamp < now - MAX_HANDOFF_AGE_MS) return null;

  return parsed.toISOString();
}

function buildHandoffPayload(
  landingPath: string,
  landingUrl: string,
  capturedAt: string,
): string {
  return `${landingPath}|${landingUrl}|${capturedAt}`;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function signLandingHandoff(
  landingPath: string,
  landingUrl: string,
  capturedAt: string,
  secret: string,
): Promise<string> {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(
      buildHandoffPayload(landingPath, landingUrl, capturedAt),
    ),
  );
  return bytesToHex(signature);
}

export async function verifyLandingHandoff(
  landingPath: string,
  landingUrl: string,
  capturedAt: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    const key = await importHmacKey(secret);
    return crypto.subtle.verify(
      "HMAC",
      key,
      hexToBytes(signature),
      new TextEncoder().encode(
        buildHandoffPayload(landingPath, landingUrl, capturedAt),
      ),
    );
  } catch {
    return false;
  }
}

function hexToBytes(hex: string): Uint8Array {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) {
    throw new Error("Invalid signature");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}
