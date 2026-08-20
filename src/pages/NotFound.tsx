import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { marketingSiteUrl } from "@/lib/site-urls";

const destinations = [
  {
    label: "Plans",
    title: "Pricing",
    description: "Compare plans and start a free trial.",
    href: marketingSiteUrl("/pricing.html"),
    external: true,
  },
  {
    label: "Account",
    title: "Sign in",
    description: "Open your KeenVPN account.",
    href: "/signin",
    external: false,
  },
  {
    label: "Coverage",
    title: "Server locations",
    description: "Browse countries and cities worldwide.",
    href: marketingSiteUrl("/server-locations/"),
    external: true,
  },
  {
    label: "Check",
    title: "My IP address",
    description: "See what the internet is seeing right now.",
    href: marketingSiteUrl("/my-ip-address"),
    external: true,
  },
] as const;

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(217,62%,15%)] text-foreground">
      <header className="flex items-center justify-between gap-6 border-b border-border/60 px-6 py-5 sm:px-10">
        <a
          href={marketingSiteUrl()}
          className="inline-flex items-center gap-3"
          aria-label="KeenVPN home"
        >
          <img src="/logo-white.png" alt="" className="h-9 w-9" />
          <span className="text-lg font-semibold tracking-tight">KeenVPN</span>
        </a>
        <nav className="flex items-center gap-2" aria-label="Quick links">
          <a
            href={marketingSiteUrl("/pricing.html")}
            className="hidden rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground sm:inline-flex"
          >
            Pricing
          </a>
          <Link
            to="/signin"
            className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Get started
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-6 py-14 sm:px-10 sm:py-20">
        <div className="max-w-xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-primary">
            Page not found
          </p>
          <h1 className="text-[clamp(2.5rem,7vw,4rem)] font-bold leading-[1.05] tracking-tight">
            We can’t find that page
          </h1>
          <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
            The link may be outdated, or the page may have moved. Choose a
            destination below to keep exploring KeenVPN.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={marketingSiteUrl()}
              className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-5 text-base font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Back to homepage
            </a>
            <Link
              to="/signin"
              className="inline-flex h-12 items-center justify-center rounded-md border border-border bg-card px-5 text-base font-medium text-foreground transition-colors hover:bg-muted"
            >
              Sign in
            </Link>
          </div>
        </div>

        <section
          aria-label="Popular destinations"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {destinations.map((item) => {
            const className =
              "flex min-h-[180px] flex-col gap-2.5 rounded-[18px] border border-border bg-card p-6 transition-transform hover:-translate-y-0.5 hover:border-primary/40";
            const content = (
              <>
                <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  {item.label}
                </span>
                <strong className="text-xl font-semibold leading-snug">
                  {item.title}
                </strong>
                <p className="mt-auto text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </>
            );

            if (item.external) {
              return (
                <a key={item.title} href={item.href} className={className}>
                  {content}
                </a>
              );
            }

            return (
              <Link key={item.title} to={item.href} className={className}>
                {content}
              </Link>
            );
          })}
        </section>
      </main>

      <footer className="px-6 py-6 text-sm text-muted-foreground sm:px-10">
        <a
          href="mailto:support@vpnkeen.com"
          className="transition-colors hover:text-foreground"
        >
          Need help? support@vpnkeen.com
        </a>
      </footer>
    </div>
  );
};

export default NotFound;
