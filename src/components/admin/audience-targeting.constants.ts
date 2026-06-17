import type { AudienceTargeting } from "@/auth/backend";

export const DEFAULT_AUDIENCE_TARGETING: AudienceTargeting = {
  presets: ["all_users"],
};

export function getAudienceTargetingValidationError(
  targeting: AudienceTargeting,
): string | null {
  if (targeting.presets.length === 0) {
    return "Choose All users or at least one audience segment.";
  }
  const hasAllUsers = targeting.presets.includes("all_users");
  const hasCustom = targeting.presets.includes("custom");
  if (hasAllUsers && targeting.presets.length > 1) {
    return "All users cannot be combined with other segments.";
  }
  if (hasCustom && targeting.presets.length > 1) {
    return "Custom rules cannot be combined with other segments.";
  }
  if (
    hasCustom &&
    (targeting.customRules?.rules.length ?? 0) === 0
  ) {
    return "Custom audience requires at least one profile rule.";
  }
  return null;
}
