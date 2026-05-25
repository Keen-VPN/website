export type ServerRegion = "Americas" | "Europe" | "Africa" | "Asia-Pacific";

export interface ServerLocation {
  id: string;
  country: string;
  countryCode: string;
  city: string;
  region: ServerRegion;
  coordinates: { lat: number; lng: number };
  available: boolean;
}

export const regionOrder: ServerRegion[] = [
  "Americas",
  "Europe",
  "Africa",
  "Asia-Pacific",
];

export const serverLocations: ServerLocation[] = [
  {
    id: "us-virginia",
    country: "United States",
    countryCode: "US",
    city: "Virginia",
    region: "Americas",
    coordinates: { lat: 38.9586, lng: -77.357 },
    available: true,
  },
  {
    id: "us-new-jersey",
    country: "United States",
    countryCode: "US",
    city: "New Jersey",
    region: "Americas",
    coordinates: { lat: 40.0583, lng: -74.4057 },
    available: true,
  },
  {
    id: "us-houston",
    country: "United States",
    countryCode: "US",
    city: "Houston, Texas",
    region: "Americas",
    coordinates: { lat: 29.7604, lng: -95.3698 },
    available: true,
  },
  {
    id: "ca-montreal",
    country: "Canada",
    countryCode: "CA",
    city: "Montreal",
    region: "Americas",
    coordinates: { lat: 45.5017, lng: -73.5673 },
    available: true,
  },
  {
    id: "br-sao-paulo",
    country: "Brazil",
    countryCode: "BR",
    city: "São Paulo",
    region: "Americas",
    coordinates: { lat: -23.5505, lng: -46.6333 },
    available: true,
  },
  {
    id: "mx-queretaro",
    country: "Mexico",
    countryCode: "MX",
    city: "Querétaro City",
    region: "Americas",
    coordinates: { lat: 20.5888, lng: -100.3899 },
    available: true,
  },
  {
    id: "gb-london",
    country: "United Kingdom",
    countryCode: "GB",
    city: "London",
    region: "Europe",
    coordinates: { lat: 51.5074, lng: -0.1278 },
    available: true,
  },
  {
    id: "fr-paris",
    country: "France",
    countryCode: "FR",
    city: "Paris",
    region: "Europe",
    coordinates: { lat: 48.8566, lng: 2.3522 },
    available: true,
  },
  {
    id: "de-frankfurt",
    country: "Germany",
    countryCode: "DE",
    city: "Frankfurt",
    region: "Europe",
    coordinates: { lat: 50.1109, lng: 8.6821 },
    available: true,
  },
  {
    id: "ie-dublin",
    country: "Ireland",
    countryCode: "IE",
    city: "Dublin",
    region: "Europe",
    coordinates: { lat: 53.3498, lng: -6.2603 },
    available: true,
  },
  {
    id: "it-milan",
    country: "Italy",
    countryCode: "IT",
    city: "Milan",
    region: "Europe",
    coordinates: { lat: 45.4642, lng: 9.19 },
    available: true,
  },
  {
    id: "es-madrid",
    country: "Spain",
    countryCode: "ES",
    city: "Madrid",
    region: "Europe",
    coordinates: { lat: 40.4168, lng: -3.7038 },
    available: true,
  },
  {
    id: "se-stockholm",
    country: "Sweden",
    countryCode: "SE",
    city: "Stockholm",
    region: "Europe",
    coordinates: { lat: 59.3293, lng: 18.0686 },
    available: true,
  },
  {
    id: "ch-zurich",
    country: "Switzerland",
    countryCode: "CH",
    city: "Zurich",
    region: "Europe",
    coordinates: { lat: 47.3769, lng: 8.5417 },
    available: true,
  },
  {
    id: "ng-lagos",
    country: "Nigeria",
    countryCode: "NG",
    city: "Lagos",
    region: "Africa",
    coordinates: { lat: 6.5244, lng: 3.3792 },
    available: true,
  },
  {
    id: "za-cape-town",
    country: "South Africa",
    countryCode: "ZA",
    city: "Cape Town",
    region: "Africa",
    coordinates: { lat: -33.9249, lng: 18.4241 },
    available: true,
  },
  {
    id: "au-sydney",
    country: "Australia",
    countryCode: "AU",
    city: "Sydney",
    region: "Asia-Pacific",
    coordinates: { lat: -33.8688, lng: 151.2093 },
    available: true,
  },
  {
    id: "hk-hong-kong",
    country: "Hong Kong",
    countryCode: "HK",
    city: "Hong Kong",
    region: "Asia-Pacific",
    coordinates: { lat: 22.3193, lng: 114.1694 },
    available: true,
  },
  {
    id: "in-mumbai",
    country: "India",
    countryCode: "IN",
    city: "Mumbai",
    region: "Asia-Pacific",
    coordinates: { lat: 19.076, lng: 72.8777 },
    available: true,
  },
  {
    id: "jp-tokyo",
    country: "Japan",
    countryCode: "JP",
    city: "Tokyo",
    region: "Asia-Pacific",
    coordinates: { lat: 35.6762, lng: 139.6503 },
    available: true,
  },
  {
    id: "my-kuala-lumpur",
    country: "Malaysia",
    countryCode: "MY",
    city: "Kuala Lumpur",
    region: "Asia-Pacific",
    coordinates: { lat: 3.139, lng: 101.6869 },
    available: true,
  },
  {
    id: "sg-singapore",
    country: "Singapore",
    countryCode: "SG",
    city: "Singapore",
    region: "Asia-Pacific",
    coordinates: { lat: 1.3521, lng: 103.8198 },
    available: true,
  },
];

export interface CountryLocationGroup {
  country: string;
  countryCode: string;
  region: ServerRegion;
  cities: ServerLocation[];
}

export function filterServerLocations(query: string): ServerLocation[] {
  const q = query.trim().toLowerCase();
  if (!q) return serverLocations;
  return serverLocations.filter(
    (loc) =>
      loc.country.toLowerCase().includes(q) ||
      loc.city.toLowerCase().includes(q) ||
      loc.region.toLowerCase().includes(q),
  );
}

export function groupByRegion(
  locations: ServerLocation[],
): { region: ServerRegion; countries: CountryLocationGroup[] }[] {
  return regionOrder
    .map((region) => {
      const inRegion = locations.filter((loc) => loc.region === region);
      const byCountry = new Map<string, CountryLocationGroup>();
      for (const loc of inRegion) {
        const existing = byCountry.get(loc.countryCode);
        if (existing) {
          existing.cities.push(loc);
        } else {
          byCountry.set(loc.countryCode, {
            country: loc.country,
            countryCode: loc.countryCode,
            region: loc.region,
            cities: [loc],
          });
        }
      }
      return {
        region,
        countries: [...byCountry.values()].sort((a, b) =>
          a.country.localeCompare(b.country),
        ),
      };
    })
    .filter((group) => group.countries.length > 0);
}

export const serverLocationStats = {
  countries: new Set(serverLocations.map((l) => l.countryCode)).size,
  locations: serverLocations.length,
  regions: regionOrder.length,
};
