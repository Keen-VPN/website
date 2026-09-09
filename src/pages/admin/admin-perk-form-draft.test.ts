import { describe, expect, it } from "vitest";
import {
  clearPerkFormDraft,
  draftHasMeaningfulContent,
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

describe("admin-perk-form-draft", () => {
  it("detects admin session errors", () => {
    expect(isAdminSessionError("Admin session required")).toBe(true);
    expect(isAdminSessionError("Title is required")).toBe(false);
  });

  it("round-trips draft through storage without tokens", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    };

    writePerkFormDraft(sampleDraft(), storage);
    const loaded = readPerkFormDraft(storage);
    expect(loaded?.form.title).toBe("$8.25M Google Class Action");
    expect(loaded?.form.category).toBe("finance");
    expect(JSON.stringify(loaded)).not.toMatch(/token|password|session/i);

    // Empty writes must not wipe an existing recovery draft.
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
            extensionDomains: [],
          },
        }),
        storage,
      ),
    ).toBe(false);
    expect(readPerkFormDraft(storage)?.form.title).toBe(
      "$8.25M Google Class Action",
    );

    clearPerkFormDraft(storage);
    expect(readPerkFormDraft(storage)).toBeNull();
  });

  it("ignores empty drafts", () => {
    const empty = sampleDraft({
      form: {
        ...sampleDraft().form,
        title: "",
        description: "",
        imageUrl: "",
        offerText: "",
        redemptionUrl: "",
        id: "",
      },
    });
    expect(draftHasMeaningfulContent(empty)).toBe(false);
    expect(parsePerkFormDraft({ version: 2, form: {} })).toBeNull();
  });
});
