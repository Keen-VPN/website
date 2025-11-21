import { Button } from "@/components/ui/button";
import { Shield, Zap, Globe, Lock } from "lucide-react";
import { useAppStoreUrl } from "@/hooks/use-app-store-url";

const Hero = () => {
  const appStoreUrl = useAppStoreUrl();

  return (
    <section className="relative min-h-screen bg-gradient-hero flex items-center justify-center overflow-hidden">
      {/* Background Effects with Brand Colors */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-50"></div>

      <div className="container mx-auto px-4 pt-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex items-center bg-card/50 backdrop-blur-sm border border-accent/30 rounded-full px-4 py-2 mb-6 shadow-lg">
              <Shield className="h-4 w-4 text-primary mr-2" />
              <span className="text-sm text-muted-foreground font-medium">
                Ultimate Privacy Protection
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
              Secure Your Digital
              <span className="text-primary block mt-2">Freedom</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Experience lightning-fast, enterprise-grade encrypted VPN
              protection. Browse anonymously, access global content, and keep
              your data safe with our growing server network.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow text-lg px-8 py-6 font-semibold transition-all hover:scale-105"
              onClick={() => window.open(appStoreUrl, "_blank")}
            >
              Download Now
            </Button>
            {/* <a href="https://docs.google.com/forms/d/1C_rRoaqkMz7Pitn_nerlL33Gzosfl850JWh0TA2pg20">
              <Button
                size="lg"
                variant="outline"
                className="border-accent text-accent hover:bg-accent/10 hover:border-accent/70 text-lg px-8 py-6 font-semibold transition-all hover:scale-105"
              >
                Learn More
              </Button>
            </a> */}
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="flex flex-col items-center p-6 bg-gradient-card rounded-xl border border-accent/30 shadow-card hover:shadow-glow transition-all hover:border-accent/50 group">
              <div className="p-3 bg-primary/20 rounded-lg mb-4 group-hover:bg-primary/30 transition-colors">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                Lightning Fast
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                High-performance servers with more locations coming soon
              </p>
            </div>

            <div className="flex flex-col items-center p-6 bg-gradient-card rounded-xl border border-accent/30 shadow-card hover:shadow-glow transition-all hover:border-accent/50 group">
              <div className="p-3 bg-primary/20 rounded-lg mb-4 group-hover:bg-primary/30 transition-colors">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                Military Grade
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                AES-256 encryption with zero-log policy
              </p>
            </div>

            <div className="flex flex-col items-center p-6 bg-gradient-card rounded-xl border border-accent/30 shadow-card hover:shadow-glow transition-all hover:border-accent/50 group">
              <div className="p-3 bg-primary/20 rounded-lg mb-4 group-hover:bg-primary/30 transition-colors">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                Global Access
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                Bypass geo-restrictions anywhere in the world
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
