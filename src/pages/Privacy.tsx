import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Shield, Eye, Database, Lock, Server, UserX, Landmark } from "lucide-react";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-32 pb-24">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Editorial Header */}
          <div className="mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 mb-6">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-xs font-black text-primary uppercase tracking-widest">Document 001: Privacy Protocol</span>
            </div>
            <h1 className="text-5xl md:text-8xl font-black text-foreground mb-8 tracking-tighter italic">
              Digital <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">Sovereignty.</span>
            </h1>
            <p className="text-2xl text-muted-foreground max-w-3xl leading-snug font-medium">
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
              <div key={i} className="p-8 rounded-3xl bg-card/30 border border-border/50 group hover:border-primary/30 transition-all">
                <p.icon className="h-8 w-8 text-primary mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-black mb-2 uppercase tracking-tight">{p.title}</h3>
                <p className="text-sm text-muted-foreground font-bold uppercase tracking-tighter leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>

          {/* The Content - Editorial Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            <div className="lg:col-span-4">
              <div className="sticky top-32 space-y-8">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-4">Summary</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    We collect the absolute minimum data required to maintain your subscription. Once you enter the tunnel, you are invisible even to us.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-slate-900 border border-white/5">
                  <div className="flex items-center gap-2 mb-4">
                    <Landmark className="h-4 w-4 text-secondary" />
                    <span className="text-xs font-black uppercase tracking-widest text-secondary">Jurisdiction</span>
                  </div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter leading-relaxed">
                    Based in Texas, USA. Optimized for international privacy standards and constitutional protection.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-20">
              <section>
                <h2 className="text-3xl font-black mb-8 tracking-tight flex items-center gap-3 text-foreground">
                  <UserX className="h-8 w-8 text-primary" />
                  The "Church and State" Model
                </h2>
                <div className="prose prose-invert max-w-none text-slate-400">
                  <p className="text-lg leading-relaxed mb-6">
                    KeenVPN utilizes a cryptographic separation between your account management (Church) and the VPN tunnel infrastructure (State).
                  </p>
                  <ul className="space-y-4 list-none p-0">
                    {[
                      "Authentication tokens are blind-signed to prevent correlation.",
                      "Exit nodes are stateless and wipe data on every reboot.",
                      "We do not log your source IP address, ever.",
                      "We do not log your destination traffic, ever."
                    ].map((item, i) => (
                      <li key={i} className="flex gap-3 items-start">
                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span className="text-sm font-bold uppercase tracking-tighter text-slate-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-3xl font-black mb-8 tracking-tight text-foreground">Minimal Data Required</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-8 rounded-3xl bg-muted/20 border border-border/50">
                    <h4 className="font-black mb-4 uppercase tracking-widest text-xs text-primary">Identity</h4>
                    <ul className="space-y-2 text-sm font-medium text-slate-400">
                      <li>Email Address</li>
                      <li>Payment Reference (Stripe)</li>
                    </ul>
                  </div>
                  <div className="p-8 rounded-3xl bg-muted/20 border border-border/50">
                    <h4 className="font-black mb-4 uppercase tracking-widest text-xs text-secondary">Network</h4>
                    <ul className="space-y-2 text-sm font-medium text-slate-400">
                      <li>Total bandwidth (Aggregated)</li>
                      <li>Current Load (System-wide)</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-3xl font-black mb-8 tracking-tight text-foreground">Your Rights</h2>
                <p className="text-slate-400 leading-relaxed mb-8">
                  Under the GDPR and CCPA, you have the right to access, port, and delete your data. Because we collect so little, "Deletion" typically results in the total removal of your email and payment history from our secure database.
                </p>
                <div className="p-8 rounded-3xl border border-primary/20 bg-primary/5">
                  <h4 className="text-foreground font-black mb-2 tracking-tight">Request Data Wipe</h4>
                  <p className="text-sm text-slate-400 mb-6">Instantly clear all records associated with your account.</p>
                  <a href="mailto:privacy@vpnkeen.com" className="text-primary font-black uppercase tracking-widest text-xs hover:underline">Contact Privacy Team →</a>
                </div>
              </section>

              <section className="pt-10 border-t border-white/5">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
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
