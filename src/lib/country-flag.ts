/** ISO 3166-1 alpha-2 → flag emoji (e.g. "US" → 🇺🇸). */
export function countryCodeToFlag(code: string): string {
  const normalized = code.toUpperCase();
  if (normalized.length !== 2) return "";
  return String.fromCodePoint(
    ...[...normalized].map((char) => 127397 + char.charCodeAt(0)),
  );
}

/** Wikimedia Commons filenames for ISO 3166-1 alpha-2 codes. */
const WIKIPEDIA_FLAG_FILE_OVERRIDES: Record<string, string> = {
  AR: "Flag_of_Argentina.svg",
  AT: "Flag_of_Austria.svg",
  AU: "Flag_of_Australia.svg",
  BH: "Flag_of_Bahrain.svg",
  BR: "Flag_of_Brazil.svg",
  CA: "Flag_of_Canada.svg",
  CH: "Flag_of_Switzerland.svg",
  CL: "Flag_of_Chile.svg",
  CO: "Flag_of_Colombia.svg",
  CR: "Flag_of_Costa_Rica.svg",
  CZ: "Flag_of_the_Czech_Republic.svg",
  DE: "Flag_of_Germany.svg",
  DK: "Flag_of_Denmark.svg",
  EG: "Flag_of_Egypt.svg",
  ES: "Flag_of_Spain.svg",
  FI: "Flag_of_Finland.svg",
  FR: "Flag_of_France.svg",
  GB: "Flag_of_the_United_Kingdom.svg",
  GH: "Flag_of_Ghana.svg",
  HK: "Flag_of_Hong_Kong.svg",
  ID: "Flag_of_Indonesia.svg",
  IE: "Flag_of_Ireland.svg",
  IL: "Flag_of_Israel.svg",
  IN: "Flag_of_India.svg",
  IS: "Flag_of_Iceland.svg",
  IT: "Flag_of_Italy.svg",
  JP: "Flag_of_Japan.svg",
  KE: "Flag_of_Kenya.svg",
  KR: "Flag_of_South_Korea.svg",
  MA: "Flag_of_Morocco.svg",
  MX: "Flag_of_Mexico.svg",
  MY: "Flag_of_Malaysia.svg",
  NG: "Flag_of_Nigeria.svg",
  NL: "Flag_of_the_Netherlands.svg",
  NO: "Flag_of_Norway.svg",
  NZ: "Flag_of_New_Zealand.svg",
  PA: "Flag_of_Panama.svg",
  PE: "Flag_of_Peru.svg",
  PH: "Flag_of_the_Philippines.svg",
  PK: "Flag_of_Pakistan.svg",
  PL: "Flag_of_Poland.svg",
  PT: "Flag_of_Portugal.svg",
  SE: "Flag_of_Sweden.svg",
  SG: "Flag_of_Singapore.svg",
  TH: "Flag_of_Thailand.svg",
  TR: "Flag_of_Turkey.svg",
  TW: "Flag_of_the_Republic_of_China.svg",
  US: "Flag_of_the_United_States.svg",
  VN: "Flag_of_Vietnam.svg",
  ZA: "Flag_of_South_Africa.svg",
};

const ENGLISH_COUNTRY_NAMES: Record<string, string> = {
  AR: "Argentina",
  AT: "Austria",
  AU: "Australia",
  BH: "Bahrain",
  BR: "Brazil",
  CA: "Canada",
  CH: "Switzerland",
  CL: "Chile",
  CO: "Colombia",
  CR: "Costa Rica",
  CZ: "Czech Republic",
  DE: "Germany",
  DK: "Denmark",
  EG: "Egypt",
  ES: "Spain",
  FI: "Finland",
  FR: "France",
  GB: "United Kingdom",
  GH: "Ghana",
  HK: "Hong Kong",
  ID: "Indonesia",
  IE: "Ireland",
  IL: "Israel",
  IN: "India",
  IS: "Iceland",
  IT: "Italy",
  JP: "Japan",
  KE: "Kenya",
  KR: "South Korea",
  MA: "Morocco",
  MX: "Mexico",
  MY: "Malaysia",
  NG: "Nigeria",
  NL: "Netherlands",
  NO: "Norway",
  NZ: "New Zealand",
  PA: "Panama",
  PE: "Peru",
  PH: "Philippines",
  PK: "Pakistan",
  PL: "Poland",
  PT: "Portugal",
  SE: "Sweden",
  SG: "Singapore",
  TH: "Thailand",
  TR: "Turkey",
  TW: "Taiwan",
  US: "United States",
  VN: "Vietnam",
  ZA: "South Africa",
};

const WIKIPEDIA_FLAG_ARTICLE_THE_COUNTRIES = new Set([
  "Bahamas",
  "Cayman Islands",
  "Central African Republic",
  "Czech Republic",
  "Democratic Republic of the Congo",
  "Dominican Republic",
  "Maldives",
  "Netherlands",
  "Philippines",
  "Republic of the Congo",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
]);

function wikipediaFlagFileName(code: string): string | null {
  const upper = code.toUpperCase();
  if (WIKIPEDIA_FLAG_FILE_OVERRIDES[upper]) {
    return WIKIPEDIA_FLAG_FILE_OVERRIDES[upper];
  }

  const name = ENGLISH_COUNTRY_NAMES[upper];
  if (!name) return null;

  const body = name.replace(/ /g, "_");
  if (name === "Gambia") return "Flag_of_The_Gambia.svg";
  if (WIKIPEDIA_FLAG_ARTICLE_THE_COUNTRIES.has(name)) {
    return `Flag_of_the_${body}.svg`;
  }
  return `Flag_of_${body}.svg`;
}

/** High-quality rectangular flag image from Wikimedia Commons (Wikipedia). */
export function wikipediaFlagUrl(code: string, width = 48): string | null {
  const fileName = wikipediaFlagFileName(code);
  if (!fileName) return null;
  const encoded = encodeURIComponent(fileName);
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}?width=${width}`;
}
