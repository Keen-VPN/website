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
      <Header />
      <main className="flex-1 flex flex-col lg:flex-row">
        {/* Left Side: Brand Visuals (Desktop) */}
        <div className="hidden lg:flex flex-1 bg-slate-950 items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-40 bg-primary/5 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-0 left-0 p-40 bg-secondary/5 blur-[120px] rounded-full"></div>
          
          <div className="relative z-10 max-w-lg p-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 mb-8">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="text-xs font-black text-primary uppercase tracking-widest">Sovereignty Access</span>
            </div>
            <h2 className="text-6xl font-black text-white mb-8 tracking-tighter italic">Enter the <br/><span className="text-primary">Tunnel.</span></h2>
            
            <div className="space-y-8 mt-12">
              {[
                { icon: Zap, text: "Instant 10Gbps Connectivity", sub: "WireGuard® Protocol" },
                { icon: Globe, text: "Unlock Global Markets", sub: "Regional Price Parity" },
                { icon: ShieldCheck, text: "Zero-Knowledge Logging", sub: "Church & State Privacy" }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                    <item.icon className="h-5 w-5 text-slate-400" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-slate-200">{item.text}</div>
                    <div className="text-xs font-black uppercase tracking-widest text-slate-500">{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="flex-1 flex items-center justify-center p-6 md:p-12 pt-32 lg:pt-12">
          <div className="w-full max-w-[440px] space-y-8">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl font-black tracking-tight text-foreground mb-2">Welcome Back</h1>
              <p className="text-muted-foreground font-medium italic">Secure your session to continue.</p>
            </div>

            <Card className="border-border/50 bg-card/30 backdrop-blur-xl rounded-[2.5rem] p-4 md:p-8 overflow-hidden shadow-2xl">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-xl font-black uppercase tracking-tight">Identity Verification</CardTitle>
                <CardDescription className="font-bold text-xs uppercase tracking-widest text-slate-500">Choose an encrypted provider</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full h-14 bg-white text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all hover:scale-[1.02]"
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
                  className="w-full h-14 bg-black text-white hover:bg-slate-900 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all hover:scale-[1.02] border border-white/10"
                  size="lg"
                >
                  {isAppleDebouncing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Apple className="h-5 w-5" />
                      Continue with Apple
                    </>
                  )}
                </Button>

                <div className="text-center pt-8">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 leading-relaxed">
                    By entering, you confirm agreement to our<br/>
                    <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
                    <span className="mx-2">/</span>
                    <a href="/privacy" className="text-primary hover:underline">Privacy Protocol</a>
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="p-6 rounded-2xl bg-muted/30 border border-border/50 text-center">
              <p className="text-xs font-bold text-muted-foreground italic">
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
