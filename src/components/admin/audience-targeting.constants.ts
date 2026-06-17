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
  if (
    targeting.presets.includes("custom") &&
    (targeting.customRules?.rules.length ?? 0) === 0
  ) {
    return "Custom audience requires at least one profile rule.";
  }
  return null;
}
