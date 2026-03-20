import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Shield, Eye, Database, Lock, Server, UserX, Landmark } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Privacy Policy — KeenVPN Zero Logs VPN"
        description="KeenVPN has a strict zero-logs policy. We never track, collect, or store your online activity. Read our full privacy policy."
        canonical="https://vpnkeen.com/privacy"
      />
      <Header />
      
      <main className="pt-32 pb-24">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Editorial Header */}
          <div className="mb-20 font-sans">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 mb-6">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-xs font-black text-primary uppercase tracking-widest">Document 001: Privacy Protocol</span>
            </div>
            <h1 className="text-5xl md:text-8xl font-black text-foreground mb-8 tracking-tighter italic uppercase leading-[0.9]">
              Digital <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600 italic">Sovereignty.</span>
            </h1>
            <p className="text-2xl text-muted-foreground max-w-3xl leading-snug font-medium italic">
              We operate on a zero-knowledge infrastructure. Our "Church and State" model mathematically separates your identity from your traffic.
            </p>
          </div>

          {/* Key Principles - Industrial Style */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-20">
            {[
              { icon: Eye, title: "Zero Logs", desc: "No tracking. No history. No fingerprints." },
              { icon: Database, title: "Stateless Nodes", desc: "Our exit nodes store nothing in memory." },
              { icon: Lock, title: "WireGuard Core", desc: "Next-gen encryption as the standard." }
            ].map((p, i) => (
              <div key={i} className="p-8 rounded-[2rem] bg-card/30 border border-border/50 group hover:border-primary/30 transition-all shadow-sm">
                <p.icon className="h-8 w-8 text-primary mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-black mb-2 uppercase tracking-tight italic">{p.title}</h3>
                <p className="text-xs text-muted-foreground font-black uppercase tracking-widest leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>

          {/* The Content - Editorial Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            <div className="lg:col-span-4">
              <div className="sticky top-32 space-y-8">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Executive Summary</h4>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium italic">
                    We collect the absolute minimum data required to maintain your subscription. Once you enter the tunnel, you are invisible even to us.
                  </p>
                </div>
                <div className="p-8 rounded-[2rem] bg-slate-950 border border-white/5 shadow-2xl">
                  <div className="flex items-center gap-2 mb-4">
                    <Landmark className="h-4 w-4 text-secondary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-secondary">Jurisdiction</span>
                  </div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed italic">
                    Based in Texas, USA. Optimized for international privacy standards and constitutional protection.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-24 font-sans">
              <section>
                <h2 className="text-3xl font-black mb-8 tracking-tight flex items-center gap-4 text-foreground uppercase italic">
                  <UserX className="h-10 w-10 text-primary" />
                  The "Church and State" Model
                </h2>
                <div className="prose prose-invert max-w-none text-slate-500">
                  <p className="text-lg leading-relaxed mb-8 font-medium italic">
                    KeenVPN utilizes a cryptographic separation between your account management (Church) and the VPN tunnel infrastructure (State).
                  </p>
                  <ul className="space-y-6 list-none p-0">
                    {[
                      "Authentication tokens are blind-signed to prevent correlation.",
                      "Exit nodes are stateless and wipe data on every reboot.",
                      "We do not log your source IP address, ever.",
                      "We do not log your destination traffic, ever."
                    ].map((item, i) => (
                      <li key={i} className="flex gap-4 items-start">
                        <div className="mt-2 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                        <span className="text-sm font-black uppercase tracking-widest text-foreground/80 leading-relaxed italic">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-3xl font-black mb-10 tracking-tight text-foreground uppercase italic underline decoration-primary decoration-4 underline-offset-8">Minimal Data Required</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-10 rounded-[2.5rem] bg-muted/20 border border-border/50 shadow-inner">
                    <h4 className="font-black mb-6 uppercase tracking-[0.2em] text-[10px] text-primary">Identity Cluster</h4>
                    <ul className="space-y-3 text-xs font-black uppercase tracking-widest text-slate-500 list-none p-0">
                      <li>• Email Address</li>
                      <li>• Payment Reference (Stripe)</li>
                    </ul>
                  </div>
                  <div className="p-10 rounded-[2.5rem] bg-muted/20 border border-border/50 shadow-inner">
                    <h4 className="font-black mb-6 uppercase tracking-[0.2em] text-[10px] text-secondary">Network Cluster</h4>
                    <ul className="space-y-3 text-xs font-black uppercase tracking-widest text-slate-500 list-none p-0">
                      <li>• Total bandwidth (Aggregated)</li>
                      <li>• Current Load (System-wide)</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-3xl font-black mb-8 tracking-tight text-foreground uppercase italic">Your Rights</h2>
                <p className="text-slate-500 leading-relaxed mb-10 font-medium italic">
                  Under the GDPR and CCPA, you have the right to access, port, and delete your data. Because we collect so little, "Deletion" typically results in the total removal of your email and payment history from our secure database.
                </p>
                <div className="p-10 rounded-[3rem] border border-primary/20 bg-primary/5 shadow-glow relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
                  <h4 className="text-foreground font-black mb-2 tracking-tight uppercase italic text-xl relative z-10">Request Data Wipe</h4>
                  <p className="text-sm text-slate-500 mb-8 font-medium italic relative z-10">Instantly clear all records associated with your account.</p>
                  <a href="mailto:privacy@vpnkeen.com" className="inline-flex h-12 items-center px-8 rounded-xl bg-slate-950 text-primary border border-primary/20 font-black uppercase tracking-widest text-[10px] hover:bg-primary hover:text-white transition-all relative z-10">Contact Privacy Team →</a>
                </div>
              </section>

              <section className="pt-12 border-t border-white/5">
                <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.3em] font-mono">
                  Last Revision: March 16, 2026 • KeenVPN Privacy Protocol v2.4
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Privacy;
