import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BadgeDollarSign,
  Building2,
  Percent,
} from "lucide-react";
import { trackPerksLandingEvent } from "@/lib/product-analytics";

const examplePerks = [
  {
    icon: Building2,
    label: "Startup benefit",
    title: "Earn $250 with Airwallex",
    description: "Business banking offer for startups and entrepreneurs.",
  },
  {
    icon: BadgeDollarSign,
    label: "Cashback",
    title: "Cashback Offers",
    description: "Exclusive member rewards on everyday purchases.",
  },
  {
    icon: Percent,
    label: "Discounts",
    title: "Partner Discounts",
    description: "Software, productivity, and business tool savings.",
  },
];

const PerksExamples = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Perks Available Now
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Here&apos;s a preview of what members are already enjoying.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {examplePerks.map((perk, index) => {
            const Icon = perk.icon;
            return (
              <div
                key={index}
                className="relative p-6 rounded-xl border border-accent/30 bg-gradient-card shadow-card hover:shadow-glow transition-all duration-300 hover:border-primary/50 group"
              >
                <div className="absolute top-4 right-4">
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                    {perk.label}
                  </span>
                </div>
                <div className="mb-4 mt-2">
                  <div className="inline-flex p-3 bg-primary/20 rounded-lg group-hover:bg-primary/30 transition-colors">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {perk.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {perk.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-primary/50 text-primary hover:bg-primary/10 hover:border-primary text-lg px-8 py-6 font-semibold transition-all hover:scale-105"
            onClick={() => trackPerksLandingEvent("perks_cta_clicked")}
          >
            <Link to="/perks">
              See Available Perks
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PerksExamples;
