import { Shield, Plane, EyeOff, Globe, Zap, Banknote, ArrowRight } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Banknote,
      title: "Global Price Discovery",
      description:
        "Instantly find cheaper flights, hotel bookings, and software subscriptions by accessing regional global markets.",
      highlight: true,
      tag: "Financial Advantage"
    },
    {
      icon: Globe,
      title: "Limitless Access",
      description:
        "Bypass digital borders effortlessly. Enjoy your favorite streaming libraries and websites from anywhere in the world.",
      tag: "No Borders"
    },
    {
      icon: EyeOff,
      title: "Ad & Tracker Shield",
      description:
        "Block intrusive ads and invisible trackers automatically. Browse a cleaner, faster internet while saving data.",
      tag: "Pure Browsing"
    },
    {
      icon: Shield,
      title: "Elite Identity Protection",
      description:
        "Your digital life is secured with elite-level standards, ensuring your identity remains private and your data remains yours.",
      tag: "Privacy First"
    },
    {
      icon: Plane,
      title: "Secure Travel Mode",
      description:
        "Stay fully protected on public Wi-Fi. Access your home accounts and book travel safely while on the move.",
      tag: "Travel Safe"
    },
    {
      icon: Zap,
      title: "Premium Performance",
      description:
        "Experience a seamless connection. Our high-performance global network is optimized for smooth 4K streaming and browsing.",
      tag: "10Gbps Network"
    },
  ];

  return (
    <section className="py-32 bg-background relative overflow-hidden noise">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl max-h-4xl bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mb-24 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full mb-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Capabilities</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-foreground mb-8 leading-[0.9] tracking-tighter uppercase">
            More than just a VPN. <br />
            <span className="text-secondary dark:text-secondary italic">It's Your Financial Edge.</span>
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed font-medium max-w-2xl">
            KeenVPN combines impenetrable security with smart market-routing to ensure you never pay the "location tax" again.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isHighlight = feature.highlight;

            return (
              <div
                key={index}
                className={`group relative p-10 rounded-[2.5rem] transition-all duration-500 hover:-translate-y-2 flex flex-col items-start overflow-hidden min-h-[420px] ${
                  isHighlight 
                    ? "bg-secondary/10 dark:bg-secondary/5 backdrop-blur-2xl border-secondary/30 dark:border-secondary/20 hover:border-secondary/60 hover:shadow-[0_32px_64px_-16px_rgba(255,109,11,0.3)]" 
                    : "glass hover:bg-white/90 dark:hover:bg-slate-900/80 hover:border-primary/30 hover:shadow-[0_32px_64px_-16px_rgba(66,140,187,0.15)]"
                }`}
              >
                {/* Header Area with Icon and Tag */}
                <div className="w-full flex items-start justify-between mb-10">
                  <div className={`inline-flex p-5 rounded-2xl shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${
                    isHighlight ? "bg-secondary text-white shadow-secondary/20" : "bg-primary text-white shadow-primary/20"
                  }`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  
                  {feature.tag && (
                    <div className="overflow-hidden">
                      <span className={`inline-block text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg transform transition-all duration-500 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 ${
                        isHighlight ? "bg-secondary/20 text-secondary" : "bg-primary/10 text-primary"
                      }`}>
                        {feature.tag}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-4 mb-8">
                  <h3 className="text-2xl font-black text-foreground tracking-tighter uppercase group-hover:text-primary transition-colors leading-none">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed font-medium">
                    {feature.description}
                  </p>
                </div>

                <div className="mt-auto pt-6 border-t border-border/50 w-full flex items-center justify-between group/link cursor-pointer">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 group-hover/link:text-primary transition-colors">
                    Learn Tech Specs
                  </span>
                  <div className="h-8 w-8 rounded-full border border-border/50 flex items-center justify-center group-hover/link:border-primary/50 group-hover/link:bg-primary group-hover/link:text-white transition-all duration-300">
                    <ArrowRight className="w-4 h-4 transition-transform group-hover/link:translate-x-0.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
