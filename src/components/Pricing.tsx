import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const Pricing = () => {
  const plans = [
    {
      name: "Monthly",
      price: "$12.99",
      period: "/month",
      description: "Perfect for trying out KeenVPN",
      features: [
        "Unlimited bandwidth",
        "5000+ servers in 60+ countries",
        "Up to 10 devices",
        "24/7 customer support",
        "No-log policy",
        "Kill switch protection"
      ],
      popular: false
    },
    {
      name: "Annual",
      price: "$4.99",
      period: "/month",
      originalPrice: "$12.99",
      description: "Best value for long-term protection",
      features: [
        "Everything in Monthly",
        "61% savings",
        "Priority customer support",
        "Advanced threat protection",
        "Dedicated IP option",
        "30-day money-back guarantee"
      ],
      popular: true
    },
    {
      name: "2-Year",
      price: "$2.99",
      period: "/month",
      originalPrice: "$12.99",
      description: "Maximum savings for ultimate security",
      features: [
        "Everything in Annual",
        "77% savings",
        "Free additional months",
        "Premium server access",
        "VIP support",
        "Extended money-back guarantee"
      ],
      popular: false
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
            All plans include our complete feature set. Start with a 30-day money-back guarantee.
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
                  {plan.originalPrice && (
                    <div className="text-sm text-muted-foreground line-through mt-1">
                      {plan.originalPrice}/month
                    </div>
                  )}
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
                Get Started
              </Button>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            All plans include a 30-day money-back guarantee. No questions asked.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;