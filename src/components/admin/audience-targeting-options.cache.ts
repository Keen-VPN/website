import {
  adminFetchAudienceTargetingOptions,
  type AudiencePreset,
} from "@/auth/backend";

export type AudienceTargetingOptions = {
  presets: AudiencePreset[];
  questions: {
    key: string;
    label: string;
    category: string;
    options: { value: string; label: string }[];
  }[];
};

let cachedOptions: AudienceTargetingOptions | null = null;
let inflight: Promise<AudienceTargetingOptions | null> | null = null;

export function fetchAudienceTargetingOptionsCached(): Promise<AudienceTargetingOptions | null> {
  if (cachedOptions) {
    return Promise.resolve(cachedOptions);
  }
  if (inflight) {
    return inflight;
  }
  inflight = adminFetchAudienceTargetingOptions().then((result) => {
    inflight = null;
    if (result.ok && result.data) {
      cachedOptions = result.data;
      return result.data;
    }
    return null;
  });
  return inflight;
}
