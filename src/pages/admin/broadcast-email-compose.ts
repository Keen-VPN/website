import {
  MEMBERSHIP_TRANSFER_BROADCAST_TEMPLATE,
  type AdminBroadcastComposePayload,
  type AudienceTargeting,
  type BroadcastEmailAudience,
  type BroadcastEmailCategory,
  type BroadcastEmailTemplate,
} from "@/auth/backend";

function optionalTrim(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function buildBroadcastComposePayload(input: {
  audience: BroadcastEmailAudience;
  category: BroadcastEmailCategory | "none";
  profileTargeting: AudienceTargeting;
  emailCategory: string;
  template: BroadcastEmailTemplate | "custom";
  subject: string;
  headline: string;
  body: string;
  preheader: string;
  ctaLabel: string;
  ctaUrl: string;
}): AdminBroadcastComposePayload {
  const payload: AdminBroadcastComposePayload = {
    audience: input.audience,
    // "none" means genuinely uncategorised; the backend stores null rather
    // than guessing, so reporting never shows an invented category.
    category: input.category === "none" ? undefined : input.category,
    profileTargeting: input.profileTargeting,
    emailCategory:
      input.emailCategory === "none" ? undefined : input.emailCategory,
  };

  if (input.template === MEMBERSHIP_TRANSFER_BROADCAST_TEMPLATE) {
    payload.template = MEMBERSHIP_TRANSFER_BROADCAST_TEMPLATE;
    const subject = optionalTrim(input.subject);
    if (subject) payload.subject = subject;
    return payload;
  }

  payload.subject = input.subject.trim();
  payload.headline = input.headline.trim();
  payload.body = input.body.trim();
  payload.preheader = optionalTrim(input.preheader);
  payload.ctaLabel = optionalTrim(input.ctaLabel);
  payload.ctaUrl = optionalTrim(input.ctaUrl);
  return payload;
}
