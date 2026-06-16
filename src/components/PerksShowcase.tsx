import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BadgeDollarSign,
  Briefcase,
  Gift,
  Laptop,
  Rocket,
  Sparkles,
} from "lucide-react";
import { trackPerksLandingEvent } from "@/lib/product-analytics";

const benefitCards = [
  {
    icon: BadgeDollarSign,
    title: "Earn cashback from partner offers",
    description:
      "Get money back on purchases through exclusive KeenVPN partner deals.",
  },
  {
    icon: Rocket,
    title: "Startup and entrepreneur perks",
    description:
      "Access tools and credits designed to help founders and small teams grow.",
  },
  {
    icon: Briefcase,
    title: "Business banking incentives",
    description:
      "Unlock bonus rewards when you open accounts with our banking partners.",
  },
  {
    icon: Laptop,
    title: "Software discounts",
    description:
      "Save on productivity, developer, and business tools you use every day.",
  },
  {
    icon: Gift,
    title: "Future member rewards",
    description:
      "As our perks marketplace grows, so do the benefits of your membership.",
  },
];

const PerksShowcase = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const tracked = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !tracked.current) {
          tracked.current = true;
          trackPerksLandingEvent("perks_section_viewed");
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-20 bg-gradient-to-b from-background to-card/30"
    >
      <div className="container mx-auto px-4">
        <div className="text-center mb-6">
          <div className="inline-flex items-center bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6">
            <Sparkles className="h-4 w-4 text-primary mr-2" />
            <span className="text-sm text-primary font-medium">
              More Than a VPN
            </span>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Make Your Membership Pay for Itself
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Access exclusive cashback offers, startup perks, business discounts,
            and member-only rewards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mt-12">
          {benefitCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={index}
                className="p-6 bg-gradient-card rounded-xl border border-accent/30 shadow-card hover:shadow-glow transition-all duration-300 group hover:border-primary/50"
              >
                <div className="mb-4">
                  <div className="inline-flex p-3 bg-primary/20 rounded-lg group-hover:bg-primary/30 transition-colors">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {card.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Button
            asChild
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow text-lg px-8 py-6 font-semibold transition-all hover:scale-105"
            onClick={() => trackPerksLandingEvent("perks_cta_clicked")}
          >
            <Link to="/perks">
              Explore Member Perks
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PerksShowcase;
