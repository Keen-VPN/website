import * as React from "react";
import { ArrowRight, CheckCircle2, MinusCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  whyKeenVpnBenefits,
  whyKeenVpnComparison,
  whyKeenVpnPillars,
} from "@/constants/why-keenvpn";
import { trackProductEngagement } from "@/lib/product-analytics";

interface WhyKeenVPNProps {
  source: "landing" | "pricing";
  compact?: boolean;
}

const WhyKeenVPN = ({ source, compact = false }: WhyKeenVPNProps) => {
  const sectionRef = React.useRef<HTMLElement | null>(null);
  const hasTrackedView = React.useRef(false);
  const pillars = compact ? whyKeenVpnPillars.slice(0, 3) : whyKeenVpnPillars;
  const ctaHref = source === "pricing" ? "#plans" : "/pricing";
  const ctaLabel = source === "pricing" ? "See plans" : "Compare plans";

  React.useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || hasTrackedView.current) return;
        hasTrackedView.current = true;
        trackProductEngagement("why_keenvpn_viewed", { source });
        observer.disconnect();
      },
      { threshold: 0.35 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [source]);

  const handleComparisonClick = (target: string) => {
    trackProductEngagement("comparison_section_clicked", {
      source,
      target,
    });
  };

  const handleComparisonKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleComparisonClick("comparison_table");
  };

  return (
    <section
      ref={sectionRef}
      id="why-keenvpn"
      className={compact ? "py-14 bg-background" : "py-20 bg-background"}
    >
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase text-primary">
            Why KeenVPN?
          </p>
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">
            Built for people who actually use VPNs every day
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            KeenVPN focuses on transparency, simplicity, and real-world
            usability, not just long server lists or vague privacy promises.
          </p>
        </div>

        <div
          className={`mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-4 ${
            compact ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-4"
          }`}
        >
          {pillars.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="rounded-lg border border-border bg-card p-6 shadow-card transition-colors hover:border-primary/40"
              >
                <div className="mb-5 inline-flex rounded-md bg-primary/15 p-3 text-primary">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </article>
            );
          })}
        </div>

        {!compact && (
          <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {whyKeenVpnBenefits.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-lg border border-border/80 bg-muted/20 p-5"
                >
                  <Icon className="mb-4 h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="text-base font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        )}

        <div className="mx-auto mt-10 max-w-5xl overflow-x-auto rounded-lg border border-border bg-card">
          <div
            role="button"
            tabIndex={0}
            className="min-w-[680px] w-full"
            onClick={() => handleComparisonClick("comparison_table")}
            onKeyDown={handleComparisonKeyDown}
          >
            <div className="grid grid-cols-[1.1fr_1fr_1fr] gap-3 border-b border-border bg-muted/30 px-4 py-4 text-sm font-semibold text-foreground md:px-6">
              <span>Feature</span>
              <span>KeenVPN</span>
              <span>Typical VPN</span>
            </div>
            {whyKeenVpnComparison.map((row) => (
              <div
                key={row.feature}
                className="grid grid-cols-[1.1fr_1fr_1fr] gap-3 border-b border-border px-4 py-4 text-sm last:border-b-0 md:px-6"
              >
                <span className="font-medium text-foreground">{row.feature}</span>
                <span className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  {row.keenVpn}
                </span>
                <span className="flex items-start gap-2 text-muted-foreground">
                  <MinusCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  {row.typicalVpn}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            asChild
            size="lg"
            onClick={() => handleComparisonClick("pricing_cta")}
          >
            <Link to={ctaHref}>
              {ctaLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            No competitor attacks. Just clear reasons to switch.
          </p>
        </div>
      </div>
    </section>
  );
};

export default WhyKeenVPN;
