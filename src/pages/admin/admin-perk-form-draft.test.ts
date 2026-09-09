import { describe, expect, it } from "vitest";
import {
  ADMIN_PERK_FORM_DRAFT_LEGACY_KEY,
  adminPerkFormDraftKey,
  claimUnscopedLegacyPerkFormDraft,
  clearPerkFormDraft,
  defaultPerkEndDateInput,
  discardUnscopedLegacyPerkFormDraft,
  draftHasMeaningfulContent,
  draftMatchesSession,
  isAdminSessionError,
  parsePerkFormDraft,
  peekUnscopedLegacyPerkFormDraft,
  readPerkFormDraft,
  writePerkFormDraft,
  type PerkFormDraft,
} from "./admin-perk-form-draft";

const FIXED_NOW = new Date("2026-09-09T12:00:00.000Z");
const FIXED_BLANK_ENDS = defaultPerkEndDateInput("", FIXED_NOW);

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
    blankEndsAt: FIXED_BLANK_ENDS,
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
      endsAt: FIXED_BLANK_ENDS,
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
    const blankEndsAt = FIXED_BLANK_ENDS;

    writePerkFormDraft(
      sampleDraft({
        form: { ...sampleDraft().form, endsAt: "2026-12-01" },
      }),
      storage,
      blankEndsAt,
    );
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
            endsAt: blankEndsAt,
            extensionDomains: [],
          },
        }),
        storage,
        blankEndsAt,
      ),
    ).toBe(false);
    expect(readPerkFormDraft("admin_1", storage)?.form.title).toBe(
      "$8.25M Google Class Action",
    );

    clearPerkFormDraft("admin_1", storage);
    expect(readPerkFormDraft("admin_1", storage)).toBeNull();
  });

  it("does not treat the session blank endsAt as meaningful content", () => {
    const blankEndsAt = FIXED_BLANK_ENDS;
    const draft = sampleDraft({
      blankEndsAt,
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
        endsAt: blankEndsAt,
      },
    });
    expect(draftHasMeaningfulContent(draft, blankEndsAt)).toBe(false);
  });

  it("does not auto-adopt a legacy draft for another admin", () => {
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

    expect(readPerkFormDraft("admin_b", storage)).toBeNull();
    expect(storage.getItem(ADMIN_PERK_FORM_DRAFT_LEGACY_KEY)).toBeTruthy();
    expect(storage.getItem(adminPerkFormDraftKey("admin_b"))).toBeNull();

    const pending = peekUnscopedLegacyPerkFormDraft(storage);
    expect(pending?.form.title).toBe("$8.25M Google Class Action");

    const claimed = claimUnscopedLegacyPerkFormDraft("admin_a", storage);
    expect(claimed?.adminId).toBe("admin_a");
    expect(storage.getItem(ADMIN_PERK_FORM_DRAFT_LEGACY_KEY)).toBeNull();
    expect(readPerkFormDraft("admin_a", storage)?.form.title).toBe(
      "$8.25M Google Class Action",
    );
    expect(readPerkFormDraft("admin_b", storage)).toBeNull();
  });

  it("refuses to claim a legacy draft over an existing scoped draft", () => {
    const storage = memoryStorage();
    writePerkFormDraft(
      sampleDraft({
        adminId: "admin_1",
        form: { ...sampleDraft().form, title: "Scoped draft", endsAt: "2026-12-01" },
      }),
      storage,
      FIXED_BLANK_ENDS,
    );
    storage.setItem(
      ADMIN_PERK_FORM_DRAFT_LEGACY_KEY,
      JSON.stringify({
        version: 1,
        mode: "create",
        form: { ...sampleDraft().form, title: "Legacy draft" },
      }),
    );

    expect(claimUnscopedLegacyPerkFormDraft("admin_1", storage)).toBeNull();
    expect(readPerkFormDraft("admin_1", storage)?.form.title).toBe(
      "Scoped draft",
    );
    expect(peekUnscopedLegacyPerkFormDraft(storage)?.form.title).toBe(
      "Legacy draft",
    );
  });

  it("can discard an unscoped legacy draft without claiming it", () => {
    const storage = memoryStorage();
    storage.setItem(
      ADMIN_PERK_FORM_DRAFT_LEGACY_KEY,
      JSON.stringify({
        version: 1,
        mode: "create",
        form: sampleDraft().form,
      }),
    );
    discardUnscopedLegacyPerkFormDraft(storage);
    expect(peekUnscopedLegacyPerkFormDraft(storage)).toBeNull();
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
        endsAt: FIXED_BLANK_ENDS,
      },
    });
    expect(draftHasMeaningfulContent(draft, FIXED_BLANK_ENDS)).toBe(true);
  });

  it("falls back on malformed audience targeting", () => {
    const parsed = parsePerkFormDraft({
      version: 1,
      adminId: "admin_1",
      mode: "create",
      editingId: null,
      blankEndsAt: FIXED_BLANK_ENDS,
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
    expect(
      writePerkFormDraft(
        sampleDraft({
          form: { ...sampleDraft().form, endsAt: "2026-12-01" },
        }),
        storage,
        FIXED_BLANK_ENDS,
      ),
    ).toBe(false);
    expect(() => clearPerkFormDraft("admin_1", storage)).not.toThrow();
  });
});
