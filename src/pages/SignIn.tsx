import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Apple, ShieldCheck, Zap, Globe } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDebounce } from "@/auth";
import GoogleIcon from "@/components/ui/google-icon";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const SignIn = () => {
  const { signIn, loading: authLoading, user, subscription } = useAuth();
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Redirect logic for logged-in users
  React.useEffect(() => {
    if (!authLoading && user) {
      // Check if this is from ASWebAuthenticationSession (macOS desktop app)
      const urlParams = new URLSearchParams(window.location.search);
      const isASWebSession =
        urlParams.get("asweb") === "1" ||
        sessionStorage.getItem("asweb_session") === "1";

      const currentPath = window.location.pathname;
      if (currentPath === "/signin") {
        if (isASWebSession) {
          window.location.href = "/account?asweb=1";
          return;
        }

        const hasActiveSubscription =
          subscription && subscription.status === "active";
        if (hasActiveSubscription) {
          window.location.href = "/account";
        } else {
          window.location.href = "/subscribe";
        }
      }
    }
  }, [user, authLoading, subscription]);

  const [handleGoogleSignIn, isGoogleDebouncing] = useDebounce(async () => {
    setIsProcessing(true);
    const result = await signIn("google");
    if (!result.success) {
      setIsProcessing(false);
    }
  }, 2000);

  const [handleAppleSignIn, isAppleDebouncing] = useDebounce(async () => {
    setIsProcessing(true);
    const result = await signIn("apple");
    if (!result.success) {
      setIsProcessing(false);
    }
  }, 2000);

  const isLoading =
    authLoading || isGoogleDebouncing || isAppleDebouncing || isProcessing;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="Sign In — KeenVPN"
        description="Sign in to your KeenVPN account to manage your subscription and settings."
        canonical="https://vpnkeen.com/signin"
        noIndex
      />
      <Header />
      <main className="flex-1 flex flex-col lg:flex-row">
        {/* Left Side: Brand Visuals (Desktop) */}
        <div className="hidden lg:flex flex-1 bg-slate-950 items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-40 bg-primary/5 blur-[120px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-0 left-0 p-40 bg-secondary/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          <div className="relative z-10 max-w-lg p-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 mb-8">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Sovereignty Access</span>
            </div>
            <h2 className="text-6xl font-black text-white mb-8 tracking-tighter italic uppercase leading-[0.9]">Enter the <br/><span className="text-primary italic">Tunnel.</span></h2>
            
            <div className="space-y-10 mt-16">
              {[
                { icon: Zap, text: "Instant 10Gbps Connectivity", sub: "WireGuard® Protocol" },
                { icon: Globe, text: "Unlock Global Markets", sub: "Regional Price Parity" },
                { icon: ShieldCheck, text: "Zero-Knowledge Logging", sub: "Church & State Privacy" }
              ].map((item, i) => (
                <div key={i} className="flex gap-5 items-start group">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/5 group-hover:border-primary/20 transition-all">
                    <item.icon className="h-6 w-6 text-slate-400 group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <div className="text-xl font-black text-slate-200 tracking-tight uppercase italic">{item.text}</div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mt-1">{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="flex-1 flex items-center justify-center p-6 md:p-12 pt-32 lg:pt-12 relative overflow-hidden bg-background">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.02),transparent_70%)] pointer-events-none"></div>
          
          <div className="w-full max-w-[440px] space-y-10 relative z-10">
            <div className="text-center lg:text-left">
              <h1 className="text-5xl font-black tracking-tighter text-foreground mb-3 uppercase italic leading-none">Welcome <br/>Back.</h1>
              <p className="text-muted-foreground font-medium italic text-lg leading-relaxed">Secure your session to continue.</p>
            </div>

            <Card className="border-border/50 bg-card/30 backdrop-blur-2xl rounded-[3rem] p-6 md:p-10 overflow-hidden shadow-2xl relative group hover:border-primary/20 transition-all duration-500">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
              
              <CardHeader className="text-center pb-10">
                <CardTitle className="text-xl font-black uppercase tracking-widest italic">Identity Verification</CardTitle>
                <CardDescription className="font-bold text-[10px] uppercase tracking-[0.3em] text-slate-500 mt-2">Choose an encrypted provider</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <Button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full h-16 bg-white text-slate-900 hover:bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-4 transition-all hover:scale-[1.02] shadow-sm hover:shadow-xl active:scale-95"
                  size="lg"
                >
                  {isGoogleDebouncing || (isLoading && !isAppleDebouncing) ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <GoogleIcon className="h-5 w-5" />
                      Continue with Google
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleAppleSignIn}
                  disabled={isLoading}
                  className="w-full h-16 bg-slate-950 text-white hover:bg-black rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-4 transition-all hover:scale-[1.02] border-2 border-white/10 shadow-2xl active:scale-95"
                  size="lg"
                >
                  {isAppleDebouncing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Apple className="h-5 w-5 fill-current" />
                      Continue with Apple
                    </>
                  )}
                </Button>

                <div className="text-center pt-10 border-t border-border/50 mt-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 leading-relaxed max-w-[280px] mx-auto">
                    By entering, you confirm agreement to our<br/>
                    <a href="/terms" className="text-primary hover:underline font-bold">Terms of Service</a>
                    <span className="mx-2 text-slate-300">/</span>
                    <a href="/privacy" className="text-primary hover:underline font-bold">Privacy Protocol</a>
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="p-8 rounded-[2rem] bg-muted/20 border border-border/50 text-center relative overflow-hidden group hover:bg-muted/30 transition-all">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-20"></div>
              <p className="text-xs font-black text-slate-500 italic leading-relaxed uppercase tracking-widest px-4">
                "Digital sovereignty is not an option. It is a fundamental right."
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SignIn;
