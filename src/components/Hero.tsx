import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Download,
  Globe,
  Lock,
  Monitor,
  Shield,
  ShieldCheck,
  Smartphone,
  UserRound,
  Wifi,
  Zap,
} from "lucide-react";
import { useAppStoreUrl } from "@/hooks/use-app-store-url";
import { Link } from "react-router-dom";

const Hero = () => {
  const appStoreUrl = useAppStoreUrl();

  return (
    <section className="relative bg-gradient-hero overflow-hidden pt-28 pb-14 md:pt-32 md:pb-20">
      {/* Background Effects with Brand Colors */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-50"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex items-center bg-card/50 backdrop-blur-sm border border-accent/30 rounded-full px-4 py-2 mb-6 shadow-lg">
              <Shield className="h-4 w-4 text-primary mr-2" />
              <span className="text-sm text-muted-foreground font-medium">
                VPN for iOS and macOS
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
              Fast, secure VPN for
              <span className="text-primary block mt-2">
                everyday browsing
              </span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Download KeenVPN to protect your connection on public Wi-Fi,
              keep browsing private, and manage your subscription from your
              web account.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow text-lg px-8 py-6 font-semibold transition-all hover:scale-105"
              onClick={() => window.open(appStoreUrl, "_blank")}
            >
              <Download className="h-5 w-5" />
              Download KeenVPN
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-accent text-accent hover:bg-accent/10 hover:border-accent/70 text-lg px-8 py-6 font-semibold transition-all hover:scale-105"
            >
              <Link to="/pricing">Start free VPN trial</Link>
            </Button>
          </div>

          <p className="mb-8 text-sm text-muted-foreground">
            Start with a free trial. No setup headaches. No commitment.
          </p>

          <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-md border border-border bg-card/60 px-3 py-2 text-sm text-muted-foreground">
              <Smartphone className="h-4 w-4 text-primary" />
              iOS
            </div>
            <div className="inline-flex items-center gap-2 rounded-md border border-border bg-card/60 px-3 py-2 text-sm text-muted-foreground">
              <Monitor className="h-4 w-4 text-primary" />
              macOS
            </div>
            <div className="inline-flex items-center gap-2 rounded-md border border-border bg-card/60 px-3 py-2 text-sm text-muted-foreground">
              <UserRound className="h-4 w-4 text-primary" />
              Web account management
            </div>
            <div className="inline-flex items-center gap-2 rounded-md border border-border bg-card/60 px-3 py-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Free VPN trial
            </div>
          </div>

          <div className="mx-auto mb-12 max-w-4xl rounded-lg border border-accent/30 bg-card/70 p-4 text-left shadow-card backdrop-blur-sm md:p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-md border border-border bg-background/80 p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      VPN connection
                    </p>
                    <h2 className="text-2xl font-semibold text-foreground">
                      Protected
                    </h2>
                  </div>
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Wifi className="h-4 w-4 text-primary" />
                      Public Wi-Fi
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                      <CheckCircle2 className="h-4 w-4" />
                      Secured
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe className="h-4 w-4 text-primary" />
                      VPN server
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      Ready to connect
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Lock className="h-4 w-4 text-primary" />
                      Account status
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      Ready to start
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-border bg-background/80 p-5">
                <p className="mb-4 text-sm font-medium text-muted-foreground">
                  Get started in three steps
                </p>
                <div className="space-y-4">
                  {[
                    "Download KeenVPN",
                    "Start your free trial",
                    "Connect and browse securely",
                  ].map((step, index) => (
                    <div key={step} className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                        {index + 1}
                      </span>
                      <span className="pt-1 text-sm font-medium text-foreground">
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* <a href="https://docs.google.com/forms/d/1C_rRoaqkMz7Pitn_nerlL33Gzosfl850JWh0TA2pg20">
              <Button
                size="lg"
                variant="outline"
                className="border-accent text-accent hover:bg-accent/10 hover:border-accent/70 text-lg px-8 py-6 font-semibold transition-all hover:scale-105"
              >
                Learn More
              </Button>
            </a> */}

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
