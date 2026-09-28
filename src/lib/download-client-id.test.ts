import {
  getDownloadClientId,
  getOrCreateDownloadClientId,
  getDownloadClientIdAuthPayload,
  DOWNLOAD_CLIENT_ID_STORAGE_KEY,
} from "./download-client-id";

describe("download-client-id", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when nothing stored", () => {
    expect(getDownloadClientId()).toBeNull();
    expect(getDownloadClientIdAuthPayload()).toEqual({});
  });

  it("creates and reuses a stable client id", () => {
    const first = getOrCreateDownloadClientId();
    const second = getOrCreateDownloadClientId();
    expect(first).toBeTruthy();
    expect(second).toBe(first);
    expect(localStorage.getItem(DOWNLOAD_CLIENT_ID_STORAGE_KEY)).toBe(first);
    expect(getDownloadClientIdAuthPayload()).toEqual({
      downloadClientId: first,
    });
  });
});
