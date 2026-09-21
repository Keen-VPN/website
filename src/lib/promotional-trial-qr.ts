import { stickerQrCodeImageUrl } from "@/lib/sticker-campaigns";

export const PROMO_QR_UTM_SOURCE = "promo_qr";

export function promoTrialQrImageUrl(landingUrl: string, size = 240): string {
  return stickerQrCodeImageUrl(landingUrl, size);
}

export function buildPromoTrialLandingPath(code: string): string {
  const params = new URLSearchParams({
    utm_source: PROMO_QR_UTM_SOURCE,
    utm_medium: "qr",
    utm_campaign: code,
  });
  return `/promo/${encodeURIComponent(code)}?${params.toString()}`;
}
