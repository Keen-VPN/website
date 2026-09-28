import {
  getDownloadClientId,
  getOrCreateDownloadClientId,
  getDownloadClientIdAuthPayload,
  captureDownloadClientIdFromSearch,
  DOWNLOAD_CLIENT_ID_STORAGE_KEY,
  DOWNLOAD_CLIENT_ID_SOURCE_KEY,
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
    expect(localStorage.getItem(DOWNLOAD_CLIENT_ID_SOURCE_KEY)).toBe("local");
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
    expect(localStorage.getItem(DOWNLOAD_CLIENT_ID_SOURCE_KEY)).toBe("handoff");
    expect(getDownloadClientIdAuthPayload()).toEqual({
      downloadClientId: handedOff,
    });
  });

  it("captures marketing dl- fallback handoff ids", () => {
    const handedOff = "dl-1a2b3c";
    expect(
      captureDownloadClientIdFromSearch(`?download_client_id=${handedOff}`),
    ).toBe(handedOff);
    expect(getDownloadClientId()).toBe(handedOff);
    expect(localStorage.getItem(DOWNLOAD_CLIENT_ID_SOURCE_KEY)).toBe("handoff");
  });

  it("lets marketing handoff replace a portal-local id", () => {
    const local = getOrCreateDownloadClientId();
    const handedOff = "11111111-2222-4333-8444-555555555555";
    expect(
      captureDownloadClientIdFromSearch(`?download_client_id=${handedOff}`),
    ).toBe(handedOff);
    expect(handedOff).not.toBe(local);
    expect(getDownloadClientId()).toBe(handedOff);
    expect(localStorage.getItem(DOWNLOAD_CLIENT_ID_SOURCE_KEY)).toBe("handoff");
  });

  it("keeps first-touch among handoff ids", () => {
    const first = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    expect(
      captureDownloadClientIdFromSearch(`?download_client_id=${first}`),
    ).toBe(first);
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
