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
  detectDevice,
  isAppDeepLinkSupported,
  getUnsupportedDeviceName,
} from "@/lib/device-detection";
import { useAppStoreUrl } from "@/hooks/use-app-store-url";
import { PAYMENT_SUCCESS_DEEP_LINK } from "@/lib/keenvpn-deep-links";

const PaymentSuccess = () => {
  const deepLinkSupported = useMemo(() => isAppDeepLinkSupported(), []);
  const unsupportedDevice = useMemo(() => getUnsupportedDeviceName(), []);
  const appStoreUrl = useAppStoreUrl();

  const downloadButtonLabel = useMemo(() => {
    const device = detectDevice();
    if (device === "ios") return "Download KeenVPN for iPhone";
    if (device === "macos") return "Download KeenVPN for Mac";
    return "Download KeenVPN App";
  }, []);

  const openAppStore = () => {
    window.open(appStoreUrl, "_blank", "noopener,noreferrer");
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
              {deepLinkSupported ? (
                <>
                  <Button
                    asChild
                    className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                    size="lg"
                  >
                    <a href={PAYMENT_SUCCESS_DEEP_LINK}>
                      <Smartphone className="mr-2 h-5 w-5" />
                      Return to KeenVPN App
                    </a>
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Tap the button above to open KeenVPN. If nothing happens,
                    open the app manually — your subscription is already active.
                  </p>
                  <div className="border-t border-border/60 pt-3">
                    <p className="mb-2 text-sm text-muted-foreground">
                      Don&apos;t have the app installed yet?
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={openAppStore}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {downloadButtonLabel}
                    </Button>
                  </div>
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
