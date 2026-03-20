import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";
import { TrendingDown, Shield, Zap, Plane, Check, X, ArrowRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 noise font-sans">
      <SEOHead
        title="KeenVPN — Fast, Secure & Private VPN for iOS and macOS"
        description="KeenVPN is a fast, secure VPN for iOS and macOS. Protect your privacy, bypass restrictions, and browse anonymously with military-grade encryption."
        canonical="https://vpnkeen.com"
      />
      <Header />
      <Hero />
      
      {/* Sovereign Bento Grid - The Financial Advantage */}
      <section className="py-32 bg-background border-t border-border/50 relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.03),transparent_50%)] pointer-events-none"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mb-24 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary/10 rounded-full mb-6 border border-secondary/20">
              <Activity className="w-3 h-3 text-secondary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-secondary dark:text-secondary">Live Market Intelligence</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-foreground mb-8 leading-[0.9] tracking-tighter uppercase italic">
              Global Price <br />
              <span className="text-primary italic">Arbitrage.</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-xl font-medium leading-relaxed">
              Stop paying "Tier 1" prices. KeenVPN users leverage global price parity to save thousands annually on the exact same services.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {/* Featured Bento Card: Streaming Arbitrage */}
            <div className="md:col-span-2 md:row-span-2 p-12 rounded-[3.5rem] bg-slate-900 text-white border border-white/5 flex flex-col justify-between group hover:-translate-y-2 transition-all duration-700 overflow-hidden relative shadow-2xl">
              <div className="absolute top-0 right-0 p-32 bg-primary/10 blur-[120px] rounded-full pointer-events-none"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-10">
                  <div className="bg-secondary/20 p-2 rounded-lg border border-secondary/30">
                    <TrendingDown className="h-5 w-5 text-secondary" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary">Yield Optimized</span>
                </div>
                
                <h3 className="text-4xl md:text-5xl font-black mb-8 leading-[0.9] tracking-tighter uppercase italic">
                  Digital <br/>Subsidies
                </h3>
                <p className="text-slate-400 mb-12 leading-relaxed max-w-xs text-lg font-medium">
                  Access regional billing rates for music and video platforms. Secure, legal, and instant.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 relative z-10 group-hover:border-secondary/30 transition-colors duration-500 shadow-inner">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] font-mono italic">Market Rate Differential</span>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-secondary/10 rounded-md border border-secondary/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></div>
                    <span className="text-[9px] font-black text-secondary uppercase tracking-widest">Active</span>
                  </div>
                </div>
                <div className="flex justify-between items-end gap-4">
                  <div>
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 font-mono">USA Standard</div>
                    <div className="text-3xl font-black text-slate-400 tracking-tighter line-through decoration-rose-500/50 decoration-2">$16.99</div>
                  </div>
                  <div className="h-12 w-px bg-white/10 mx-2"></div>
                  <div>
                    <div className="text-[9px] text-secondary font-black uppercase tracking-widest mb-2 font-mono">Emerging Market</div>
                    <div className="text-5xl font-black text-white tracking-tighter italic font-mono">$2.12</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Travel Engine Card */}
            <div className="md:col-span-2 p-12 rounded-[3.5rem] bg-card border border-border/50 hover:border-primary/30 hover:-translate-y-2 transition-all duration-700 flex flex-col md:flex-row gap-10 items-center shadow-xl group overflow-hidden relative">
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex-1 relative z-10">
                <div className="bg-primary/10 text-primary w-fit px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-primary/10">Transit Optimizer</div>
                <h3 className="text-3xl font-black mb-6 tracking-tighter uppercase italic leading-none">Fly for <span className="text-primary">Fractional</span> Costs</h3>
                <p className="text-muted-foreground text-base leading-relaxed mb-8 font-medium">
                  Dynamic pricing adjusts based on your location metadata. We mask your origin to trigger global best-offers.
                </p>
                <Button variant="outline" className="rounded-2xl font-black uppercase tracking-widest border-2 hover:bg-primary hover:text-white transition-all" onClick={() => navigate("/pricing")}>
                  Hunt Deals
                </Button>
              </div>
              <div className="flex-shrink-0 bg-slate-100 dark:bg-slate-800 p-10 rounded-[2.5rem] border border-border/50 relative z-10 shadow-sm group-hover:scale-105 transition-transform duration-700">
                <Plane className="h-20 w-20 text-primary group-hover:-rotate-12 transition-transform duration-700" />
              </div>
            </div>

            {/* Small Bento Item: Adblock */}
            <div className="md:col-span-1 p-10 rounded-[3.5rem] bg-card border border-border/50 hover:border-secondary/30 hover:-translate-y-2 transition-all duration-700 text-center flex flex-col items-center justify-center shadow-xl group">
              <div className="p-6 bg-secondary/10 rounded-[2rem] mb-8 group-hover:scale-110 transition-transform duration-500 border border-secondary/10">
                <Shield className="h-12 w-12 text-secondary dark:text-secondary" />
              </div>
              <h4 className="text-xl font-black mb-3 uppercase tracking-tighter italic">Pure State</h4>
              <p className="text-[10px] text-muted-foreground font-black leading-relaxed uppercase tracking-widest px-4">
                Elite Shielding <br/> + Tracker Nullification
              </p>
            </div>

            {/* Small Bento Item: Speed */}
            <div className="md:col-span-1 p-10 rounded-[3.5rem] bg-card border border-border/50 hover:border-primary/30 hover:-translate-y-2 transition-all duration-700 text-center flex flex-col items-center justify-center shadow-xl group">
              <div className="p-6 bg-primary/10 rounded-[2rem] mb-8 group-hover:scale-110 transition-transform duration-500 border border-primary/10">
                <Zap className="h-12 w-12 text-primary" />
              </div>
              <h4 className="text-xl font-black mb-3 uppercase tracking-tighter italic">Peak Power</h4>
              <p className="text-[10px] text-muted-foreground font-black leading-relaxed uppercase tracking-widest px-4">
                10Gbps Global <br/> Transit Backbone
              </p>
            </div>
          </div>
        </div>
      </section>

      <div id="features">
        <Features />
      </div>

      {/* Comparison Grid - Authority & Integrity */}
      <section className="py-32 bg-slate-50 dark:bg-slate-950 border-y border-border/50 transition-colors duration-300 noise">
        <div className="container mx-auto px-4 max-w-5xl relative z-10">
          <div className="text-center mb-24 max-w-2xl mx-auto animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/10 rounded-full mb-6 border border-rose-500/20">
              <Activity className="w-3 h-3 text-rose-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">Benchmark Audit 2026</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tighter uppercase italic">Institutional <br/><span className="text-primary italic">Standard.</span></h2>
            <p className="text-muted-foreground font-medium text-lg leading-relaxed px-8">
              We've architected a new tier of digital sovereignty—where absolute privacy meets tangible financial advantage.
            </p>
          </div>
          
          <div className="rounded-[3.5rem] border border-border/50 bg-card backdrop-blur-xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900/50">
                    <th className="p-10 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground italic font-mono">Infrastructure Capability</th>
                    <th className="p-10 text-center text-[10px] font-black uppercase tracking-[0.3em] text-primary italic font-mono">KeenVPN V2</th>
                    <th className="p-10 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic font-mono">Legacy VPNs</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {[
                    { feature: "Church & State Architecture (Identity/Data Decoupling)", keen: true, other: false },
                    { feature: "Active Market Arbitrage Engine", keen: true, other: false },
                    { feature: "Global Yield-Optimized Nodes", keen: true, other: "Basic Locations" },
                    { feature: "Zero-Knowledge blind signature auth", keen: true, other: false },
                    { feature: "Independently audited code & nodes", keen: true, other: "Partial" },
                  ].map((row, i) => (
                    <tr key={i} className="border-t border-border/50 hover:bg-slate-100 dark:hover:bg-slate-900/30 transition-all duration-300 group">
                      <td className="p-10 font-bold text-foreground/80 group-hover:text-foreground tracking-tight text-lg">{row.feature}</td>
                      <td className="p-10 text-center">
                        <div className="inline-flex items-center justify-center w-10 h-10 bg-secondary/10 rounded-xl border border-secondary/20 group-hover:scale-110 transition-transform">
                          <Check className="h-6 w-6 text-secondary stroke-[3]" />
                        </div>
                      </td>
                      <td className="p-10 text-center">
                        {typeof row.other === "boolean" 
                          ? (row.other ? <Check className="h-6 w-6 text-slate-400 mx-auto" /> : <X className="h-6 w-6 text-rose-300 dark:text-rose-900/30 mx-auto stroke-[3]" />)
                          : <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] font-mono">{row.other}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mt-16 flex justify-center italic text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/60 max-w-xl leading-relaxed">
              Architecture verified by independent third-party cybersecurity firms. Last audit: Feb 2026.
            </p>
          </div>
        </div>
      </section>

      <div id="pricing">
        <Pricing />
      </div>
      
      <Footer />
    </div>
  );
};

export default Index;
