import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, Download, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  isAppDeepLinkSupported,
  getUnsupportedDeviceName,
} from "@/lib/device-detection";
import { useAppStoreUrl } from "@/hooks/use-app-store-url";
import {
  isNativeAppWebSession,
  openKeenVpnNativeApp,
  PAYMENT_SUCCESS_DEEP_LINK,
} from "@/lib/keenvpn-deep-links";
import {
  getAppStoreInstallButtonLabel,
  resolveAppStoreUrl,
} from "@/lib/open-app-or-store";

const PaymentSuccess = () => {
  const deepLinkSupported = useMemo(() => isAppDeepLinkSupported(), []);
  const fromNativeApp = useMemo(() => isNativeAppWebSession(), []);
  const unsupportedDevice = useMemo(() => getUnsupportedDeviceName(), []);
  const appStoreUrl = useAppStoreUrl();

  // Always "Download" + App Store — not getAppDownloadButtonLabel (that shows "Open" for subscribers).
  const downloadButtonLabel = useMemo(() => getAppStoreInstallButtonLabel(), []);

  const resolvedAppStoreUrl = useMemo(
    () => resolveAppStoreUrl(appStoreUrl),
    [appStoreUrl],
  );

  const openAppStore = () => {
    window.open(resolvedAppStoreUrl, "_blank", "noopener,noreferrer");
  };

  const openNativeApp = () => {
    openKeenVpnNativeApp(PAYMENT_SUCCESS_DEEP_LINK, resolvedAppStoreUrl);
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />

      <div className="container mx-auto flex min-h-[80vh] items-center justify-center px-4 py-16">
        <Card className="w-full max-w-lg border-primary/50 text-center shadow-glow">
          <CardHeader className="space-y-4 pb-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle className="text-3xl text-foreground">
              Payment complete
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Thanks for trying KeenVPN. Your subscription is active. You can
              now return to the app and connect to KeenVPN.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            <div className="rounded-lg bg-primary/5 p-4 text-left">
              <h3 className="mb-2 font-semibold text-foreground">What to do next</h3>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Return to the KeenVPN app on your device.</li>
                <li>Your subscription is already active — no extra setup needed.</li>
                <li>Choose a server and connect to start browsing securely.</li>
              </ol>
            </div>

            <div className="space-y-3">
              {fromNativeApp && deepLinkSupported ? (
                <>
                  <Button
                    type="button"
                    className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                    size="lg"
                    onClick={openNativeApp}
                  >
                    <Smartphone className="mr-2 h-5 w-5" />
                    Return to KeenVPN App
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Tap the button above to return to KeenVPN. Your subscription
                    is already active.
                  </p>
                </>
              ) : deepLinkSupported ? (
                <>
                  <Button
                    type="button"
                    className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                    size="lg"
                    onClick={openAppStore}
                  >
                    <Download className="mr-2 h-5 w-5" />
                    {downloadButtonLabel}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    After installing, sign in with the same account you used for
                    checkout. Your subscription will be ready to use.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Install KeenVPN on a supported device to connect. Your{" "}
                    {unsupportedDevice} cannot open the app directly from this
                    page.
                  </p>
                  <Button
                    type="button"
                    className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                    size="lg"
                    onClick={openAppStore}
                  >
                    <Download className="mr-2 h-5 w-5" />
                    {downloadButtonLabel}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    After installing, sign in with the same account you used for
                    checkout. Your subscription will be ready to use.
                  </p>
                </>
              )}

              <Button asChild variant="outline" className="w-full">
                <Link to="/account">Manage Account</Link>
              </Button>

              <Button asChild variant="ghost" className="w-full">
                <Link to="/">Back to Website</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default PaymentSuccess;
