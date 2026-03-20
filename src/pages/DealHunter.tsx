import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Banknote, Search, Download, Globe, Sparkles, TrendingDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const DealHunter = () => {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Header />
      
      <main className="pt-32 pb-24">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Hero Section - Luxury Minimal */}
          <div className="text-center mb-32 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-secondary/10 border border-secondary/20 mb-8">
              <Sparkles className="h-4 w-4 text-secondary" />
              <span className="text-xs font-black text-secondary uppercase tracking-widest text-glow-orange">Autonomous ROI Engine</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-[0.9] uppercase italic">
              Stop Paying <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-secondary">Premium Rates.</span>
            </h1>
            <p className="text-2xl text-muted-foreground leading-relaxed font-medium mb-12">
              The Deal Hunter extension scans global markets in real-time as you browse, finding regional price drops for flights, hotels, and subscriptions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="emerald" size="xl">
                <Download className="h-5 w-5 mr-2" />
                Add to Chrome
              </Button>
              <Button variant="outline" size="xl" className="border-2 font-black">How it works</Button>
            </div>
          </div>

          {/* Savings Timeline - Industrial Visual */}
          <section className="mb-32">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-12 text-center">Typical Savings Lifecycle</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Connector Line (Desktop) */}
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-border/50 -translate-y-1/2 z-0"></div>
              
              {[
                {
                  step: "01",
                  title: "Browse Normally",
                  desc: "Visit your favorite sites like Booking.com, Spotify, or Expedia.",
                  icon: Search
                },
                {
                  step: "02",
                  title: "Region Analysis",
                  desc: "Deal Hunter cross-references prices across our global infrastructure instantly.",
                  icon: Globe,
                  active: true
                },
                {
                  step: "03",
                  title: "One-Click Save",
                  desc: "Apply the best regional price with a single click. No manual server switching.",
                  icon: Banknote
                }
              ].map((item, i) => (
                <div key={i} className="relative z-10 p-8 rounded-[2.5rem] bg-card border border-border/50 flex flex-col items-center text-center shadow-sm group hover:border-primary/30 hover:-translate-y-2 hover:scale-[1.02] transition-all duration-500">
                  <div className="absolute -top-4 bg-background border border-border px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{item.step}</div>
                  <div className={`p-4 rounded-2xl mb-6 transition-all duration-500 ${item.active ? 'bg-primary/10 text-primary shadow-glow group-hover:scale-110' : 'bg-muted text-slate-400 group-hover:bg-primary/5 group-hover:text-primary'}`}>
                    <item.icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-black mb-4 tracking-tight uppercase group-hover:text-primary transition-colors">{item.title}</h3>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Comparative Advantage */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-32">
            <div className="p-12 rounded-[3rem] bg-slate-950 text-white flex flex-col justify-center relative overflow-hidden border border-white/5 shadow-2xl">
              <div className="absolute top-0 right-0 p-20 bg-secondary/5 blur-[100px] rounded-full"></div>
              <h2 className="text-4xl font-black mb-8 tracking-tighter uppercase italic">The "Location Tax" <br/><span className="text-secondary">Eliminated.</span></h2>
              <ul className="space-y-6">
                {[
                  "Automated regional price discovery",
                  "One-click browser context isolation",
                  "Anti-fingerprinting technology",
                  "Zero performance impact on page loads"
                ].map((text, i) => (
                  <li key={i} className="flex items-center gap-4 group">
                    <div className="h-6 w-6 rounded-full bg-secondary/20 flex items-center justify-center group-hover:bg-secondary/40 transition-colors">
                      <Check className="h-3 w-3 text-secondary" />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-widest text-slate-300">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-12 rounded-[3rem] bg-card border border-border/50 flex flex-col items-center justify-center text-center group hover:border-primary/30 hover:-translate-y-2 hover:scale-[1.02] transition-all duration-500 shadow-sm">
              <div className="p-6 bg-primary/10 rounded-3xl mb-8 group-hover:scale-110 transition-transform duration-500">
                <TrendingDown className="h-16 w-16 text-primary" />
              </div>
              <h3 className="text-3xl font-black mb-4 uppercase tracking-tight">Save $450/Year</h3>
              <p className="text-muted-foreground font-medium mb-8 max-w-xs">Average annual savings for users actively using the Deal Hunter extension.</p>
              <Button variant="glow" size="lg" className="rounded-xl font-black px-10">Start Saving</Button>
            </div>
          </div>

          {/* Browser Support */}
          <div className="text-center opacity-50 flex items-center justify-center gap-12 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="flex flex-col items-center gap-2 group">
              <img src="https://simpleicons.org/icons/googlechrome.svg" alt="Chrome" className="h-8 w-8 invert dark:invert-0 transition-transform group-hover:scale-110" />
              <span className="text-[10px] font-black uppercase tracking-widest">Chrome</span>
            </div>
            <div className="flex flex-col items-center gap-2 group">
              <img src="https://simpleicons.org/icons/firefox.svg" alt="Firefox" className="h-8 w-8 invert dark:invert-0 transition-transform group-hover:scale-110" />
              <span className="text-[10px] font-black uppercase tracking-widest">Firefox</span>
            </div>
            <div className="flex flex-col items-center gap-2 group">
              <img src="https://simpleicons.org/icons/brave.svg" alt="Brave" className="h-8 w-8 invert dark:invert-0 transition-transform group-hover:scale-110" />
              <span className="text-[10px] font-black uppercase tracking-widest">Brave</span>
            </div>
            <div className="flex flex-col items-center gap-2 group">
              <img src="https://simpleicons.org/icons/microsoftedge.svg" alt="Edge" className="h-8 w-8 invert dark:invert-0 transition-transform group-hover:scale-110" />
              <span className="text-[10px] font-black uppercase tracking-widest">Edge</span>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DealHunter;
