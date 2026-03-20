import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Mail,
  HelpCircle,
  Smartphone,
  Wifi,
  Lock,
  Settings,
  CreditCard,
  Banknote,
  Globe,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import SEOHead from "@/components/SEOHead";

const Support = () => {
  const faqCategories = [
    {
      id: "savings",
      title: "Deals & Savings",
      icon: <Banknote className="h-5 w-5" />,
      color: "text-secondary",
      questions: [
        {
          q: "How do I find cheaper flight deals?",
          a: "Connect to KeenVPN servers in regions like India, Turkey, or Argentina before searching. Clear your browser cookies or use an incognito window for the best results.",
        },
        {
          q: "Can I use KeenVPN for streaming subscriptions?",
          a: "Yes! Many streaming services offer lower rates in specific global regions. Use KeenVPN to access these regional storefronts and secure significant monthly savings.",
        },
        {
          q: "Does the adblocker save me money?",
          a: "Directly, yes! By blocking data-heavy ads and trackers, you reduce bandwidth consumption on limited mobile plans and speed up your browsing experience.",
        },
      ],
    },
    {
      id: "setup",
      title: "Setup & Installation",
      icon: <Smartphone className="h-5 w-5" />,
      color: "text-primary",
      questions: [
        {
          q: "How do I download and install KeenVPN?",
          a: "Download for iOS and macOS directly from the Apple App Store. Our setup wizard will guide you through the 30-second installation process.",
        },
        {
          q: "What are the system requirements?",
          a: "KeenVPN is optimized for macOS 13.0+ and iOS 15.0+. We support Intel and Apple Silicon (M1/M2/M3) chips natively.",
        },
      ],
    },
    {
      id: "connection",
      title: "Connection Issues",
      icon: <Wifi className="h-5 w-5" />,
      color: "text-primary",
      questions: [
        {
          q: "Why is my connection speed slow?",
          a: "While our nodes are 10Gbps, your speed depends on the physical distance to the server. Use our 'Smart Connect' feature to automatically find the lowest latency node for your region.",
        },
        {
          q: "How do I switch server locations?",
          a: "In the app dashboard, tap the location name to open the Server Selection HUD. You can filter by 'Deals' or 'Streaming' to find the best node for your task.",
        },
      ],
    },
    {
      id: "security",
      title: "Security & Privacy",
      icon: <Lock className="h-5 w-5" />,
      color: "text-primary",
      questions: [
        {
          q: "What encryption does KeenVPN use?",
          a: "We use the industry-standard WireGuard protocol combined with AES-256-GCM encryption, providing the fastest and most secure tunnel available today.",
        },
        {
          q: "Do you keep logs of my activity?",
          a: "Never. Our 'Church and State' privacy model mathematically ensures that your identity and your traffic can never be correlated. We are based in the USA but operate a strict zero-knowledge infrastructure.",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Support Center — KeenVPN Help & FAQs"
        description="Get help with KeenVPN. Browse FAQs on setup, connection issues, security, and billing. Contact our support team anytime."
        canonical="https://vpnkeen.com/support"
      />
      <Header />

      <main className="pt-32 pb-24">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 mb-6">
              <HelpCircle className="h-4 w-4 text-primary" />
              <span className="text-xs font-black text-primary uppercase tracking-widest text-glow-blue">Technical Intelligence</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-foreground mb-6 tracking-tighter">
              How can we <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">Empower</span> you?
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
              Access the KeenVPN knowledge base. From protocol deep-dives to advanced deal-hunting strategies, find everything you need to master your digital sovereignty.
            </p>
          </div>

          {/* Quick Links / Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
            {[
              { label: "Check Status", icon: Globe, sub: "Network is operational" },
              { label: "Account", icon: CreditCard, sub: "Manage subscription" },
              { label: "Deals Guide", icon: Banknote, sub: "Save on flights & more" },
              { label: "API Docs", icon: Settings, sub: "For power users" },
            ].map((link, i) => (
              <button key={i} className="group p-6 rounded-2xl bg-card/30 border border-border/50 hover:border-primary/30 text-left transition-all duration-300 hover:bg-card">
                <div className="p-3 rounded-xl bg-muted/50 w-fit mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <link.icon className="h-6 w-6" />
                </div>
                <div className="font-black text-foreground mb-1 flex items-center gap-2">
                  {link.label}
                  <ArrowRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </div>
                <div className="text-xs text-muted-foreground font-bold uppercase tracking-tighter">{link.sub}</div>
              </button>
            ))}
          </div>

          {/* FAQ Section */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-1">
              <h2 className="text-3xl font-black mb-6 tracking-tight">Technical FAQ</h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Detailed answers to the most common questions about our infrastructure, privacy model, and global savings engine.
              </p>
              <div className="p-8 rounded-3xl bg-slate-900 border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 bg-secondary/10 blur-3xl"></div>
                <h3 className="text-xl font-black mb-4 relative z-10">Real-time Support</h3>
                <p className="text-sm text-slate-400 mb-6 relative z-10">Average response time is currently <span className="text-secondary font-bold">14 minutes</span>.</p>
                <Button 
                  onClick={() => window.location.href = "mailto:support@vpnkeen.com"}
                  className="w-full bg-secondary text-white font-black rounded-xl h-12 relative z-10"
                >
                  Contact Humans
                </Button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-12">
              {faqCategories.map((category) => (
                <div key={category.id} className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted/50 ${category.color}`}>
                      {category.icon}
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-widest">{category.title}</h3>
                  </div>

                  <Accordion type="single" collapsible className="w-full space-y-3">
                    {category.questions.map((item, index) => (
                      <AccordionItem
                        key={index}
                        value={`${category.id}-${index}`}
                        className="border-none"
                      >
                        <AccordionTrigger className="flex p-6 rounded-2xl bg-card/30 border border-border/50 hover:border-primary/30 hover:bg-card text-left font-bold text-foreground hover:no-underline transition-all">
                          {item.q}
                        </AccordionTrigger>
                        <AccordionContent className="p-6 text-muted-foreground leading-relaxed bg-muted/20 rounded-b-2xl -mt-4 border-x border-b border-border/50">
                          {item.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Support;
