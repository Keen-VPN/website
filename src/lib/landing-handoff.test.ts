import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isReplaceableLandingPlaceholder,
  parseValidHandoffCapturedAt,
} from "./landing-handoff";

describe("landing-handoff", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T12:00:00.000Z"));
  });

  it("detects marketing redirect placeholder routes", () => {
    expect(isReplaceableLandingPlaceholder("/")).toBe(true);
    expect(isReplaceableLandingPlaceholder("/pricing")).toBe(true);
    expect(isReplaceableLandingPlaceholder("/server-locations/brazil")).toBe(
      false,
    );
  });

  it("rejects stale or future handoff timestamps", () => {
    expect(
      parseValidHandoffCapturedAt("2026-04-21T12:00:00.000Z"),
    ).toBe("2026-04-21T12:00:00.000Z");
    expect(parseValidHandoffCapturedAt("not-a-date")).toBeNull();
    expect(parseValidHandoffCapturedAt("2030-01-01T00:00:00.000Z")).toBeNull();
    expect(parseValidHandoffCapturedAt("2020-01-01T00:00:00.000Z")).toBeNull();
  });
});
