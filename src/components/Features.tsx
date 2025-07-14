import { Shield, Eye, Wifi, Smartphone, Server, Clock } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Shield,
      title: "Zero-Log Policy",
      description: "We never track, collect, or store your online activity. Your privacy is guaranteed."
    },
    {
      icon: Eye,
      title: "Anonymous Browsing",
      description: "Hide your IP address and browse the web completely anonymously with military-grade encryption."
    },
    {
      icon: Wifi,
      title: "Public WiFi Protection",
      description: "Stay safe on public networks with automatic encryption and threat detection."
    },
    {
      icon: Smartphone,
      title: "Multi-Device Support",
      description: "Protect up to 10 devices simultaneously with one account across all platforms."
    },
    {
      icon: Server,
      title: "5000+ Servers",
      description: "Connect to our global network of high-speed servers in 60+ countries worldwide."
    },
    {
      icon: Clock,
      title: "24/7 Support",
      description: "Get instant help from our expert support team whenever you need assistance."
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Why Choose KeenVPN?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Advanced security features designed to protect your digital life and ensure complete privacy online.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index}
                className="p-8 bg-gradient-card rounded-xl border border-border/50 shadow-card hover:shadow-glow transition-all duration-300 group"
              >
                <div className="mb-6">
                  <div className="inline-flex p-3 bg-primary/20 rounded-lg group-hover:bg-primary/30 transition-colors">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;