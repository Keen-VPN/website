/** Local recovery draft for the admin New/Edit perk dialog. No auth tokens. */

import {
  createDefaultAudienceTargeting,
  getAudienceTargetingValidationError,
} from "@/components/admin/audience-targeting.constants";
import type { AudienceTargeting } from "@/auth/backend";

export const ADMIN_PERK_FORM_DRAFT_KEY_PREFIX =
  "keen_admin_perk_form_draft_v1";
/** Pre-scoped key from the first draft implementation. */
export const ADMIN_PERK_FORM_DRAFT_LEGACY_KEY =
  "keen_admin_perk_form_draft_v1";
export const ADMIN_PERK_RESTORE_QUERY = "restorePerkDraft";

const VALID_CATEGORIES = new Set([
  "privacy_security",
  "ai_productivity",
  "developer_tools",
  "startup_growth",
  "remote_work",
  "finance",
]);

const VALID_REDEMPTION_TYPES = new Set([
  "external_link",
  "coupon_code",
  "invite_only",
  "workflow",
]);

const VALID_AUDIENCE_PRESETS = new Set([
  "all_users",
  "has_us_bank_account",
  "no_us_bank_account",
  "receives_direct_deposit",
  "self_employed",
  "business_owner",
  "interested_in_starting_business",
  "custom",
]);

const VALID_QUESTION_KEYS = new Set([
  "us_bank_account",
  "direct_deposit_income",
  "entrepreneurship_interest_2026",
]);

export type PerkFormDraftMode = "create" | "edit";

/** Serializable perk form fields — mirrors AdminPerks PerkFormState. */
export interface PerkFormDraftForm {
  id: string;
  title: string;
  partnerName: string;
  category: string;
  description: string;
  imageUrl: string;
  offerText: string;
  redemptionType: string;
  redemptionUrl: string;
  couponCode: string;
  workflowType: string;
  accessLevel: "free" | "paid" | "annual";
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: string;
  startsAt: string;
  endsAt: string;
  audienceTargeting: AudienceTargeting;
  extensionDomains: {
    host: string;
    pathPrefix: string;
    priority: string;
  }[];
}

export interface PerkFormDraft {
  version: 1;
  adminId: string;
  savedAt: string;
  mode: PerkFormDraftMode;
  editingId: string | null;
  idManuallyEdited: boolean;
  showIdEditor: boolean;
  form: PerkFormDraftForm;
}

export function adminPerkFormDraftKey(adminId: string): string {
  return `${ADMIN_PERK_FORM_DRAFT_KEY_PREFIX}:${adminId}`;
}

/** Matches AdminPerks emptyForm() endsAt default (today + 45 days UTC). */
export function defaultBlankCreateEndsAt(startsAt = ""): string {
  const base = startsAt.trim()
    ? new Date(`${startsAt.trim()}T00:00:00.000Z`)
    : new Date();
  if (Number.isNaN(base.getTime())) {
    const fallback = new Date();
    fallback.setUTCDate(fallback.getUTCDate() + 45);
    return fallback.toISOString().slice(0, 10);
  }
  base.setUTCDate(base.getUTCDate() + 45);
  return base.toISOString().slice(0, 10);
}

export function isAdminSessionError(
  message: string | null | undefined,
  unauthorized?: boolean,
): boolean {
  if (unauthorized) return true;
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("admin session required") ||
    normalized.includes("session expired") ||
    normalized.includes("unauthorized")
  );
}

export function adminPerkLoginReturnPath(): string {
  return `/admin/login?return=${encodeURIComponent(
    `/admin/perks?${ADMIN_PERK_RESTORE_QUERY}=1`,
  )}`;
}

export function draftMatchesSession(
  draft: PerkFormDraft,
  editingId: string | null,
): boolean {
  if (editingId) {
    return draft.mode === "edit" && draft.editingId === editingId;
  }
  return draft.mode === "create";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function parseAudienceTargeting(value: unknown): AudienceTargeting {
  const fallback = createDefaultAudienceTargeting();
  if (!isRecord(value) || !Array.isArray(value.presets)) {
    return fallback;
  }

  const presets = value.presets.filter(
    (preset): preset is AudienceTargeting["presets"][number] =>
      typeof preset === "string" && VALID_AUDIENCE_PRESETS.has(preset),
  );
  if (presets.length === 0) {
    return fallback;
  }

  const targeting: AudienceTargeting = {
    presets,
  };

  if (isRecord(value.customRules)) {
    const logic = value.customRules.logic === "and" ? "and" : "or";
    const rulesRaw = Array.isArray(value.customRules.rules)
      ? value.customRules.rules
      : [];
    const rules = rulesRaw
      .map((rule) => {
        if (!isRecord(rule)) return null;
        const questionKey = asString(rule.questionKey);
        const ruleValue = asString(rule.value);
        if (!VALID_QUESTION_KEYS.has(questionKey) || !ruleValue) return null;
        return {
          questionKey: questionKey as
            | "us_bank_account"
            | "direct_deposit_income"
            | "entrepreneurship_interest_2026",
          value: ruleValue,
        };
      })
      .filter((rule): rule is NonNullable<typeof rule> => rule != null);

    if (rules.length > 0) {
      targeting.customRules = { logic, rules };
    }
  }

  if (getAudienceTargetingValidationError(targeting)) {
    return fallback;
  }
  return targeting;
}

function parseExtensionDomains(
  value: unknown,
): PerkFormDraftForm["extensionDomains"] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    if (!isRecord(row)) {
      return { host: "", pathPrefix: "", priority: "" };
    }
    return {
      host: asString(row.host),
      pathPrefix: asString(row.pathPrefix),
      priority: asString(row.priority),
    };
  });
}

function parseForm(raw: unknown): PerkFormDraftForm | null {
  if (!isRecord(raw)) return null;
  const access = raw.accessLevel;
  const accessLevel =
    access === "free" || access === "paid" || access === "annual"
      ? access
      : "paid";
  const category = asString(raw.category, "privacy_security");
  const redemptionType = asString(raw.redemptionType, "external_link");

  return {
    id: asString(raw.id),
    title: asString(raw.title),
    partnerName: asString(raw.partnerName),
    category: VALID_CATEGORIES.has(category) ? category : "privacy_security",
    description: asString(raw.description),
    imageUrl: asString(raw.imageUrl),
    offerText: asString(raw.offerText),
    redemptionType: VALID_REDEMPTION_TYPES.has(redemptionType)
      ? redemptionType
      : "external_link",
    redemptionUrl: asString(raw.redemptionUrl),
    couponCode: asString(raw.couponCode),
    workflowType: asString(raw.workflowType),
    accessLevel,
    isFeatured: asBoolean(raw.isFeatured),
    isActive: asBoolean(raw.isActive, true),
    sortOrder: asString(raw.sortOrder, "0"),
    startsAt: asString(raw.startsAt),
    endsAt: asString(raw.endsAt),
    audienceTargeting: parseAudienceTargeting(raw.audienceTargeting),
    extensionDomains: parseExtensionDomains(raw.extensionDomains),
  };
}

export function parsePerkFormDraft(
  raw: unknown,
  adminIdFallback?: string,
): PerkFormDraft | null {
  if (!isRecord(raw) || raw.version !== 1) return null;
  const form = parseForm(raw.form);
  if (!form) return null;
  const mode = raw.mode === "edit" ? "edit" : "create";
  const editingId =
    typeof raw.editingId === "string" && raw.editingId.trim()
      ? raw.editingId
      : null;
  const adminId =
    asString(raw.adminId).trim() || asString(adminIdFallback).trim();
  if (!adminId) return null;

  return {
    version: 1,
    adminId,
    savedAt: asString(raw.savedAt, new Date().toISOString()),
    mode,
    editingId: mode === "edit" ? editingId : null,
    idManuallyEdited: asBoolean(raw.idManuallyEdited),
    showIdEditor: asBoolean(raw.showIdEditor),
    form,
  };
}

/** True when the draft differs from a blank create form (including selects/toggles). */
export function draftHasMeaningfulContent(
  draft: PerkFormDraft,
  blankEndsAt: string = defaultBlankCreateEndsAt(),
): boolean {
  const { form } = draft;
  const audienceDefault = JSON.stringify(createDefaultAudienceTargeting());
  const defaultEndsForStarts = defaultBlankCreateEndsAt(form.startsAt);
  return Boolean(
    form.title.trim() ||
      form.partnerName.trim() ||
      form.description.trim() ||
      form.imageUrl.trim() ||
      form.offerText.trim() ||
      form.redemptionUrl.trim() ||
      form.couponCode.trim() ||
      form.workflowType.trim() ||
      form.id.trim() ||
      form.startsAt.trim() ||
      (form.endsAt.trim() &&
        form.endsAt !== blankEndsAt &&
        form.endsAt !== defaultEndsForStarts) ||
      form.sortOrder.trim() !== "0" ||
      form.category !== "privacy_security" ||
      form.redemptionType !== "external_link" ||
      form.accessLevel !== "paid" ||
      form.isFeatured ||
      form.isActive !== true ||
      JSON.stringify(form.audienceTargeting) !== audienceDefault ||
      form.extensionDomains.some(
        (row) =>
          row.host.trim() || row.pathPrefix.trim() || row.priority.trim(),
      ),
  );
}

function tryParseStoredDraft(
  raw: string | null,
  adminId: string,
): PerkFormDraft | null {
  if (!raw) return null;
  try {
    const parsed = parsePerkFormDraft(JSON.parse(raw) as unknown, adminId);
    if (!parsed || parsed.adminId !== adminId) return null;
    if (!draftHasMeaningfulContent(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readPerkFormDraft(
  adminId: string,
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = localStorage,
): PerkFormDraft | null {
  if (!adminId) return null;
  try {
    const scoped = tryParseStoredDraft(
      storage.getItem(adminPerkFormDraftKey(adminId)),
      adminId,
    );
    if (scoped) return scoped;

    // Migrate unscoped drafts from the first draft implementation.
    const legacy = tryParseStoredDraft(
      storage.getItem(ADMIN_PERK_FORM_DRAFT_LEGACY_KEY),
      adminId,
    );
    if (!legacy) return null;

    try {
      storage.setItem(
        adminPerkFormDraftKey(adminId),
        JSON.stringify(legacy),
      );
      storage.removeItem(ADMIN_PERK_FORM_DRAFT_LEGACY_KEY);
    } catch {
      // Still return the migrated-in-memory draft if persistence fails.
    }
    return legacy;
  } catch {
    return null;
  }
}

export function writePerkFormDraft(
  draft: Omit<PerkFormDraft, "version" | "savedAt"> & {
    savedAt?: string;
  },
  storage: Pick<Storage, "setItem" | "removeItem"> = localStorage,
  blankEndsAt: string = defaultBlankCreateEndsAt(),
): boolean {
  const payload: PerkFormDraft = {
    version: 1,
    adminId: draft.adminId,
    savedAt: draft.savedAt ?? new Date().toISOString(),
    mode: draft.mode,
    editingId: draft.mode === "edit" ? draft.editingId : null,
    idManuallyEdited: draft.idManuallyEdited,
    showIdEditor: draft.showIdEditor,
    form: draft.form,
  };
  if (!payload.adminId || !draftHasMeaningfulContent(payload, blankEndsAt)) {
    return false;
  }
  try {
    storage.setItem(
      adminPerkFormDraftKey(payload.adminId),
      JSON.stringify(payload),
    );
    try {
      storage.removeItem(ADMIN_PERK_FORM_DRAFT_LEGACY_KEY);
    } catch {
      // ignore
    }
    return true;
  } catch {
    return false;
  }
}

export function clearPerkFormDraft(
  adminId: string,
  storage: Pick<Storage, "removeItem"> = localStorage,
): void {
  if (!adminId) return;
  try {
    storage.removeItem(adminPerkFormDraftKey(adminId));
  } catch {
    // Ignore blocked storage — form flow must continue.
  }
}
