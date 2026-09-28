import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthProductPreview from "@/components/auth/AuthProductPreview";
import SEOHead from "@/components/SEOHead";
import { returnToKeenVpnAppAfterAuth } from "@/lib/keenvpn-deep-links";
import { marketingSiteUrl } from "@/lib/site-urls";

interface AppAuthReturnProps {
  sessionToken: string | null;
  appStoreUrl: string;
  isDeepLinkSupported: boolean;
  unsupportedDeviceName: string;
}

/** Shown on /account?asweb=1 after a native app's browser sign-in succeeds. */
export default function AppAuthReturn({
  sessionToken,
  appStoreUrl,
  isDeepLinkSupported,
  unsupportedDeviceName,
}: AppAuthReturnProps) {
  return (
    <div className="min-h-[100dvh] bg-[#faf6ec] text-[#0f2040] lg:grid lg:grid-cols-[44.4%_55.6%]">
      <SEOHead
        title="Signed In — KeenVPN"
        description="You're signed in to KeenVPN. Return to the KeenVPN app to continue."
        canonical="https://vpnkeen.com/account"
        noIndex
      />

      <main className="flex min-h-[100dvh] flex-col px-5 py-6 sm:px-10 sm:py-8 lg:px-14 lg:pb-10 xl:px-20 2xl:px-24">
        <div className="mx-auto w-full max-w-[480px] lg:pt-8 xl:pt-10">
          <a
            href={marketingSiteUrl()}
            aria-label="KeenVPN home"
            className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e85c04] focus-visible:ring-offset-4 focus-visible:ring-offset-[#faf6ec]"
          >
            <img src="/logo.png" alt="" className="h-10 w-10" />
            <span className="text-xl font-bold tracking-[-0.035em]">
              KeenVPN
            </span>
          </a>

          <section className="mt-10 w-full sm:mt-12 lg:mt-14">
            <h1 className="text-[2rem] font-semibold leading-[1.12] tracking-[-0.04em] text-[#111827] lg:text-[2.7rem]">
              You&apos;re signed in to KeenVPN
            </h1>

            {!isDeepLinkSupported ? (
              <p className="mt-4 text-lg leading-7 text-[#6c7077] sm:text-xl">
                Your {unsupportedDeviceName} is not currently supported
              </p>
            ) : sessionToken ? (
              <>
                <p className="mt-4 text-lg leading-7 text-[#6c7077] sm:text-xl">
                  You&apos;ll be returned to the KeenVPN app. If it doesn&apos;t
                  open, use the button below.
                </p>
                <Button
                  type="button"
                  onClick={() =>
                    returnToKeenVpnAppAfterAuth(sessionToken, appStoreUrl)
                  }
                  className="mt-8 h-16 w-full cursor-pointer rounded-[0.7rem] bg-[#10244a] text-lg font-medium text-white shadow-none hover:bg-[#172f5c] lg:mt-9"
                  size="lg"
                >
                  Return to KeenVPN
                </Button>
              </>
            ) : (
              <p
                role="status"
                className="mt-4 flex items-center gap-2 text-lg leading-7 text-[#6c7077] sm:text-xl"
              >
                <Loader2 className="h-5 w-5 animate-spin text-[#10244a]" />
                Preparing your session...
              </p>
            )}
          </section>
        </div>

        <footer className="mx-auto mt-14 w-full max-w-[480px] pt-2 text-sm text-[#555a62] lg:mt-auto lg:pt-16">
          © {new Date().getFullYear()} KeenVPN. All rights reserved.
        </footer>
      </main>

      <AuthProductPreview />
    </div>
  );
}
