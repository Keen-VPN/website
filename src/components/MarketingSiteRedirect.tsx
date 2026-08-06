import { useEffect, useMemo } from "react";
import {
  resolveMarketingRedirectUrl,
  shouldReplaceWithMarketingUrl,
} from "@/lib/marketing-site-redirect";

interface MarketingSiteRedirectProps {
  path?: string;
}

export default function MarketingSiteRedirect({
  path = "/",
}: MarketingSiteRedirectProps) {
  const destination = useMemo(
    () =>
      resolveMarketingRedirectUrl(
        path,
        window.location.search,
        window.location.hash,
      ),
    [path],
  );
  const shouldRedirect = shouldReplaceWithMarketingUrl(
    destination,
    window.location.href,
  );

  useEffect(() => {
    if (shouldRedirect) {
      window.location.replace(destination);
    }
  }, [destination, shouldRedirect]);

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-background text-muted-foreground"
      aria-live="polite"
    >
      {shouldRedirect ? (
        <p>
          Opening KeenVPN…{" "}
          <a className="font-medium text-primary underline" href={destination}>
            Continue to KeenVPN
          </a>
        </p>
      ) : (
        <p>KeenVPN is already open at this address.</p>
      )}
    </main>
  );
}
