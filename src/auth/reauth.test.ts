import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSessionToken } from "./backend";
import { signOut } from "./firebase";
import { resetAuthenticationForReauth } from "./reauth";

vi.mock("./backend", () => ({ clearSessionToken: vi.fn() }));
vi.mock("./firebase", () => ({ signOut: vi.fn() }));

describe("resetAuthenticationForReauth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears the backend session after Firebase signs out", async () => {
    vi.mocked(signOut).mockResolvedValue();

    await expect(resetAuthenticationForReauth()).resolves.toBe(true);
    expect(clearSessionToken).toHaveBeenCalledOnce();
  });

  it("reports a Firebase sign-out failure without clearing the backend session", async () => {
    vi.mocked(signOut).mockRejectedValue(new Error("sign-out failed"));

    await expect(resetAuthenticationForReauth()).resolves.toBe(false);
    expect(clearSessionToken).not.toHaveBeenCalled();
  });
});
