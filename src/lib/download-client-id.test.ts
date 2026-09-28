import {
  getDownloadClientId,
  getOrCreateDownloadClientId,
  getDownloadClientIdAuthPayload,
  captureDownloadClientIdFromSearch,
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

  it("captures download_client_id from marketing handoff query", () => {
    const handedOff = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    expect(
      captureDownloadClientIdFromSearch(`?download_client_id=${handedOff}`),
    ).toBe(handedOff);
    expect(getDownloadClientId()).toBe(handedOff);
    expect(getDownloadClientIdAuthPayload()).toEqual({
      downloadClientId: handedOff,
    });
  });

  it("keeps first-touch id when query arrives later", () => {
    const first = getOrCreateDownloadClientId();
    expect(
      captureDownloadClientIdFromSearch(
        "?download_client_id=11111111-2222-4333-8444-555555555555",
      ),
    ).toBe(first);
    expect(getDownloadClientId()).toBe(first);
  });

  it("ignores invalid handoff values", () => {
    expect(
      captureDownloadClientIdFromSearch("?download_client_id=not valid!"),
    ).toBeNull();
    expect(getDownloadClientId()).toBeNull();
  });
});
