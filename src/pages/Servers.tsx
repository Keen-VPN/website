import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Globe, MapPin, Search } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ServerLocationRequestDialog } from "@/components/ServerLocationRequestDialog";
import ServerLocationsMap from "@/components/ServerLocationsMap";
import {
  filterServerLocations,
  groupByRegion,
  serverLocationStats,
  serverLocations,
} from "@/constants/server-locations";
import { wikipediaFlagUrl } from "@/lib/country-flag";
import { trackServerPageEvent } from "@/lib/product-analytics";

export default function Servers() {
  const viewedRef = useRef(false);
  const lastTrackedSearchRef = useRef("");
  const [query, setQuery] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestRegion, setRequestRegion] = useState("");

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    trackServerPageEvent("servers_page_viewed");
  }, []);

  const filtered = useMemo(
    () => filterServerLocations(query),
    [query],
  );
  const grouped = useMemo(() => groupByRegion(filtered), [filtered]);
  const hasResults = filtered.length > 0;

  const openRequest = (region = query.trim()) => {
    setRequestRegion(region);
    setRequestOpen(true);
  };

  const onSearchChange = (value: string) => {
    setQuery(value);
  };

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      lastTrackedSearchRef.current = "";
      return;
    }

    const timer = window.setTimeout(() => {
      if (lastTrackedSearchRef.current === trimmed) return;
      lastTrackedSearchRef.current = trimmed;
      trackServerPageEvent("server_location_searched", { query: trimmed });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [query]);

  const serversSeoDescription = `Browse KeenVPN VPN server locations across the Americas, Europe, Africa, and Asia-Pacific. Fast, secure servers in ${serverLocationStats.countries} countries.`;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="VPN Server Locations — KeenVPN Global Network"
        description={serversSeoDescription}
        canonical="https://vpnkeen.com/servers"
      />
      <Header />

      <main>
        <section className="relative overflow-hidden bg-gradient-hero pt-28 pb-14 md:pt-32 md:pb-20">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-50" />
          <div className="container relative z-10 mx-auto px-4 text-center">
            <div className="mb-6 inline-flex items-center rounded-full border border-accent/30 bg-card/50 px-4 py-2 shadow-lg backdrop-blur-sm">
              <Globe className="mr-2 h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">
                Global VPN network
              </span>
            </div>
            <h1 className="mx-auto mb-6 max-w-4xl text-4xl font-bold leading-tight text-foreground md:text-5xl">
              VPN server locations built for{" "}
              <span className="text-primary">fast, secure browsing</span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
              Choose from KeenVPN server locations across key regions, with more
              locations added based on user demand.
            </p>
            <Button
              asChild
              size="lg"
              className="bg-primary px-8 py-6 text-lg font-semibold text-primary-foreground shadow-glow hover:bg-primary/90"
            >
              <Link to="/pricing">Start free VPN trial</Link>
            </Button>
            <p className="mt-6 text-sm text-muted-foreground">
              {serverLocationStats.countries} countries ·{" "}
              {serverLocationStats.locations} server locations ·{" "}
              {serverLocationStats.regions} regions
            </p>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <h2 className="mb-3 text-center text-2xl font-bold text-foreground md:text-3xl">
              Worldwide server coverage
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-center text-muted-foreground">
              Explore KeenVPN server locations across the Americas, Europe,
              Africa, and Asia-Pacific.
            </p>
            <ServerLocationsMap locations={serverLocations} />
          </div>
        </section>

        <section className="border-t border-border py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-8 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by country or city…"
                  className="pl-10"
                  value={query}
                  onChange={(e) => onSearchChange(e.target.value)}
                  aria-label="Search server locations"
                />
              </div>
            </div>

            {hasResults ? (
              <div className="mx-auto max-w-5xl space-y-10">
                {grouped.map(({ region, countries }) => (
                  <div key={region}>
                    <h3 className="mb-4 text-xl font-semibold text-foreground">
                      {region}
                    </h3>
                    <div className="space-y-4">
                      {countries.map((group) => {
                        const flagUrl = wikipediaFlagUrl(group.countryCode, 54);
                        return (
                        <div
                          key={group.countryCode}
                          className="rounded-lg border border-border bg-card p-4 shadow-sm"
                        >
                          <div className="mb-3 flex items-center gap-2">
                            {flagUrl ? (
                              <img
                                src={flagUrl}
                                alt=""
                                width={36}
                                height={24}
                                className="h-6 w-9 shrink-0 rounded-sm border border-border bg-muted/30 object-contain p-0.5"
                                loading="lazy"
                              />
                            ) : null}
                            <span className="font-medium text-foreground">
                              {group.country}
                            </span>
                          </div>
                          <ul className="space-y-2">
                            {group.cities.map((loc) => (
                              <li
                                key={loc.id}
                                className="flex items-center justify-between gap-3 text-sm"
                              >
                                <span className="text-muted-foreground">
                                  {loc.city}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="bg-green-600/15 text-green-700 dark:text-green-400"
                                >
                                  Available
                                </Badge>
                              </li>
                            ))}
                          </ul>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mx-auto max-w-lg rounded-xl border border-accent/30 bg-gradient-card p-8 text-center shadow-card">
                <MapPin className="mx-auto mb-4 h-10 w-10 text-primary" />
                <h3 className="mb-2 text-xl font-semibold text-foreground">
                  Don&apos;t see your location?
                </h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  We&apos;re expanding based on user demand. Request a new VPN
                  server location and we&apos;ll prioritize it.
                </p>
                <Button onClick={() => openRequest(query.trim())}>
                  Request new VPN location
                </Button>
              </div>
            )}

            {hasResults ? (
              <div className="mx-auto mt-12 max-w-lg rounded-xl border border-border bg-card/50 p-6 text-center">
                <p className="mb-4 text-sm text-muted-foreground">
                  Don&apos;t see your location? Request a new server and
                  we&apos;ll prioritize it.
                </p>
                <Button variant="outline" onClick={() => openRequest(query.trim())}>
                  Request new VPN location
                </Button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="border-t border-border bg-card/30 py-16">
          <div className="container mx-auto max-w-3xl px-4">
            <h2 className="mb-4 text-2xl font-bold text-foreground">
              Secure VPN access across key global regions
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                KeenVPN provides fast, encrypted VPN servers across multiple
                countries. Whether you need secure browsing on public Wi-Fi,
                private access to region-specific content, or reliable
                connections for everyday use, our server network is built for
                speed and security.
              </p>
              <p>
                All KeenVPN servers feature military-grade encryption, a strict
                no-log policy, and support for WireGuard and IKEv2 protocols.
                New VPN server locations are added regularly based on user
                demand.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <ServerLocationRequestDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        initialRegion={requestRegion}
      />
    </div>
  );
}
