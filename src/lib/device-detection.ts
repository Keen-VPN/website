export type DeviceType = "ios" | "macos" | "android" | "other";

export function detectDevice(): DeviceType {
  if (typeof window === "undefined") {
    return "other";
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform.toLowerCase();

  // iOS detection (iPhone, iPad, iPod)
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return "ios";
  }

  // macOS detection
  // Check for Mac platform but exclude iOS devices
  if (/mac/.test(platform) && !/iphone|ipad|ipod/.test(userAgent)) {
    return "macos";
  }

  // Android detection
  if (/android/.test(userAgent)) {
    return "android";
  }

  return "other";
}
