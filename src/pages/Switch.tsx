import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Gift,
  Globe,
  Shield,
  ShieldCheck,
  Upload,
  Zap,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getMembershipTransferReturnUrl } from "@/auth/membership-transfer-flow";
import { serverLocationStats } from "@/constants/server-locations";
import { trackSwitchPageEvent } from "@/lib/product-analytics";

const valueProps = [
  {
    icon: Gift,
    title: "Match your remaining time",
    description:
      "We credit KeenVPN for whatever time you still have on your current VPN.",
  },
  {
    icon: Clock,
    title: "Reviewed within 24 hours",
    description:
      "Most requests are approved the same day. You hear back quickly.",
  },
  {
    icon: Globe,
    title: `Servers in ${serverLocationStats.countries} countries`,
    description:
      "Switch to a VPN with global coverage, not just one or two regions.",
  },
];

const steps = [
  {
    step: 1,
    icon: CheckCircle2,
    title: "Pick your plan",
    description: "Choose monthly or annual on our pricing page.",
  },
  {
    step: 2,
    icon: Upload,
    title: "Upload proof of your subscription",
    description:
      "Send a screenshot showing your active VPN plan and expiry date.",
  },
  {
    step: 3,
    icon: ShieldCheck,
    title: "Get your matched time",
    description:
      "Once approved, we add the remaining time to your KeenVPN account.",
  },
];

const switchFaqs = [
  {
    q: "What proof do I need to bring?",
    a: "A screenshot of your active VPN subscription is enough. It should show your plan and when it expires. A receipt or account page from NordVPN, ExpressVPN, Surfshark, or any other provider works.",
  },
  {
    q: "How long does approval take?",
    a: "Most requests are reviewed within 24 hours. Some are approved automatically if your subscription expires within the next month.",
  },
  {
    q: "Do I need to cancel my old VPN first?",
    a: "No. Sign up for KeenVPN, submit your proof, and keep using your current VPN until we approve your transfer. Cancel the old one whenever you are ready.",
  },
  {
    q: "Does this work with any VPN provider?",
    a: "Yes. If you have paid time left on another VPN, bring proof and we will match it.",
  },
  {
    q: "What if I already started switching?",
    a: "Sign in and check your account page. If you submitted a request, your status will show there as pending, approved, or rejected.",
  },
];

function scrollToHowItWorks() {
  document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
}

export default function Switch() {
  const navigate = useNavigate();
  const viewedRef = useRef(false);

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    trackSwitchPageEvent("switch_page_viewed");
  }, []);

  const startSwitch = (location: "hero" | "how_it_works" | "bottom") => {
    trackSwitchPageEvent("switch_cta_clicked", { location });
    navigate(getMembershipTransferReturnUrl("switch"));
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Switch to KeenVPN | Keep Your Remaining VPN Time"
        description="Already paying for another VPN? Switch to KeenVPN and we will match your remaining subscription time. Most requests reviewed within 24 hours."
        canonical="https://vpnkeen.com/switch"
      />
      <Header />

      <main>
        <section className="relative overflow-hidden bg-gradient-hero pt-28 pb-16 md:pt-32 md:pb-24">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-50" />
          <div className="container relative z-10 mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mb-4 text-sm font-medium uppercase tracking-wide text-primary">
                For new KeenVPN customers
              </p>
              <h1 className="mb-6 text-4xl font-bold leading-tight text-foreground md:text-6xl">
                Keep the VPN time you already paid for
              </h1>
              <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl">
                Save when you switch to KeenVPN today. We match your remaining
                subscription time at no extra cost.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button
                  size="lg"
                  className="bg-primary px-8 py-6 text-lg font-semibold text-primary-foreground shadow-glow hover:bg-primary/90"
                  onClick={() => startSwitch("hero")}
                >
                  Switch to KeenVPN
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-accent px-8 py-6 text-lg font-semibold hover:bg-accent/10"
                  onClick={scrollToHowItWorks}
                >
                  See how it works
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-card/30 py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
              {valueProps.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-xl border border-accent/30 bg-gradient-card p-6 text-center shadow-card md:text-left"
                >
                  <Icon className="mx-auto mb-4 h-8 w-8 text-primary md:mx-0" />
                  <h2 className="mb-2 text-lg font-semibold text-foreground">
                    {title}
                  </h2>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
                Bring proof of your current VPN
              </h2>
              <p className="mb-2 text-xl font-semibold text-primary">
                We&apos;ll match your remaining time
              </p>
              <p className="mx-auto max-w-2xl text-muted-foreground">
                Switching should not mean throwing away months you already paid
                for. Upload a screenshot of your active subscription and we
                credit KeenVPN for the time you have left.
              </p>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-border bg-card/30 py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mb-12 text-center">
              <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">
                Three steps to switch
              </h2>
              <p className="mx-auto max-w-2xl text-muted-foreground">
                Three steps. No phone call required.
              </p>
            </div>
            <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
              {steps.map(({ step, icon: Icon, title, description }) => (
                <div
                  key={step}
                  className="rounded-xl border border-accent/30 bg-gradient-card p-6 shadow-card"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {step}
                  </div>
                  <Icon className="mb-3 h-8 w-8 text-primary" />
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    {title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Button
                size="lg"
                className="bg-primary px-8 py-6 text-lg font-semibold text-primary-foreground shadow-glow hover:bg-primary/90"
                onClick={() => startSwitch("how_it_works")}
              >
                Switch to KeenVPN
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mb-12 text-center">
              <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">
                Get more when you switch to KeenVPN
              </h2>
            </div>
            <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
              {[
                {
                  icon: Shield,
                  title: "No logs policy",
                  description:
                    "We do not track, store, or sell your browsing activity.",
                },
                {
                  icon: Zap,
                  title: "WireGuard and IKEv2",
                  description:
                    "Fast protocols on every server, built for everyday use.",
                },
                {
                  icon: Globe,
                  title: "Global server network",
                  description: `Connect through ${serverLocationStats.countries} countries across ${serverLocationStats.regions} regions.`,
                },
                {
                  icon: Clock,
                  title: "Quick review",
                  description:
                    "Most transfer requests are handled within 24 hours.",
                },
              ].map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="flex gap-4 rounded-lg border border-border bg-card p-5 shadow-sm"
                >
                  <Icon className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
                  <div>
                    <h3 className="mb-1 font-semibold text-foreground">
                      {title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-card/30 py-16 md:py-20">
          <div className="container mx-auto max-w-3xl px-4">
            <h2 className="mb-8 text-center text-3xl font-bold text-foreground md:text-4xl">
              Questions about switching?
            </h2>
            <Accordion type="single" collapsible className="space-y-3">
              {switchFaqs.map((faq, index) => (
                <AccordionItem
                  key={faq.q}
                  value={`switch-faq-${index}`}
                  className="rounded-lg border border-border bg-card px-4"
                >
                  <AccordionTrigger className="text-left hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl rounded-xl border border-accent/30 bg-gradient-card p-8 text-center shadow-card md:p-12">
              <h2 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
                Ready to switch?
              </h2>
              <p className="mb-8 text-muted-foreground">
                Pick a plan, upload your proof, and keep the VPN time you
                already paid for.
              </p>
              <Button
                size="lg"
                className="bg-primary px-8 py-6 text-lg font-semibold text-primary-foreground shadow-glow hover:bg-primary/90"
                onClick={() => startSwitch("bottom")}
              >
                Switch to KeenVPN
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
