import { useEffect, useMemo, useRef } from "react";
import {
  Chrome,
  Download,
  Laptop,
  Monitor,
  Smartphone,
  TabletSmartphone,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toNativeAppStoreSchemeUrl } from "@/constants/app-store-urls";
import { recordAppDownloadClicked } from "@/auth/backend";
import {
  appendCampaignParamsToStoreUrl,
  DOWNLOAD_APP_PLATFORM_OPTIONS,
  resolveDownloadAppDecision,
  storeUrlForPlatform,
  toAppDownloadPlatform,
  type DownloadAppStorePlatform,
} from "@/lib/download-app";
import { detectDevice } from "@/lib/device-detection";
import { trackPostHogDownloadAppLinkOpened } from "@/lib/posthog-analytics";

const PLATFORM_ICONS: Record<DownloadAppStorePlatform, typeof Monitor> = {
  windows: Monitor,
  macos: Laptop,
  ios: TabletSmartphone,
  android: Smartphone,
  chrome: Chrome,
};

function platformLabel(platform: string): string {
  switch (platform) {
    case "ios":
      return "iOS App Store";
    case "macos":
      return "Mac App Store";
    case "android":
      return "Google Play";
    case "windows":
      return "Microsoft Store";
    case "chrome":
      return "Chrome Web Store";
    default:
      return "platform picker";
  }
}

function selectionPath(searchParams: URLSearchParams): string {
  const next = new URLSearchParams(searchParams);
  next.set("platform", "select");
  const qs = next.toString();
  return qs ? `/download-app?${qs}` : "/download-app?platform=select";
}

export default function DownloadApp() {
  const [searchParams] = useSearchParams();
  const trackedOpenRef = useRef(false);
  const redirectedRef = useRef(false);

  const decision = useMemo(() => {
    const device = detectDevice();
    const userAgent =
      typeof navigator !== "undefined" ? navigator.userAgent : "";
    return resolveDownloadAppDecision({
      detectedDevice: device,
      userAgent,
      platformOverride: searchParams.get("platform"),
      search: searchParams.toString(),
    });
  }, [searchParams]);

  const showRedirect = Boolean(
    decision.shouldAutoRedirect && decision.storeUrl,
  );

  useEffect(() => {
    if (trackedOpenRef.current) return;
    trackedOpenRef.current = true;

    const referrer =
      typeof document !== "undefined" ? document.referrer || null : null;

    trackPostHogDownloadAppLinkOpened({
      detected_platform: decision.detectedPlatform,
      destination_platform: decision.destinationPlatform,
      source_page: "/download-app",
      referrer,
      auto_redirect: decision.shouldAutoRedirect,
      store_url: decision.storeUrl,
    });

    if (!decision.shouldAutoRedirect || !decision.storeUrl) return;
    if (redirectedRef.current) return;
    redirectedRef.current = true;

    const destinationUrl = decision.storeUrl;

    void recordAppDownloadClicked({
      platform: toAppDownloadPlatform(decision.destinationPlatform),
      sourcePage: "/download-app",
      cta: `download_app_auto_${decision.destinationPlatform}`,
      storeUrl: destinationUrl,
    });

    // Brief pause so analytics keepalive can flush before navigation.
    const timer = window.setTimeout(() => {
      window.location.replace(destinationUrl);
    }, 150);

    return () => window.clearTimeout(timer);
  }, [decision]);

  const onManualSelect = (platform: DownloadAppStorePlatform) => {
    const device = detectDevice();
    const raw = storeUrlForPlatform(platform);
    const withNative = toNativeAppStoreSchemeUrl(raw, device);
    const storeUrl = appendCampaignParamsToStoreUrl(
      withNative,
      searchParams.toString(),
    );

    trackPostHogDownloadAppLinkOpened({
      detected_platform: decision.detectedPlatform,
      destination_platform: platform,
      source_page: "/download-app",
      referrer:
        typeof document !== "undefined" ? document.referrer || null : null,
      auto_redirect: false,
      store_url: storeUrl,
    });

    void recordAppDownloadClicked({
      platform,
      sourcePage: "/download-app",
      cta: `download_app_manual_${platform}`,
      storeUrl,
    });

    window.location.assign(storeUrl);
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <SEOHead
        title="Download KeenVPN | Universal app link"
        description="One KeenVPN download link for every device. We detect your platform and send you to the right app store — or pick Windows, macOS, iOS, Android, or Chrome."
        canonical="https://vpnkeen.com/download-app"
      />
      <Header />

      <main className="container mx-auto flex min-h-[72vh] items-center justify-center px-4 pb-16 pt-28">
        {showRedirect && decision.storeUrl ? (
          <Card className="w-full max-w-lg border-primary/40 text-center shadow-glow">
            <CardHeader className="space-y-3">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                <Download className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Opening your download</CardTitle>
              <CardDescription className="text-base">
                Taking you to the {platformLabel(decision.destinationPlatform)}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                asChild
                size="lg"
                className="w-full bg-gradient-primary text-primary-foreground shadow-glow"
              >
                <a href={decision.storeUrl}>Continue to store</a>
              </Button>
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link to={selectionPath(searchParams)}>
                  Choose a different platform
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-xl border-primary/40 shadow-glow">
            <CardHeader className="space-y-3 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                <Download className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm font-medium uppercase tracking-wide text-primary">
                Download KeenVPN
              </p>
              <CardTitle className="text-3xl">Choose your platform</CardTitle>
              <CardDescription className="text-base">
                Pick where you want to install KeenVPN — Windows, macOS, iOS,
                Android, or Chrome.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {DOWNLOAD_APP_PLATFORM_OPTIONS.map((option) => {
                const Icon = PLATFORM_ICONS[option.id];
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onManualSelect(option.id)}
                    className="flex w-full items-center gap-4 rounded-xl border border-border bg-card/70 px-4 py-3.5 text-left transition hover:border-primary/50 hover:bg-card"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                      <Icon className="h-5 w-5 text-primary" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-foreground">
                        {option.title}
                      </span>
                      <span className="block text-[13px] text-muted-foreground">
                        {option.subtitle}
                      </span>
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold text-primary">
                      {option.cta}
                    </span>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
