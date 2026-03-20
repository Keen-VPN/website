import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FileText, AlertTriangle, CreditCard, Shield, Scale, Info } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Terms of Service — KeenVPN"
        description="Read KeenVPN's terms of service. 30-day money-back guarantee, zero-logs policy, and fair usage terms."
        canonical="https://vpnkeen.com/terms"
      />
      <Header />
      
      <main className="pt-32 pb-24 font-sans">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Editorial Header */}
          <div className="mb-20 border-b border-border/50 pb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 mb-6">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-xs font-black text-primary uppercase tracking-widest italic">Document 002: Service Agreement</span>
            </div>
            <h1 className="text-5xl md:text-8xl font-black text-foreground mb-8 tracking-tighter uppercase italic leading-[0.9]">
              The <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600 italic">Standard.</span>
            </h1>
            <p className="text-2xl text-muted-foreground max-w-3xl leading-snug font-medium italic">
              KeenVPN is built on transparency. Our terms are designed to be as clear as our encryption is strong.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            {/* Sidebar Summary */}
            <div className="lg:col-span-4">
              <div className="sticky top-32 space-y-6">
                <div className="p-8 rounded-[2rem] bg-slate-900 border border-white/5 shadow-2xl">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-8 flex items-center gap-2">
                    <Info className="h-3 w-3" /> Executive Summary
                  </h3>
                  <div className="space-y-8">
                    {[
                      { icon: Shield, text: "Privacy First: We log nothing." },
                      { icon: CreditCard, text: "30-Day Guarantee: No risk." },
                      { icon: Scale, text: "Fair Use: No illegal abuse." },
                      { icon: FileText, text: "Transparent: No hidden fees." }
                    ].map((item, i) => (
                      <div key={i} className="flex gap-4 items-start group">
                        <item.icon className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-black uppercase tracking-widest text-slate-300 leading-tight italic">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-6">
                  <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.3em] font-mono">
                    Last updated: March 16, 2026
                  </p>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-8 space-y-20">
              <section>
                <h2 className="text-3xl font-black mb-8 tracking-tight uppercase italic underline decoration-primary decoration-4 underline-offset-8">1. The Agreement</h2>
                <div className="prose prose-invert max-w-none text-slate-500 space-y-6 font-medium italic">
                  <p className="text-lg leading-relaxed text-foreground/80 font-bold">By using KeenVPN, you are entering a binding legal agreement with Negative Nine Inc. You represent that you are at least 18 years of age and have the authority to enter this agreement.</p>
                  <p className="leading-relaxed">We provide a high-performance VPN tunnel designed for privacy, adblocking, and regional price discovery. While we facilitate access to global content, you are responsible for complying with the terms of third-party services you access through our network.</p>
                </div>
              </section>

              <section>
                <h2 className="text-3xl font-black mb-8 tracking-tight uppercase italic underline decoration-secondary decoration-4 underline-offset-8">2. Prohibited Conduct</h2>
                <div className="p-10 rounded-[3rem] bg-rose-500/5 border border-rose-500/20 shadow-inner">
                  <div className="flex items-center gap-3 mb-8 text-rose-500">
                    <AlertTriangle className="h-6 w-6 stroke-[3]" />
                    <h4 className="font-black uppercase tracking-[0.2em] text-[10px]">Zero Tolerance Policy</h4>
                  </div>
                  <ul className="space-y-4 text-sm font-black uppercase tracking-widest text-slate-300 list-none p-0">
                    <li>• Exploitation or abuse of minors.</li>
                    <li>• Systematic scraping or DDoS attacks.</li>
                    <li>• Distribution of malware or ransomware.</li>
                    <li>• Fraudulent financial activities.</li>
                  </ul>
                  <p className="mt-8 text-[10px] text-rose-500/60 font-black uppercase tracking-widest italic">Violation results in immediate termination without refund.</p>
                </div>
              </section>

              <section>
                <h2 className="text-3xl font-black mb-8 tracking-tight uppercase italic underline decoration-primary decoration-4 underline-offset-8">3. Subscriptions & Billing</h2>
                <div className="space-y-8">
                  <div className="p-10 rounded-[3rem] bg-muted/20 border border-border/50 shadow-sm relative group overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-20 group-hover:opacity-40 transition-opacity"></div>
                    <h4 className="font-black mb-4 uppercase tracking-[0.2em] text-[10px] text-primary italic">Auto-Renewal Protocol</h4>
                    <p className="text-sm text-slate-500 leading-relaxed font-medium italic">Subscriptions renew automatically at the end of your billing cycle. You can disable auto-renewal at any time via the Account Dashboard or by emailing support. Cancellations must be made 24 hours before the renewal date.</p>
                  </div>
                  <div className="p-10 rounded-[3rem] bg-muted/20 border border-border/50 shadow-sm relative group overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-secondary opacity-20 group-hover:opacity-40 transition-opacity"></div>
                    <h4 className="font-black mb-4 uppercase tracking-[0.2em] text-[10px] text-secondary italic">30-Day Refund Policy</h4>
                    <p className="text-sm text-slate-500 leading-relaxed font-medium italic">If you are not satisfied with KeenVPN, you may request a full refund within 30 days of your initial purchase. Refunds are processed to the original payment method within 5-10 business days.</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-3xl font-black mb-8 tracking-tight uppercase italic underline decoration-slate-500 decoration-4 underline-offset-8">4. Limitation of Liability</h2>
                <div className="prose prose-invert max-w-none text-slate-600 text-xs font-black uppercase tracking-widest leading-loose font-mono italic">
                  <p>KEENVPN IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. NEGATIVE NINE INC. SHALL NOT BE LIABLE FOR ANY INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES ARISING FROM THE USE OF OUR SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE TOTAL AMOUNT PAID BY YOU IN THE 12 MONTHS PRECEDING THE CLAIM.</p>
                </div>
              </section>

              <section className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10">
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 shadow-inner">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Legal Jurisdiction</h4>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-tighter italic">STATE OF TEXAS, USA</p>
                </div>
                <div className="text-center md:text-right">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Legal Inquiries</h4>
                  <a href="mailto:legal@vpnkeen.com" className="text-xs font-black text-primary hover:underline italic tracking-widest">legal@vpnkeen.com</a>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;
