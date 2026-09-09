import { describe, expect, it } from "vitest";
import {
  ADMIN_PERK_FORM_DRAFT_LEGACY_KEY,
  clearPerkFormDraft,
  defaultBlankCreateEndsAt,
  draftHasMeaningfulContent,
  draftMatchesSession,
  isAdminSessionError,
  parsePerkFormDraft,
  readPerkFormDraft,
  writePerkFormDraft,
  type PerkFormDraft,
} from "./admin-perk-form-draft";

function sampleDraft(
  overrides: Partial<PerkFormDraft> = {},
): PerkFormDraft {
  return {
    version: 1,
    adminId: "admin_1",
    savedAt: "2026-09-09T12:00:00.000Z",
    mode: "create",
    editingId: null,
    idManuallyEdited: false,
    showIdEditor: false,
    form: {
      id: "perk_p_8_25m_google_class_action",
      title: "$8.25M Google Class Action",
      partnerName: "",
      category: "finance",
      description: "Claim details",
      imageUrl: "https://example.com/perk.png",
      offerText: "File a claim",
      redemptionType: "external_link",
      redemptionUrl: "https://example.com",
      couponCode: "",
      workflowType: "",
      accessLevel: "paid",
      isFeatured: false,
      isActive: true,
      sortOrder: "0",
      startsAt: "",
      endsAt: "2026-10-24",
      audienceTargeting: { presets: ["all_users"] },
      extensionDomains: [],
    },
    ...overrides,
  };
}

function memoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

describe("admin-perk-form-draft", () => {
  it("detects admin session errors including unauthorized flag", () => {
    expect(isAdminSessionError("Admin session required")).toBe(true);
    expect(isAdminSessionError("Title is required")).toBe(false);
    expect(isAdminSessionError("boom", true)).toBe(true);
  });

  it("round-trips draft through storage without tokens and scopes by admin", () => {
    const storage = memoryStorage();

    writePerkFormDraft(sampleDraft(), storage);
    const loaded = readPerkFormDraft("admin_1", storage);
    expect(loaded?.form.title).toBe("$8.25M Google Class Action");
    expect(loaded?.form.category).toBe("finance");
    expect(JSON.stringify(loaded)).not.toMatch(/token|password|session/i);
    expect(readPerkFormDraft("admin_2", storage)).toBeNull();

    expect(
      writePerkFormDraft(
        sampleDraft({
          form: {
            ...sampleDraft().form,
            title: "",
            partnerName: "",
            description: "",
            imageUrl: "",
            offerText: "",
            redemptionUrl: "",
            couponCode: "",
            workflowType: "",
            id: "",
            category: "privacy_security",
            endsAt: defaultBlankCreateEndsAt(),
            extensionDomains: [],
          },
        }),
        storage,
      ),
    ).toBe(false);
    expect(readPerkFormDraft("admin_1", storage)?.form.title).toBe(
      "$8.25M Google Class Action",
    );

    clearPerkFormDraft("admin_1", storage);
    expect(readPerkFormDraft("admin_1", storage)).toBeNull();
  });

  it("does not treat the default endsAt as meaningful content", () => {
    const draft = sampleDraft({
      form: {
        ...sampleDraft().form,
        title: "",
        partnerName: "",
        description: "",
        imageUrl: "",
        offerText: "",
        redemptionUrl: "",
        id: "",
        category: "privacy_security",
        endsAt: defaultBlankCreateEndsAt(),
      },
    });
    expect(draftHasMeaningfulContent(draft)).toBe(false);
  });

  it("migrates legacy unscoped drafts into the admin-scoped key", () => {
    const storage = memoryStorage();
    const legacy = {
      version: 1,
      mode: "create",
      editingId: null,
      idManuallyEdited: false,
      showIdEditor: false,
      form: sampleDraft().form,
    };
    storage.setItem(ADMIN_PERK_FORM_DRAFT_LEGACY_KEY, JSON.stringify(legacy));

    const loaded = readPerkFormDraft("admin_1", storage);
    expect(loaded?.form.title).toBe("$8.25M Google Class Action");
    expect(loaded?.adminId).toBe("admin_1");
    expect(storage.getItem(ADMIN_PERK_FORM_DRAFT_LEGACY_KEY)).toBeNull();
    expect(readPerkFormDraft("admin_1", storage)?.form.title).toBe(
      "$8.25M Google Class Action",
    );
  });

  it("treats select/toggle-only changes as meaningful", () => {
    const draft = sampleDraft({
      form: {
        ...sampleDraft().form,
        title: "",
        partnerName: "",
        description: "",
        imageUrl: "",
        offerText: "",
        redemptionUrl: "",
        id: "",
        category: "finance",
        endsAt: "",
      },
    });
    expect(draftHasMeaningfulContent(draft)).toBe(true);
  });

  it("falls back on malformed audience targeting", () => {
    const parsed = parsePerkFormDraft({
      version: 1,
      adminId: "admin_1",
      mode: "create",
      editingId: null,
      form: {
        ...sampleDraft().form,
        audienceTargeting: { presets: "nope" },
      },
    });
    expect(parsed?.form.audienceTargeting).toEqual({ presets: ["all_users"] });
  });

  it("matches create vs edit sessions", () => {
    expect(draftMatchesSession(sampleDraft(), null)).toBe(true);
    expect(
      draftMatchesSession(
        sampleDraft({ mode: "edit", editingId: "perk_1" }),
        "perk_1",
      ),
    ).toBe(true);
    expect(
      draftMatchesSession(
        sampleDraft({ mode: "edit", editingId: "perk_1" }),
        "perk_2",
      ),
    ).toBe(false);
  });

  it("swallows blocked storage writes", () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(writePerkFormDraft(sampleDraft(), storage)).toBe(false);
    expect(() => clearPerkFormDraft("admin_1", storage)).not.toThrow();
  });
});
