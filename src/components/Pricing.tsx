import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const Pricing = () => {
  const plan = {
    name: "KeenVPN Premium",
    price: "$100",
    period: "/year",
    description: "Complete VPN protection for the entire year",
    features: [
      "Access to all server locations",
      "Unlimited bandwidth", 
      "Military-grade encryption",
      "Multi-device support",
      "24/7 customer support",
      "No-log policy guaranteed",
      "Advanced security features",
      "Kill switch protection"
    ],
    buttonText: "Get KeenVPN"
  };

  return (
    <section className="py-20 bg-gradient-hero">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            One plan, one price. Get complete VPN protection for just $100 per year.
          </p>
        </div>

        <div className="flex justify-center">
          <div className="p-8 bg-gradient-card rounded-xl border border-primary/50 shadow-glow transition-all duration-300 max-w-md w-full">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-gradient-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium">
                Annual Plan
              </span>
            </div>

            <div className="text-center mb-8 mt-4">
              <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
              <p className="text-muted-foreground mb-4">{plan.description}</p>
              
              <div className="mb-4">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
                <div className="text-sm text-muted-foreground mt-1">
                  Just $8.33 per month
                </div>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {plan.features.map((feature, featureIndex) => (
                <li key={featureIndex} className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Button 
              className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
              size="lg"
            >
              {plan.buttonText}
            </Button>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            Simple pricing, powerful protection. Get started with KeenVPN today.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;