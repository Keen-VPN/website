import { afterEach, describe, expect, it, vi } from "vitest";
import {
  IMPORTANT_ONLY_PREFERENCES,
  parseEmailPreferencesIntent,
  resolveIntentAction,
} from "@/lib/email-preferences-intent";
import {
  requestEmailPreferencesLink,
  updateEmailCategoryPreferencesByToken,
  updateMyEmailCategoryPreferences,
} from "@/auth/backend";

describe("parseEmailPreferencesIntent", () => {
  it("accepts only the two known intents", () => {
    expect(parseEmailPreferencesIntent("important-only")).toBe(
      "important-only",
    );
    expect(parseEmailPreferencesIntent("unsubscribe")).toBe("unsubscribe");
  });

  it("ignores anything else so it can never trigger a write", () => {
    expect(parseEmailPreferencesIntent("delete-everything")).toBeNull();
    expect(parseEmailPreferencesIntent("IMPORTANT-ONLY")).toBeNull();
    expect(parseEmailPreferencesIntent("")).toBeNull();
    expect(parseEmailPreferencesIntent(null)).toBeNull();
    expect(parseEmailPreferencesIntent(undefined)).toBeNull();
  });
});

describe("IMPORTANT_ONLY_PREFERENCES", () => {
  it("leaves only product updates on", () => {
    expect(IMPORTANT_ONLY_PREFERENCES).toEqual({
      product_updates: true,
      education_privacy: false,
      perks_offers: false,
      referrals: false,
    });
  });
});

describe("resolveIntentAction", () => {
  it("applies the preset automatically only for a signed link", () => {
    expect(resolveIntentAction("important-only", "token")).toBe(
      "apply-important-only",
    );
  });

  it("asks a signed-in visitor on an unsigned link to confirm", () => {
    expect(resolveIntentAction("important-only", "session")).toBe(
      "confirm-important-only",
    );
  });

  it("never auto-unsubscribes; it spotlights the existing button", () => {
    expect(resolveIntentAction("unsubscribe", "token")).toBe(
      "highlight-unsubscribe",
    );
    expect(resolveIntentAction("unsubscribe", "session")).toBe(
      "highlight-unsubscribe",
    );
  });

  it("sends a signed link by email when the visitor is unidentified", () => {
    expect(resolveIntentAction("important-only", "identify")).toBe(
      "request-link",
    );
    expect(resolveIntentAction("unsubscribe", "identify")).toBe("request-link");
  });

  it("does nothing without a recognised intent", () => {
    expect(resolveIntentAction(null, "token")).toBe("none");
    expect(resolveIntentAction(null, "identify")).toBe("none");
  });
});

describe("preference API requests carry the intent", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetch() {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  function bodyOf(fetchMock: ReturnType<typeof stubFetch>) {
    return JSON.parse(fetchMock.mock.calls[0][1].body as string);
  }

  it("includes intent on the signed-link update", async () => {
    const fetchMock = stubFetch();
    await updateEmailCategoryPreferencesByToken(
      "tok",
      IMPORTANT_ONLY_PREFERENCES,
      "important-only",
    );
    expect(bodyOf(fetchMock)).toEqual({
      token: "tok",
      preferences: IMPORTANT_ONLY_PREFERENCES,
      intent: "important-only",
    });
  });

  it("omits intent on an ordinary save", async () => {
    const fetchMock = stubFetch();
    await updateEmailCategoryPreferencesByToken("tok", { referrals: false });
    expect(bodyOf(fetchMock)).toEqual({
      token: "tok",
      preferences: { referrals: false },
    });
  });

  it("includes intent on the session update", async () => {
    const fetchMock = stubFetch();
    await updateMyEmailCategoryPreferences(
      "session",
      IMPORTANT_ONLY_PREFERENCES,
      "important-only",
    );
    expect(bodyOf(fetchMock).intent).toBe("important-only");
  });

  it("passes the intent through the request-link call", async () => {
    const fetchMock = stubFetch();
    await requestEmailPreferencesLink("a@example.com", "important-only");
    expect(bodyOf(fetchMock)).toEqual({
      email: "a@example.com",
      intent: "important-only",
    });
  });

  it("omits intent on a plain request-link call", async () => {
    const fetchMock = stubFetch();
    await requestEmailPreferencesLink("a@example.com");
    expect(bodyOf(fetchMock)).toEqual({ email: "a@example.com" });
  });
});
