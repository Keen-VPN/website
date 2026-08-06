import { useEffect, useMemo } from "react";
import { resolveMarketingRedirectUrl } from "@/lib/marketing-site-redirect";

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

  useEffect(() => {
    window.location.replace(destination);
  }, [destination]);

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-background text-muted-foreground"
      aria-live="polite"
    >
      <p>
        Opening KeenVPN…{" "}
        <a className="font-medium text-primary underline" href={destination}>
          Continue to KeenVPN
        </a>
      </p>
    </main>
  );
}
