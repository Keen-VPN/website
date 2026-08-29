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

  it("collapses *.example.com to the apex (subdomains are covered by apex)", () => {
    // Backend + Chrome treat apex exclusions as matching subdomains, so the
    // supported stored form is bare `example.com`, not a preserved `*.` rule.
    expect(normalizeSplitTunnelingDomain("*.company.internal")).toBe(
      "company.internal",
    );
    expect(normalizeSplitTunnelingDomain("*.Bank.com")).toBe("bank.com");
  });

  it("rejects wildcards embedded after www", () => {
    expect(normalizeSplitTunnelingDomain("www.*.bank.com")).toBeNull();
  });

  it("rejects public-suffix-only domains", () => {
    expect(normalizeSplitTunnelingDomain("co.uk")).toBeNull();
    expect(normalizeSplitTunnelingDomain("com.au")).toBeNull();
    expect(normalizeSplitTunnelingDomain("example.co.uk")).toBe("example.co.uk");
  });

  it("rejects invalid values", () => {
    expect(normalizeSplitTunnelingDomain("")).toBeNull();
    expect(normalizeSplitTunnelingDomain("not a domain")).toBeNull();
    expect(normalizeSplitTunnelingDomain("*bank.com")).toBeNull();
    expect(normalizeSplitTunnelingDomain("foo.*.bar.com")).toBeNull();
  });
});
