import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, HelpCircle, Shield, Zap, Globe, Lock, Banknote } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ContactSalesDialog } from "@/components/ContactSalesForm";
import { enterprisePlan, featureComparison, faqs } from "@/constants/pricing";
import { fetchSubscriptionPlans } from "@/auth/backend";
import { transformApiPlans } from "@/lib/pricing";
import { PricingPlan } from "@/lib/pricing";

const Pricing = () => {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(
    "annual"
  );
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        setLoading(true);
        const response = await fetchSubscriptionPlans();

        if (response.success && response.plans) {
          const transformedPlans = transformApiPlans(response.plans);
          setPlans([...transformedPlans, enterprisePlan]);
        } else {
          setError(response.error || "Failed to load plans");
          setPlans([enterprisePlan]);
        }
      } catch {
        setError("Failed to load plans");
        setPlans([enterprisePlan]);
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center pt-24">
          <div className="text-center">
            <Zap className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Securing the best deals for you...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-32 pb-24">
        {/* Luxury Minimal Hero */}
        <section className="container mx-auto px-4 text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Banknote className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Pricing that pays for itself</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-foreground mb-6 tracking-tighter animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">Protection</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
            Premium security with built-in savings. Access global markets, block intrusive ads, and reclaim your digital sovereignty.
          </p>

          {/* Industrial Utilitarian Toggle */}
          <div className="inline-flex p-1.5 bg-muted/50 rounded-2xl border border-border/50 backdrop-blur-xl shadow-inner mb-8">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${billingPeriod === "monthly"
                ? "bg-background text-foreground shadow-lg scale-[1.02]"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className={`px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300 relative ${billingPeriod === "annual"
                ? "bg-primary text-primary-foreground shadow-glow scale-[1.02]"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Annual
              <span className="absolute -top-3 -right-3 bg-secondary text-secondary-foreground text-[10px] font-black px-2 py-1 rounded-lg shadow-lg rotate-12">
                -60%
              </span>
            </button>
          </div>
        </section>

        {/* Pricing Grid */}
        <section className="container mx-auto px-4 mb-32">
          <div className="flex flex-wrap justify-center gap-8 max-w-7xl mx-auto items-stretch">
            {plans.map((plan, index) => {
              const isAnnual = billingPeriod === "annual";
              const isEnterprise = plan.name === "Enterprise";
              const isValuePlan = plan.popular || plan.name === "Team";
              
              const price = isAnnual
                ? plan.annualPriceDisplay || plan.monthlyPriceDisplay
                : plan.monthlyPriceDisplay;
              
              const monthlyEquivalent = isAnnual && plan.annualMonthlyEquivalent
                ? plan.annualMonthlyEquivalent
                : price;

              return (
                <div
                  key={index}
                  className={`group relative p-10 rounded-[2rem] border transition-all duration-500 flex flex-col w-full md:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)] max-w-md ${
                    isValuePlan
                      ? "bg-card dark:bg-slate-900 border-secondary shadow-[0_0_50px_rgba(16,185,129,0.1)] scale-105 z-10"
                      : "bg-card/50 border-border/50 hover:border-primary/30 hover:bg-card shadow-sm"
                  }`}
                >
                  {isValuePlan && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                      <span className="bg-secondary text-secondary-foreground px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-xl">
                        Ultimate Savings
                      </span>
                    </div>
                  )}

                  <div className="mb-10">
                    <h3 className={`text-2xl font-black mb-3 ${isValuePlan ? "text-secondary dark:text-secondary" : "text-foreground"}`}>
                      {plan.name}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed min-h-[40px] font-medium">
                      {plan.description}
                    </p>
                  </div>

                  <div className="mb-10 flex flex-col">
                    <div className="flex items-baseline gap-1">
                      <span className="text-6xl font-black tracking-tighter text-foreground">
                        {isEnterprise ? "POA" : monthlyEquivalent}
                      </span>
                      {!isEnterprise && (
                        <span className="text-muted-foreground font-bold italic">/mo</span>
                      )}
                    </div>
                    {isAnnual && !isEnterprise && (
                      <span className="text-secondary dark:text-secondary text-sm font-bold mt-2 flex items-center gap-1.5">
                        <Check className="h-4 w-4" /> Pays for itself in 1 flight booking
                      </span>
                    )}
                  </div>

                  {isEnterprise ? (
                    <ContactSalesDialog>
                      <Button
                        className="w-full h-14 rounded-2xl font-black text-lg mb-10 transition-all duration-300 hover:scale-[1.02]"
                        variant="outline"
                      >
                        {plan.buttonText}
                      </Button>
                    </ContactSalesDialog>
                  ) : (
                    <Button
                      onClick={() => {
                        const planId = isAnnual ? plan.annualId : plan.monthlyId;
                        navigate(`/subscribe?planId=${planId || ""}`);
                      }}
                      variant={isValuePlan ? "emerald" : "glow"}
                      size="lg"
                      className="w-full mb-10"
                    >
                      {plan.buttonText}
                    </Button>
                  )}

                  <div className="space-y-5 flex-grow">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Features Included</div>
                    {plan.features
                      .filter((f) => f.included)
                      .map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center gap-3">
                          <div className={`p-1 rounded-full ${isValuePlan ? "bg-secondary/10" : "bg-primary/10"}`}>
                            <Check className={`h-3.5 w-3.5 ${isValuePlan ? "text-secondary dark:text-secondary" : "text-primary"}`} />
                          </div>
                          <span className={`text-sm ${feature.highlighted ? "text-foreground font-bold" : "text-muted-foreground font-medium"}`}>
                            {feature.name}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Global Deal Grid (Bento Box) */}
        <section className="container mx-auto px-4 mb-32">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tighter text-foreground uppercase">Real-World <span className="text-secondary dark:text-secondary">Value</span></h2>
            <p className="text-muted-foreground font-medium max-w-xl mx-auto">See how KeenVPN pays for itself by unlocking global price parity.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <div className="md:col-span-2 p-8 rounded-[2rem] bg-card border border-border/50 flex flex-col justify-between group hover:border-primary/30 transition-all duration-500 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-20 bg-primary/5 blur-[100px] rounded-full"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                  <div className="p-4 bg-primary/10 rounded-2xl">
                    <Globe className="h-8 w-8 text-primary" />
                  </div>
                  <div className="bg-secondary/10 text-secondary dark:text-secondary px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Live Comparison</div>
                </div>
                <div>
                  <h3 className="text-3xl font-black mb-4 tracking-tight uppercase">Streaming Subscriptions</h3>
                  <p className="text-muted-foreground font-medium leading-relaxed mb-8 max-w-md">Access regional pricing for your favorite services. Secure Turkish or Indian rates from anywhere.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-background rounded-2xl border border-border/50 shadow-inner">
                      <div className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">USA PRICE</div>
                      <div className="text-2xl font-black text-rose-600">$15.99/mo</div>
                    </div>
                    <div className="p-5 bg-secondary/5 rounded-2xl border border-secondary/20">
                      <div className="text-[10px] font-black text-secondary dark:text-secondary mb-1 uppercase tracking-widest">KEENVPN PRICE</div>
                      <div className="text-2xl font-black text-secondary dark:text-secondary">$3.49/mo</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-8 rounded-[2rem] bg-slate-950 dark:bg-slate-900 border border-secondary/20 flex flex-col items-center text-center justify-center group hover:-translate-y-2 transition-all duration-500 shadow-2xl">
              <div className="p-6 bg-secondary/10 rounded-full mb-6">
                <Shield className="h-12 w-12 text-secondary" />
              </div>
              <h3 className="text-2xl font-black mb-4 text-white uppercase tracking-tight">Zero-Risk</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-8 font-medium italic">Not convinced? Use our 30-day money-back guarantee. No questions asked.</p>
              <Button onClick={() => navigate("/subscribe")} variant="emerald" className="w-full">Try it Free</Button>
            </div>
          </div>
        </section>

        {/* Feature Comparison Table - Refined */}
        <section className="container mx-auto px-4 mb-32">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-black text-center mb-16 tracking-tight uppercase">Technical Specifications</h2>
            <div className="rounded-[2.5rem] border border-border/50 bg-card/50 backdrop-blur-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/50">
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Capabilities</th>
                      {plans.map((plan, i) => (
                        <th key={i} className="p-8 text-center text-[10px] font-black uppercase tracking-[0.2em] text-foreground">{plan.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {featureComparison.map((row, i) => (
                      <tr key={i} className="border-b border-border/20 hover:bg-primary/5 transition-colors group">
                        <td className="p-8 text-sm font-bold text-foreground/70 group-hover:text-foreground">{row.feature}</td>
                        <td className="p-8 text-center">
                          {typeof row.individual === "boolean" ? (
                            row.individual ? <Check className="h-6 w-6 text-primary mx-auto" /> : <X className="h-6 w-6 text-muted-foreground/20 mx-auto" />
                          ) : <span className="text-[10px] font-black text-foreground uppercase tracking-widest">{row.individual}</span>}
                        </td>
                        <td className="p-8 text-center">
                          {typeof row.enterprise === "boolean" ? (
                            row.enterprise ? <Check className="h-6 w-6 text-secondary dark:text-secondary mx-auto" /> : <X className="h-6 w-6 text-muted-foreground/20 mx-auto" />
                          ) : <span className="text-[10px] font-black text-foreground uppercase tracking-widest">{row.enterprise}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ - Editorial Style */}
        <section className="container mx-auto px-4 mb-32">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black mb-4">Questions?</h2>
              <p className="text-muted-foreground">Everything you need to know about KeenVPN and global savings.</p>
            </div>

            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="rounded-3xl border border-border/50 px-8 py-2 data-[state=open]:bg-card/50 transition-all duration-300"
                >
                  <AccordionTrigger className="text-left font-black text-lg hover:no-underline hover:text-primary">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed pt-2 pb-6">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* High-Impact Final CTA */}
        <section className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto rounded-[3rem] bg-gradient-to-br from-primary to-blue-800 p-1 bg-[length:200%_200%] animate-gradient shadow-glow">
            <div className="bg-background rounded-[2.9rem] p-12 md:p-20 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-20 bg-primary/10 blur-[100px] rounded-full"></div>
              <div className="absolute bottom-0 left-0 p-20 bg-secondary/10 blur-[100px] rounded-full"></div>
              
              <h2 className="text-4xl md:text-6xl font-black text-foreground mb-8 tracking-tighter relative z-10">
                Stop Paying the <br/><span className="text-rose-500">"Location Tax"</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto relative z-10">
                Join thousands of smart users who save an average of $450/year while staying completely anonymous.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
                <Button
                  onClick={() => navigate("/subscribe")}
                  variant="glow"
                  size="xl"
                >
                  Start Saving Today
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/support")}
                  size="xl"
                >
                  Talk to Support
                </Button>
              </div>
              <p className="text-sm font-bold text-muted-foreground mt-8 relative z-10 uppercase tracking-widest">
                No credit card required for trial • Cancel anytime
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
