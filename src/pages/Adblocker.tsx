import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Shield, EyeOff, Zap, ShieldAlert, CheckCircle2, Lock, MousePointerClick, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

const Adblocker = () => {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Header />
      
      <main className="pt-32 pb-24">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Hero Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-secondary/10 border border-secondary/20 mb-6">
                <Shield className="h-4 w-4 text-secondary dark:text-secondary" />
                <span className="text-xs font-black text-secondary dark:text-secondary uppercase tracking-widest text-glow-orange">Active Shielding</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-tight uppercase">
                Browse <br/>Without <span className="text-rose-600 dark:text-rose-500 italic">Interruption.</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed font-medium mb-10">
                KeenVPN's built-in shield stops trackers, malware, and intrusive ads automatically. Faster browsing, lower data costs, absolute privacy.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="emerald" size="xl">Get Clean Browsing</Button>
                <Button variant="outline" size="xl" className="border-2 font-black">Learn How It Works</Button>
              </div>
            </div>

            {/* Visual HUD Simulation */}
            <div className="relative animate-in fade-in zoom-in-95 duration-1000">
              <div className="absolute inset-0 bg-secondary/10 blur-[120px] rounded-full"></div>
              <div className="relative p-8 rounded-[3rem] bg-slate-950 border border-white/10 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between mb-12 border-b border-white/5 pb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-secondary animate-pulse shadow-[0_0_10px_rgba(255, 109, 11, 0.5)]" />
                    <span className="text-xs font-black font-mono text-secondary uppercase tracking-widest">Shield: ACTIVE</span>
                  </div>
                  <BarChart3 className="h-5 w-5 text-slate-500" />
                </div>

                <div className="space-y-8">
                  {[
                    { label: "Ads Blocked Today", value: "1,248", color: "text-secondary", icon: Shield },
                    { label: "Trackers Neutralized", value: "4,821", color: "text-blue-500", icon: EyeOff },
                    { label: "Data Saved", value: "142 MB", color: "text-amber-500", icon: Zap }
                  ].map((stat, i) => (
                    <div key={i} className="flex items-end justify-between border-b border-white/5 pb-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-white/5">
                          <stat.icon className="h-5 w-5 text-slate-400" />
                        </div>
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
                      </div>
                      <span className={`text-3xl font-black font-mono tracking-tighter ${stat.color}`}>{stat.value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-12 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-4">
                  <ShieldAlert className="h-5 w-5 text-rose-500" />
                  <span className="text-[10px] font-black text-rose-200 uppercase tracking-widest">3 Malicious Domains Blocked in last 5m</span>
                </div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
            {[
              {
                icon: Lock,
                title: "Advanced Shielding",
                desc: "Ads are neutralized before they even reach your device, reducing load times by up to 40%."
              },
              {
                icon: EyeOff,
                title: "Anti-Tracker Engine",
                desc: "Prevent data brokers from building a fingerprint of your digital life. Stay invisible."
              },
              {
                icon: MousePointerClick,
                title: "One-Click Control",
                desc: "Enable or disable protection instantly across all your devices with a single tap."
              }
            ].map((f, i) => (
              <div key={i} className="p-10 rounded-[2.5rem] bg-card border border-border/50 shadow-sm flex flex-col items-center text-center group hover:border-primary/30 hover:-translate-y-2 hover:scale-[1.02] transition-all duration-500">
                <div className="p-4 rounded-2xl bg-primary/10 text-primary mb-8 group-hover:scale-110 transition-transform duration-500">
                  <f.icon className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-black mb-4 uppercase tracking-tight">{f.title}</h3>
                <p className="text-muted-foreground font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Trust Section */}
          <div className="p-12 rounded-[3rem] bg-muted/30 dark:bg-slate-900 border border-border/50 text-center relative overflow-hidden shadow-sm">
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-black mb-8 tracking-tighter uppercase">Clean Internet. <br/> <span className="text-primary italic">No Compromise.</span></h2>
              <div className="flex flex-wrap justify-center gap-8 mb-12">
                {["No Youtube Ads", "No Popups", "No Banners", "No Trackers"].map((text, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-secondary" />
                    <span className="text-sm font-black uppercase tracking-widest text-foreground/70">{text}</span>
                  </div>
                ))}
              </div>
              <Button size="xl" variant="glow" onClick={() => window.location.href='/pricing'}>Upgrade Your Browsing</Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Adblocker;
