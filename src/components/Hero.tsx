import { Button } from "@/components/ui/button";
import { Shield, Plane, TrendingDown, Lock, CheckCircle2, Loader2, Info } from "lucide-react";
import { useAppStoreUrl } from "@/hooks/use-app-store-url";

const Hero = () => {
  const appStoreUrl = useAppStoreUrl();

  return (
    <section className="relative min-h-[95vh] bg-gradient-hero flex items-center justify-center overflow-hidden pt-24 pb-16 noise">
      {/* Dynamic Background Mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      
      {/* Technical Grid Overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgwLCAwLCAwLCAwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          
          {/* Left Column: Authoritative Copy */}
          <div className="flex-1 text-center lg:text-left animate-fade-in-up">
            <div className="inline-flex items-center bg-background/40 backdrop-blur-xl border border-secondary/20 rounded-full px-4 py-1.5 mb-8 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-secondary animate-pulse mr-2.5"></div>
              <span className="text-[10px] font-black font-mono text-secondary dark:text-secondary uppercase tracking-[0.2em]">
                Live: Digital Sovereignty Active
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-foreground mb-8 leading-[0.9] tracking-tighter uppercase italic">
              Stop Paying <br />
              <span className="text-secondary dark:text-secondary">
                The Location Tax.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
              KeenVPN is the first "Church & State" VPN architecture. We decouple your identity from your data to unlock the best global deals on flights, streaming, and more—anonymously.
            </p>

            <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start mb-12">
              <Button
                size="xl"
                variant="emerald"
                className="shadow-xl shadow-secondary/20 hover:shadow-secondary/40"
                onClick={() => window.open(appStoreUrl, "_blank")}
              >
                Start Saving Now
              </Button>
              <Button
                size="xl"
                variant="ghost"
                className="border border-border/50 backdrop-blur-md"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                How it Works
              </Button>
            </div>

            {/* Trust Signals with High-Contrast */}
            <div className="flex items-center justify-center lg:justify-start gap-4 text-sm text-muted-foreground border-t border-border/50 pt-8 max-w-md lg:max-w-none">
              <div className="flex -space-x-3">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-background flex items-center justify-center shadow-lg group hover:z-10 transition-all cursor-default">
                    <UserIcon />
                  </div>
                ))}
              </div>
              <div>
                <p className="font-black tracking-tight uppercase text-[10px] text-slate-500 dark:text-slate-400">
                  Total Community Savings
                </p>
                <p className="text-foreground text-lg font-black tracking-tighter font-mono">
                  $248,912.44
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: "Sovereign HUD" */}
          <div className="flex-1 w-full max-w-lg lg:max-w-xl relative animate-fade-in" style={{ animationDelay: '300ms' }}>
            {/* HUD Container */}
            <div className="relative aspect-[4/3] bg-card/30 dark:bg-slate-900/40 backdrop-blur-2xl border border-border/50 dark:border-white/10 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col p-10 group">
              
              {/* Internal HUD Header */}
              <div className="flex items-center justify-between mb-10 pb-6 border-b border-border/50 dark:border-white/10">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest leading-none mb-1">Tunnel Status</p>
                    <p className="text-xs font-black uppercase text-secondary tracking-wider leading-none italic">Encrypted & Active</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-md border border-border/50">
                    <span className="text-[10px] font-black font-mono tracking-tighter">AES-256-GCM</span>
                  </div>
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Live Savings Feed */}
              <div className="space-y-6 relative z-10">
                <div className="bg-background/60 dark:bg-black/40 p-6 rounded-3xl border border-border/50 dark:border-white/10 flex items-center justify-between transition-all hover:border-primary/40 hover:bg-background/80 shadow-sm">
                  <div className="flex items-center gap-5">
                    <div className="bg-primary/10 p-4 rounded-2xl border border-primary/10">
                      <Plane className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-tighter text-foreground mb-0.5">Flight: London (LHR)</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 uppercase">GB-PROX</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Verified 2m ago</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="line-through text-muted-foreground/40 text-[10px] font-black tracking-widest">$1,240</span>
                    <div className="flex items-center text-secondary font-black text-2xl tracking-tighter font-mono italic">
                      <TrendingDown className="w-4 h-4 mr-1 text-secondary" />
                      $682
                    </div>
                  </div>
                </div>

                <div className="bg-background/60 dark:bg-black/40 p-6 rounded-3xl border border-border/50 dark:border-white/10 flex items-center justify-between transition-all hover:border-secondary/40 hover:bg-background/80 shadow-sm">
                  <div className="flex items-center gap-5">
                    <div className="bg-secondary/10 p-4 rounded-2xl border border-secondary/10">
                      <TrendingDown className="w-7 h-7 text-secondary" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-tighter text-foreground mb-0.5">Streaming Sub</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 bg-secondary/10 rounded text-secondary uppercase">TR-NODE</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Active Now</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="line-through text-muted-foreground/40 text-[10px] font-black tracking-widest">$15.99</span>
                    <div className="flex items-center text-secondary font-black text-2xl tracking-tighter font-mono italic">
                      <TrendingDown className="w-4 h-4 mr-1 text-secondary" />
                      $2.44
                    </div>
                  </div>
                </div>
              </div>

              {/* HUD Footer Information */}
              <div className="mt-auto flex items-center justify-between text-[9px] font-black font-mono uppercase tracking-[0.2em] text-slate-500 dark:text-slate-500 pt-6">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Scanning Global Market Nodes...</span>
                </div>
                <div className="flex gap-4">
                  <span>Ping: 24ms</span>
                  <span>Loss: 0.00%</span>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-secondary/10 dark:bg-secondary/20 rounded-full blur-[100px] group-hover:bg-secondary/20 transition-all duration-700"></div>
              <div className="absolute -top-20 -left-20 w-80 h-80 bg-primary/10 dark:bg-primary/20 rounded-full blur-[100px] group-hover:bg-primary/20 transition-all duration-700"></div>
            </div>
            
            {/* Floating Tag */}
            <div className="absolute -bottom-6 -left-6 bg-slate-900 text-white p-5 rounded-2xl shadow-2xl border border-white/10 hidden md:flex items-center gap-4 animate-bounce" style={{ animationDuration: '3s' }}>
              <div className="bg-secondary p-2 rounded-lg">
                <Info className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Smart Alert</p>
                <p className="text-xs font-bold leading-tight">Cheaper pricing detected in Turkey node.</p>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
};

const UserIcon = () => (
  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

export default Hero;
