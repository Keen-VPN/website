import { describe, expect, it } from "vitest";
import { resolveInviteToken, type FetchLike } from "./invite-resolve";

interface Reply {
  ok?: boolean;
  body?: unknown;
  throws?: boolean;
}

/** Routes each resolve endpoint to a canned reply and records the calls made. */
function stubFetch(replies: { referral: Reply; affiliate?: Reply }) {
  const calls: string[] = [];
  const impl = ((input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const reply = url.includes("/affiliate-links/resolve/")
      ? replies.affiliate
      : replies.referral;
    if (!reply || reply.throws) return Promise.reject(new Error("network"));
    return Promise.resolve({
      ok: reply.ok ?? true,
      json: () => Promise.resolve(reply.body),
    } as Response);
  }) as unknown as FetchLike;
  return { impl, calls };
}

describe("resolveInviteToken", () => {
  it("resolves a member referral without asking about affiliate links", async () => {
    const { impl, calls } = stubFetch({
      referral: { body: { valid: true, referrerName: "Ada" } },
    });

    await expect(resolveInviteToken("tok", impl)).resolves.toEqual({
      status: "valid",
      invite: { kind: "referral", referrerName: "Ada", rewardMonths: 1 },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("/referral/resolve/tok");
  });

  it("applies campaign months only while the campaign is active", async () => {
    const active = stubFetch({
      referral: {
        body: { valid: true, campaign: { active: true, rewardMonths: 3 } },
      },
    });
    await expect(resolveInviteToken("tok", active.impl)).resolves.toMatchObject(
      {
        invite: { rewardMonths: 3 },
      },
    );

    const ended = stubFetch({
      referral: {
        body: { valid: true, campaign: { active: false, rewardMonths: 3 } },
      },
    });
    await expect(resolveInviteToken("tok", ended.impl)).resolves.toMatchObject({
      invite: { rewardMonths: 1 },
    });
  });

  // KVPN-559: the regression this module exists for. A pre-signup affiliate
  // token is unknown to the referral table, and used to render "This invite
  // isn't available" — dropping the token so nothing was ever attributed.
  it("falls back to the affiliate table when the referral table does not know the token", async () => {
    const { impl, calls } = stubFetch({
      referral: { body: { valid: false } },
      affiliate: {
        body: {
          valid: true,
          displayName: "Grace",
          campaignId: "aug-2026",
          rewardMonths: 3,
        },
      },
    });

    await expect(resolveInviteToken("tok", impl)).resolves.toEqual({
      status: "valid",
      invite: { kind: "affiliate", referrerName: "Grace", rewardMonths: 3 },
    });
    expect(calls).toHaveLength(2);
    expect(calls[1]).toContain("/affiliate-links/resolve/tok");
  });

  it("keeps an affiliate link usable when it exposes no display name", async () => {
    const { impl } = stubFetch({
      referral: { body: { valid: false } },
      affiliate: { body: { valid: true, displayName: null } },
    });

    await expect(resolveInviteToken("tok", impl)).resolves.toEqual({
      status: "valid",
      invite: { kind: "affiliate", referrerName: null, rewardMonths: 1 },
    });
  });

  it("reports invalid only when both tables answer that they do not know it", async () => {
    const { impl } = stubFetch({
      referral: { body: { valid: false } },
      affiliate: { body: { valid: false } },
    });

    await expect(resolveInviteToken("tok", impl)).resolves.toEqual({
      status: "invalid",
    });
  });

  it("prefers a retryable failure over discarding a possibly-good invite", async () => {
    // The affiliate lookup is the one that broke, so we cannot know whether
    // the link was good. Saying "invalid" here would send the visitor away.
    const throwing = stubFetch({
      referral: { body: { valid: false } },
      affiliate: { throws: true },
    });
    await expect(resolveInviteToken("tok", throwing.impl)).resolves.toEqual({
      status: "failed",
    });

    const throttled = stubFetch({
      referral: { body: { valid: false } },
      affiliate: { ok: false, body: { message: "Too Many Requests" } },
    });
    await expect(resolveInviteToken("tok", throttled.impl)).resolves.toEqual({
      status: "failed",
    });
  });

  it("treats a body with no usable `valid` boolean as a failure, not a dead link", async () => {
    const { impl } = stubFetch({
      referral: { body: {} },
      affiliate: { body: "not json at all" },
    });

    await expect(resolveInviteToken("tok", impl)).resolves.toEqual({
      status: "failed",
    });
  });

  it("still finds an affiliate link when the referral endpoint is down", async () => {
    const { impl } = stubFetch({
      referral: { throws: true },
      affiliate: { body: { valid: true, displayName: "Grace" } },
    });

    await expect(resolveInviteToken("tok", impl)).resolves.toMatchObject({
      status: "valid",
      invite: { kind: "affiliate" },
    });
  });

  it("encodes the token rather than splicing it into the path", async () => {
    const { impl, calls } = stubFetch({
      referral: { body: { valid: true } },
    });

    await resolveInviteToken("a/b?c", impl);
    expect(calls[0]).toContain("/referral/resolve/a%2Fb%3Fc");
  });
});
