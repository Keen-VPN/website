import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Globe, MapPin, Building2, Network, Shield, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface IPInfo {
  ip: string;
  city: string;
  region: string;
  country_name: string;
  org: string;
  latitude: number;
  longitude: number;
  timezone: string;
  version: string;
}

const MyIPAddress = () => {
  const [ipInfo, setIpInfo] = useState<IPInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchIPInfo = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/");
        if (!response.ok) throw new Error("Failed to fetch IP information");
        const data = await response.json();
        setIpInfo(data);
      } catch {
        setError("Unable to retrieve your IP information. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchIPInfo();
  }, []);

  const handleCopy = async () => {
    if (!ipInfo) return;
    await navigator.clipboard.writeText(ipInfo.ip);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="What Is My IP Address? — KeenVPN"
        description="Instantly see your public IP address, location, ISP, and more. Check if your VPN is working and your real IP is hidden."
        canonical="https://vpnkeen.com/my-ip-address"
      />
      <Header />

      <section className="relative bg-gradient-hero overflow-hidden pt-28 pb-14 md:pt-32 md:pb-20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-50"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              What Is My IP Address?
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Your public IP address and connection details are shown below.
            </p>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Detecting your IP address...</p>
            </div>
          )}

          {error && (
            <div className="max-w-md mx-auto bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-center">
              <p className="text-destructive">{error}</p>
            </div>
          )}

          {ipInfo && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-card border border-border rounded-2xl p-8 md:p-10 shadow-lg mb-8">
                <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2 text-center">
                  Your Public IP Address
                </p>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span className="text-3xl md:text-5xl font-mono font-bold text-primary">
                    {ipInfo.ip}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="text-muted-foreground hover:text-primary transition-colors p-2"
                    title="Copy IP address"
                  >
                    {copied ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {ipInfo.version === "IPv6" ? "IPv6" : "IPv4"}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoCard
                  icon={<MapPin className="h-5 w-5 text-primary" />}
                  label="Location"
                  value={[ipInfo.city, ipInfo.region, ipInfo.country_name].filter(Boolean).join(", ")}
                />
                <InfoCard
                  icon={<Building2 className="h-5 w-5 text-primary" />}
                  label="ISP / Organization"
                  value={ipInfo.org}
                />
                <InfoCard
                  icon={<Globe className="h-5 w-5 text-primary" />}
                  label="Timezone"
                  value={ipInfo.timezone}
                />
                <InfoCard
                  icon={<Network className="h-5 w-5 text-primary" />}
                  label="Coordinates"
                  value={`${ipInfo.latitude}, ${ipInfo.longitude}`}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl p-8 md:p-10 text-center">
            <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Want to Hide Your IP Address?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              With KeenVPN, your real IP address is replaced with one from our
              secure servers — keeping your location private and your connection
              encrypted.
            </p>
            <Link to="/pricing">
              <Button size="lg" className="shadow-glow">
                Get KeenVPN
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

const InfoCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
    <div className="mt-0.5">{icon}</div>
    <div>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-foreground font-medium">{value}</p>
    </div>
  </div>
);

export default MyIPAddress;
