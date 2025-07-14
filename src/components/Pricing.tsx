import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const Pricing = () => {
  const plans = [
    {
      name: "Free Version",
      price: "Free",
      period: "",
      description: "Basic protection to get started",
      features: [
        "2 server locations",
        "Basic encryption",
        "Limited bandwidth",
        "Community support",
        "No-log policy"
      ],
      popular: false,
      buttonText: "Download Free"
    },
    {
      name: "Premium",
      price: "$9.99",
      period: "/month",
      description: "Full protection with premium features",
      features: [
        "All server locations",
        "Unlimited bandwidth", 
        "Military-grade encryption",
        "Priority support",
        "Advanced security features",
        "Multi-device support"
      ],
      popular: true,
      buttonText: "Get Premium"
    },
    {
      name: "Lifetime",
      price: "$149",
      period: "one-time",
      description: "Pay once, protect forever",
      features: [
        "Everything in Premium",
        "Lifetime access",
        "Future server expansions",
        "VIP support",
        "Early access to new features",
        "No recurring fees"
      ],
      popular: false,
      buttonText: "Buy Lifetime"
    }
  ];

  return (
    <section className="py-20 bg-gradient-hero">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Choose Your Protection Plan
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start with our free version or upgrade for premium features and expanded server access.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div 
              key={index}
              className={`relative p-8 bg-gradient-card rounded-xl border shadow-card transition-all duration-300 hover:shadow-glow ${
                plan.popular 
                  ? 'border-primary/50 lg:scale-105' 
                  : 'border-border/50'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                <p className="text-muted-foreground mb-4">{plan.description}</p>
                
                <div className="mb-4">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
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
                className={`w-full ${
                  plan.popular 
                    ? 'bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow' 
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
                size="lg"
              >
                {plan.buttonText}
              </Button>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            Start with our free version and upgrade anytime for additional features.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;