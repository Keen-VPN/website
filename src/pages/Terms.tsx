import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FileText, AlertTriangle, CreditCard, Shield, Scale, Info } from "lucide-react";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-32 pb-24">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Editorial Header */}
          <div className="mb-20 border-b border-border/50 pb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 mb-6">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-xs font-black text-primary uppercase tracking-widest">Document 002: Service Agreement</span>
            </div>
            <h1 className="text-5xl md:text-8xl font-black text-foreground mb-8 tracking-tighter">
              The <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">Standard.</span>
            </h1>
            <p className="text-2xl text-muted-foreground max-w-3xl leading-snug font-medium italic">
              KeenVPN is built on transparency. Our terms are designed to be as clear as our encryption is strong.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            {/* Sidebar Summary */}
            <div className="lg:col-span-4">
              <div className="sticky top-32 space-y-6">
                <div className="p-8 rounded-[2rem] bg-slate-900 border border-white/5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
                    <Info className="h-3 w-3" /> Quick Summary
                  </h3>
                  <div className="space-y-6">
                    {[
                      { icon: Shield, text: "Privacy First: We log nothing." },
                      { icon: CreditCard, text: "30-Day Guarantee: No risk." },
                      { icon: Scale, text: "Fair Use: No illegal abuse." },
                      { icon: FileText, text: "Transparent: No hidden fees." }
                    ].map((item, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <item.icon className="h-4 w-4 text-secondary flex-shrink-0 mt-0.5" />
                        <span className="text-sm font-bold text-slate-300">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-4">
                  Last updated: March 16, 2026
                </p>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-8 space-y-16">
              <section>
                <h2 className="text-2xl font-black mb-6 tracking-tight uppercase">1. The Agreement</h2>
                <div className="prose prose-invert max-w-none text-slate-400 space-y-4">
                  <p>By using KeenVPN, you are entering a binding legal agreement with Negative Nine Inc. You represent that you are at least 18 years of age and have the authority to enter this agreement.</p>
                  <p>We provide a high-performance VPN tunnel designed for privacy, adblocking, and regional price discovery. While we facilitate access to global content, you are responsible for complying with the terms of third-party services you access through our network.</p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-black mb-6 tracking-tight uppercase">2. Prohibited Conduct</h2>
                <div className="p-8 rounded-3xl bg-rose-500/5 border border-rose-500/20">
                  <div className="flex items-center gap-3 mb-6 text-rose-500">
                    <AlertTriangle className="h-5 w-5" />
                    <h4 className="font-black uppercase tracking-widest text-xs">Zero Tolerance Policy</h4>
                  </div>
                  <ul className="space-y-3 text-sm font-bold uppercase tracking-tighter text-slate-300 list-none p-0">
                    <li>• Exploitation or abuse of minors.</li>
                    <li>• Systematic scraping or DDoS attacks.</li>
                    <li>• Distribution of malware or ransomware.</li>
                    <li>• Fraudulent financial activities.</li>
                  </ul>
                  <p className="mt-6 text-xs text-slate-500 font-medium italic">Violation results in immediate termination without refund.</p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-black mb-6 tracking-tight uppercase">3. Subscriptions & Billing</h2>
                <div className="space-y-6">
                  <div className="p-8 rounded-3xl bg-muted/20 border border-border/50">
                    <h4 className="font-black mb-4 uppercase tracking-widest text-xs text-primary">Auto-Renewal</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">Subscriptions renew automatically at the end of your billing cycle. You can disable auto-renewal at any time via the Account Dashboard or by emailing support. Cancellations must be made 24 hours before the renewal date.</p>
                  </div>
                  <div className="p-8 rounded-3xl bg-muted/20 border border-border/50">
                    <h4 className="font-black mb-4 uppercase tracking-widest text-xs text-secondary">30-Day Refund Policy</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">If you are not satisfied with KeenVPN, you may request a full refund within 30 days of your initial purchase. Refunds are processed to the original payment method within 5-10 business days.</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-black mb-6 tracking-tight uppercase">4. Limitation of Liability</h2>
                <div className="prose prose-invert max-w-none text-slate-400 text-sm leading-relaxed">
                  <p>KEENVPN IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. NEGATIVE NINE INC. SHALL NOT BE LIABLE FOR ANY INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES ARISING FROM THE USE OF OUR SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE TOTAL AMOUNT PAID BY YOU IN THE 12 MONTHS PRECEDING THE CLAIM.</p>
                </div>
              </section>

              <section className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Legal Jurisdiction</h4>
                  <p className="text-xs font-bold text-slate-400">STATE OF TEXAS, USA</p>
                </div>
                <div className="text-right">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Inquiries</h4>
                  <a href="mailto:legal@vpnkeen.com" className="text-xs font-bold text-primary hover:underline">legal@vpnkeen.com</a>
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
