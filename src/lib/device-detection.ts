export type DeviceType = "ios" | "macos" | "android" | "windows" | "other";

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

  // Windows detection (desktop app registers vpnkeen:// handlers)
  if (/win/.test(platform) || /windows/.test(userAgent)) {
    return "windows";
  }

  return "other";
}

export function isApplePlatform(): boolean {
  const device = detectDevice();
  return device === "macos" || device === "ios";
}

export function isAppDeepLinkSupported(): boolean {
  const device = detectDevice();
  return device === "macos" || device === "ios" || device === "windows";
}

export function getUnsupportedDeviceName(): string {
  const ua = typeof window !== "undefined" ? window.navigator.userAgent.toLowerCase() : "";
  if (/android/.test(ua)) return "Android device";
  if (/windows/.test(ua)) return "Windows device";
  if (/linux/.test(ua)) return "Linux device";
  return "device";
}
