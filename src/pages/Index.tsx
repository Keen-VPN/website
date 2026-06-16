import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import MembershipTransferPromo from "@/components/MembershipTransferPromo";
import PerksShowcase from "@/components/PerksShowcase";
import PerksExamples from "@/components/PerksExamples";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="KeenVPN — Fast, Secure & Private VPN with Exclusive Member Perks"
        description="KeenVPN protects your privacy and gives you access to exclusive cashback offers, partner discounts, and member rewards. Start your free trial today."
        canonical="https://vpnkeen.com"
      />
      <Header />
      <Hero />
      <div id="perks">
        <PerksShowcase />
        <PerksExamples />
      </div>
      <MembershipTransferPromo />
      <div id="features">
        <Features />
      </div>
      <div id="pricing">
        <Pricing />
      </div>
      <Footer />
    </div>
  );
};

export default Index;
