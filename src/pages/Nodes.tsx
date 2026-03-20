import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Server, Globe, Zap, ShieldCheck, Activity, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const Nodes = () => {
  const [search, setSearch] = useState("");

  const nodes = [
    { city: "Istanbul", country: "Turkey", status: "Operational", load: "24%", speed: "Ultra-High", latency: "32ms", type: "Deal Optimized" },
    { city: "Buenos Aires", country: "Argentina", status: "Operational", load: "41%", speed: "Ultra-High", latency: "110ms", type: "Deal Optimized" },
    { city: "Mumbai", country: "India", status: "Operational", load: "18%", speed: "Ultra-High", latency: "145ms", type: "Deal Optimized" },
    { city: "New York", country: "USA", status: "Operational", load: "62%", speed: "Ultra-High", latency: "12ms", type: "Streaming" },
    { city: "London", country: "UK", status: "Operational", load: "55%", speed: "Ultra-High", latency: "18ms", type: "Streaming" },
    { city: "Tokyo", country: "Japan", status: "Operational", load: "33%", speed: "Ultra-High", latency: "45ms", type: "Streaming" },
    { city: "Frankfurt", country: "Germany", status: "Operational", load: "29%", speed: "Ultra-High", latency: "8ms", type: "Standard" },
    { city: "Sao Paulo", country: "Brazil", status: "Operational", load: "47%", speed: "Ultra-High", latency: "92ms", type: "Standard" },
  ];

  const filteredNodes = nodes.filter(n => 
    n.city.toLowerCase().includes(search.toLowerCase()) || 
    n.country.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 font-sans">
      <Header />
      
      <main className="pt-32 pb-24 text-center">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="mb-20 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 mb-6">
              <Globe className="h-4 w-4 text-primary" />
              <span className="text-xs font-black text-primary uppercase tracking-widest text-glow-blue">Network Intelligence</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-foreground mb-6 tracking-tighter uppercase leading-[0.9]">
              Global <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600 italic">Locations.</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed font-medium">
              Our high-performance global infrastructure is architected for elite identity protection and maximum regional price parity.
            </p>
          </div>

          {/* Search & Filter HUD */}
          <div className="mb-12 flex flex-col md:flex-row gap-4 items-center justify-between p-6 rounded-[2rem] bg-card border border-border/50 shadow-sm transition-all duration-500">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Filter by city or country..."
                className="w-full pl-12 pr-4 h-12 rounded-xl bg-muted/50 border-none focus:ring-2 focus:ring-primary/20 font-bold text-sm outline-none transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-6 items-center">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-secondary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">System Load: 34%</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nodes Online: {nodes.length}</span>
              </div>
            </div>
          </div>

          {/* Node Grid */}
          <div className="grid grid-cols-1 gap-4 text-left">
            {filteredNodes.map((node, i) => (
              <div key={i} className="group p-6 md:p-8 rounded-[2rem] bg-card border border-border/50 hover:border-primary/30 hover:-translate-y-1 hover:scale-[1.01] transition-all duration-500 flex flex-col md:flex-row items-center gap-8 shadow-sm">
                {/* Location */}
                <div className="flex items-center gap-6 flex-1 w-full">
                  <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center border border-border/50 group-hover:bg-primary/10 group-hover:text-primary transition-colors shadow-inner">
                    <Server className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-foreground tracking-tight uppercase">{node.city}</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{node.country}</p>
                  </div>
                </div>

                {/* Specs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 flex-[2] w-full border-y md:border-y-0 md:border-x border-border/50 py-6 md:py-0 px-0 md:px-12">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
                      <span className="text-sm font-black text-foreground tracking-tighter uppercase">{node.status}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Latency</p>
                    <span className="text-sm font-mono font-bold text-foreground tracking-tighter">{node.latency}</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Load</p>
                    <span className="text-sm font-mono font-bold text-foreground tracking-tighter">{node.load}</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Port Performance</p>
                    <span className="text-sm font-mono font-bold text-foreground tracking-tighter uppercase">{node.speed}</span>
                  </div>
                </div>

                {/* Category & Action */}
                <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto flex-1">
                  <div className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                    node.type === 'Deal Optimized' ? 'bg-secondary/10 border-secondary/20 text-secondary dark:text-secondary' : 
                    node.type === 'Streaming' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-muted border-border text-slate-500'
                  }`}>
                    {node.type}
                  </div>
                  <Button variant="outline" className="rounded-xl font-black h-12 px-6 border-2" onClick={() => window.location.href='/pricing'}>
                    Deploy
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Technical Specs Footer */}
          <div className="mt-20 p-10 rounded-[3rem] bg-slate-950 dark:bg-slate-900 border border-white/5 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-20 bg-primary/5 blur-[100px] rounded-full"></div>
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center text-left">
              <div>
                <h3 className="text-3xl font-black text-white mb-4 tracking-tight uppercase">Privacy-First Architecture</h3>
                <p className="text-slate-400 font-medium leading-relaxed">
                  Every location in our network operates on volatile memory systems. In the event of a physical compromise, all session data is mathematically erased. We prioritize the world's leanest security footprint to ensure your digital invisibility.
                </p>
              </div>
              <div className="flex justify-end">
                <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 flex items-center gap-6 backdrop-blur-xl group hover:border-secondary/30 transition-all duration-500">
                  <ShieldCheck className="h-12 w-12 text-secondary group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="text-xl font-black text-white tracking-tighter uppercase">Audit Status</p>
                    <p className="text-xs font-bold text-secondary uppercase tracking-[0.2em]">Verified March 2026</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Nodes;
