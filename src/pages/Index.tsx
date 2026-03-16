import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="KeenVPN — Fast, Secure & Private VPN for iOS and macOS"
        description="KeenVPN is a fast, secure VPN for iOS and macOS. Protect your privacy, bypass restrictions, and browse anonymously with military-grade encryption."
        canonical="https://vpnkeen.com"
      />
      <Header />
      <Hero />
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
