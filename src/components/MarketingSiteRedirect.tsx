import { useEffect } from "react";
import { marketingSiteUrl } from "@/lib/site-urls";

interface MarketingSiteRedirectProps {
  path?: string;
}

export default function MarketingSiteRedirect({
  path = "/",
}: MarketingSiteRedirectProps) {
  useEffect(() => {
    const destination = new URL(marketingSiteUrl(path));
    destination.search = window.location.search;
    if (window.location.hash) {
      destination.hash = window.location.hash;
    }
    window.location.replace(destination.toString());
  }, [path]);

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-background text-muted-foreground"
      aria-live="polite"
    >
      Opening KeenVPN…
    </main>
  );
}
