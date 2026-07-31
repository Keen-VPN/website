import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Globe2, Smartphone } from "lucide-react";
import { useSearchParams } from "react-router-dom";
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
import { isAppDeepLinkSupported } from "@/lib/device-detection";
import {
  OPEN_APP_DEEP_LINK,
  openKeenVpnAppStore,
  openKeenVpnFromExternalPage,
} from "@/lib/keenvpn-deep-links";
import { resolveOpenAppLandingContent } from "@/lib/open-app-landing";
import { getAppStoreInstallButtonLabel } from "@/lib/open-app-or-store";
import { useAppStoreUrl } from "@/hooks/use-app-store-url";

export default function OpenApp() {
  const [searchParams] = useSearchParams();
  const content = useMemo(
    () => resolveOpenAppLandingContent(searchParams.get("location")),
    [searchParams],
  );
  const appStoreUrl = useAppStoreUrl();
  const canOpenApp = useMemo(() => isAppDeepLinkSupported(), []);
  const [attemptedOpen, setAttemptedOpen] = useState(false);
  const cleanupAttemptRef = useRef<(() => void) | null>(null);
  const autoOpenStartedRef = useRef(false);

  const openApp = useCallback(() => {
    cleanupAttemptRef.current?.();
    setAttemptedOpen(true);
    cleanupAttemptRef.current = openKeenVpnFromExternalPage(
      OPEN_APP_DEEP_LINK,
      appStoreUrl,
    );
  }, [appStoreUrl]);

  useEffect(() => {
    if (!canOpenApp || autoOpenStartedRef.current) {
      return;
    }
    autoOpenStartedRef.current = true;
    openApp();

    return () => {
      cleanupAttemptRef.current?.();
      cleanupAttemptRef.current = null;
    };
  }, [canOpenApp, openApp]);

  const openDownload = () => {
    cleanupAttemptRef.current?.();
    openKeenVpnAppStore(appStoreUrl);
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <SEOHead
        title={`${content.title} | KeenVPN`}
        description={content.description}
        canonical="https://vpnkeen.com/open-app"
      />
      <Header />

      <main className="container mx-auto flex min-h-[72vh] items-center justify-center px-4 pb-16 pt-28">
        <Card className="w-full max-w-lg border-primary/40 text-center shadow-glow">
          <CardHeader className="space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/15">
              <Globe2 className="h-11 w-11 text-primary" />
            </div>
            <p className="text-sm font-medium uppercase tracking-wide text-primary">
              {content.eyebrow}
            </p>
            <CardTitle className="text-3xl">{content.title}</CardTitle>
            <CardDescription className="text-base">
              {content.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="rounded-lg bg-primary/5 p-4 text-sm text-muted-foreground">
              {content.instruction}
            </p>

            {canOpenApp ? (
              <Button
                type="button"
                size="lg"
                className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                onClick={openApp}
              >
                <Smartphone className="mr-2 h-5 w-5" />
                Open KeenVPN
              </Button>
            ) : null}

            <Button
              type="button"
              size="lg"
              variant={canOpenApp ? "outline" : "default"}
              className="w-full"
              onClick={openDownload}
            >
              <Download className="mr-2 h-5 w-5" />
              {getAppStoreInstallButtonLabel()}
            </Button>

            {attemptedOpen ? (
              <p className="text-xs text-muted-foreground">
                If KeenVPN did not open, use the download button or try opening
                the app again.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
