/** Local recovery draft for the admin New/Edit perk dialog. No auth tokens. */

export const ADMIN_PERK_FORM_DRAFT_KEY = "keen_admin_perk_form_draft_v1";
export const ADMIN_PERK_RESTORE_QUERY = "restorePerkDraft";

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
  audienceTargeting: unknown;
  extensionDomains: Array<{
    host: string;
    pathPrefix: string;
    priority: string;
  }>;
}

export interface PerkFormDraft {
  version: 1;
  savedAt: string;
  mode: PerkFormDraftMode;
  editingId: string | null;
  idManuallyEdited: boolean;
  showIdEditor: boolean;
  form: PerkFormDraftForm;
}

export function isAdminSessionError(message: string | null | undefined): boolean {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
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

  return {
    id: asString(raw.id),
    title: asString(raw.title),
    partnerName: asString(raw.partnerName),
    category: asString(raw.category, "privacy_security"),
    description: asString(raw.description),
    imageUrl: asString(raw.imageUrl),
    offerText: asString(raw.offerText),
    redemptionType: asString(raw.redemptionType, "external_link"),
    redemptionUrl: asString(raw.redemptionUrl),
    couponCode: asString(raw.couponCode),
    workflowType: asString(raw.workflowType),
    accessLevel,
    isFeatured: asBoolean(raw.isFeatured),
    isActive: asBoolean(raw.isActive, true),
    sortOrder: asString(raw.sortOrder, "0"),
    startsAt: asString(raw.startsAt),
    endsAt: asString(raw.endsAt),
    audienceTargeting: raw.audienceTargeting ?? { presets: ["all_users"] },
    extensionDomains: parseExtensionDomains(raw.extensionDomains),
  };
}

export function parsePerkFormDraft(raw: unknown): PerkFormDraft | null {
  if (!isRecord(raw) || raw.version !== 1) return null;
  const form = parseForm(raw.form);
  if (!form) return null;
  const mode = raw.mode === "edit" ? "edit" : "create";
  const editingId =
    typeof raw.editingId === "string" && raw.editingId.trim()
      ? raw.editingId
      : null;

  return {
    version: 1,
    savedAt: asString(raw.savedAt, new Date().toISOString()),
    mode,
    editingId: mode === "edit" ? editingId : null,
    idManuallyEdited: asBoolean(raw.idManuallyEdited),
    showIdEditor: asBoolean(raw.showIdEditor),
    form,
  };
}

export function draftHasMeaningfulContent(draft: PerkFormDraft): boolean {
  const { form } = draft;
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
      form.extensionDomains.some(
        (row) =>
          row.host.trim() || row.pathPrefix.trim() || row.priority.trim(),
      ),
  );
}

export function readPerkFormDraft(
  storage: Pick<Storage, "getItem"> = localStorage,
): PerkFormDraft | null {
  try {
    const raw = storage.getItem(ADMIN_PERK_FORM_DRAFT_KEY);
    if (!raw) return null;
    const parsed = parsePerkFormDraft(JSON.parse(raw) as unknown);
    if (!parsed || !draftHasMeaningfulContent(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePerkFormDraft(
  draft: Omit<PerkFormDraft, "version" | "savedAt"> & {
    savedAt?: string;
  },
  storage: Pick<Storage, "setItem"> = localStorage,
): boolean {
  const payload: PerkFormDraft = {
    version: 1,
    savedAt: draft.savedAt ?? new Date().toISOString(),
    mode: draft.mode,
    editingId: draft.mode === "edit" ? draft.editingId : null,
    idManuallyEdited: draft.idManuallyEdited,
    showIdEditor: draft.showIdEditor,
    form: draft.form,
  };
  if (!draftHasMeaningfulContent(payload)) {
    return false;
  }
  storage.setItem(ADMIN_PERK_FORM_DRAFT_KEY, JSON.stringify(payload));
  return true;
}

export function clearPerkFormDraft(
  storage: Pick<Storage, "removeItem"> = localStorage,
): void {
  storage.removeItem(ADMIN_PERK_FORM_DRAFT_KEY);
}
