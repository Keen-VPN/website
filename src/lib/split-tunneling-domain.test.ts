import { describe, expect, it } from "vitest";
import { normalizeSplitTunnelingDomain } from "./split-tunneling-domain";

describe("normalizeSplitTunnelingDomain", () => {
  it("normalizes urls and www prefixes", () => {
    expect(normalizeSplitTunnelingDomain("https://www.Bank.com/login")).toBe(
      "bank.com",
    );
    expect(normalizeSplitTunnelingDomain("http://example.com/")).toBe(
      "example.com",
    );
    expect(normalizeSplitTunnelingDomain("WWW.EXAMPLE.COM")).toBe("example.com");
  });

  it("rejects invalid values", () => {
    expect(normalizeSplitTunnelingDomain("")).toBeNull();
    expect(normalizeSplitTunnelingDomain("not a domain")).toBeNull();
    expect(normalizeSplitTunnelingDomain("*.company.internal")).toBe(
      "company.internal",
    );
  });
});
