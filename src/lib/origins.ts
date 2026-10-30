// Guest origins as defined by the ISTAT IST_00139 form: 59 foreign countries or
// country groups, and 21 Italian regions (Bolzano and Trento are separate).
// The order matches the columns of the form. Keys are stable: they are stored
// in the database, so never rename one.

export type Locale = "it" | "en" | "de";

export type Origin = {
  key: string;
  kind: "country" | "region";
  it: string;
  en: string;
  de: string;
  // Extra words that should find this origin in the search box.
  aliases?: string[];
};

const c = (key: string, it: string, en: string, de: string, aliases?: string[]): Origin => ({
  key,
  kind: "country",
  it,
  en,
  de,
  aliases,
});
const r = (key: string, it: string, en: string, de: string, aliases?: string[]): Origin => ({
  key,
  kind: "region",
  it,
  en,
  de,
  aliases,
});

export const COUNTRIES: Origin[] = [
  c("AT", "Austria", "Austria", "Österreich"),
  c("BE", "Belgio", "Belgium", "Belgien"),
  c("BY", "Bielorussia", "Belarus", "Belarus", ["weissrussland"]),
  c("BG", "Bulgaria", "Bulgaria", "Bulgarien"),
  c("CY", "Cipro", "Cyprus", "Zypern"),
  c("HR", "Croazia", "Croatia", "Kroatien"),
  c("DK", "Danimarca", "Denmark", "Dänemark"),
  c("EE", "Estonia", "Estonia", "Estland"),
  c("FI", "Finlandia", "Finland", "Finnland"),
  c("FR", "Francia", "France", "Frankreich"),
  c("DE", "Germania", "Germany", "Deutschland"),
  c("GR", "Grecia", "Greece", "Griechenland"),
  c("IE", "Irlanda", "Ireland", "Irland"),
  c("IS", "Islanda", "Iceland", "Island"),
  c("LV", "Lettonia", "Latvia", "Lettland"),
  c("LT", "Lituania", "Lithuania", "Litauen"),
  c("LU", "Lussemburgo", "Luxembourg", "Luxemburg"),
  c("MT", "Malta", "Malta", "Malta"),
  c("MD", "Moldavia", "Moldova", "Moldau"),
  c("NO", "Norvegia", "Norway", "Norwegen"),
  c("NL", "Paesi Bassi", "Netherlands", "Niederlande", ["olanda", "holland"]),
  c("PL", "Polonia", "Poland", "Polen"),
  c("PT", "Portogallo", "Portugal", "Portugal"),
  c("GB", "Regno Unito", "United Kingdom", "Vereinigtes Königreich", [
    "inghilterra",
    "scozia",
    "galles",
    "england",
    "uk",
    "großbritannien",
  ]),
  c("CZ", "Repubblica Ceca", "Czech Republic", "Tschechien", ["cechia", "czechia"]),
  c("RO", "Romania", "Romania", "Rumänien"),
  c("RU", "Russia", "Russia", "Russland"),
  c("SK", "Slovacchia", "Slovakia", "Slowakei"),
  c("SI", "Slovenia", "Slovenia", "Slowenien"),
  c("ES", "Spagna", "Spain", "Spanien"),
  c("SE", "Svezia", "Sweden", "Schweden"),
  c("CH", "Svizzera e Liechtenstein", "Switzerland and Liechtenstein", "Schweiz und Liechtenstein"),
  c("TR", "Turchia", "Türkiye", "Türkei", ["turkey"]),
  c("UA", "Ucraina", "Ukraine", "Ukraine"),
  c("HU", "Ungheria", "Hungary", "Ungarn"),
  c("X_EUR", "Altri paesi europei", "Other European countries", "Andere europäische Länder", [
    "serbia",
    "bosnia",
    "albania",
    "montenegro",
    "macedonia",
    "kosovo",
    "andorra",
    "monaco",
    "san marino",
    "vaticano",
  ]),
  c("CA", "Canada", "Canada", "Kanada"),
  c("US", "Stati Uniti d'America", "United States", "Vereinigte Staaten", ["usa", "america"]),
  c("X_NAM", "Altri paesi Nord America", "Other North American countries", "Andere Länder Nordamerikas"),
  c("MX", "Messico", "Mexico", "Mexiko"),
  c("VE", "Venezuela", "Venezuela", "Venezuela"),
  c("BR", "Brasile", "Brazil", "Brasilien"),
  c("AR", "Argentina", "Argentina", "Argentinien"),
  c("X_LAM", "Altri paesi Centro-Sud America", "Other Central and South American countries", "Andere Länder Mittel- und Südamerikas", [
    "cile",
    "chile",
    "colombia",
    "peru",
    "uruguay",
  ]),
  c("CN", "Cina", "China", "China"),
  c("JP", "Giappone", "Japan", "Japan"),
  c("KR", "Corea del Sud", "South Korea", "Südkorea"),
  c("IN", "India", "India", "Indien"),
  c("IL", "Israele", "Israel", "Israel"),
  c("X_WAS", "Altri paesi Asia occidentale", "Other West Asian countries", "Andere Länder Westasiens"),
  c("X_ASI", "Altri paesi asiatici", "Other Asian countries", "Andere asiatische Länder", [
    "taiwan",
    "singapore",
    "thailandia",
    "vietnam",
    "indonesia",
  ]),
  c("ZA", "Sud Africa", "South Africa", "Südafrika"),
  c("EG", "Egitto", "Egypt", "Ägypten"),
  c("X_MAF", "Altri paesi Africa mediterranea", "Other Mediterranean African countries", "Andere Länder Nordafrikas", [
    "marocco",
    "tunisia",
    "algeria",
    "libia",
  ]),
  c("X_AFR", "Altri paesi africani", "Other African countries", "Andere afrikanische Länder"),
  c("AU", "Australia", "Australia", "Australien"),
  c("NZ", "Nuova Zelanda", "New Zealand", "Neuseeland"),
  c("X_OCE", "Altri paesi Oceania", "Other Oceania countries", "Andere Länder Ozeaniens"),
  c("X_NA", "Non specificato / apolide", "Not specified / stateless", "Nicht angegeben / staatenlos"),
];

export const REGIONS: Origin[] = [
  r("IT-PIE", "Piemonte", "Piedmont", "Piemont"),
  r("IT-VDA", "Valle d'Aosta", "Aosta Valley", "Aostatal"),
  r("IT-LOM", "Lombardia", "Lombardy", "Lombardei"),
  r("IT-BZ", "Prov. Bolzano", "Prov. of Bolzano", "Prov. Bozen", ["alto adige", "südtirol", "bozen"]),
  r("IT-TN", "Prov. Trento", "Prov. of Trento", "Prov. Trient", ["trentino", "trient"]),
  r("IT-VEN", "Veneto", "Veneto", "Venetien"),
  r("IT-FVG", "Friuli Venezia Giulia", "Friuli Venezia Giulia", "Friaul-Julisch Venetien"),
  r("IT-LIG", "Liguria", "Liguria", "Ligurien"),
  r("IT-EMR", "Emilia-Romagna", "Emilia-Romagna", "Emilia-Romagna"),
  r("IT-TOS", "Toscana", "Tuscany", "Toskana"),
  r("IT-UMB", "Umbria", "Umbria", "Umbrien"),
  r("IT-MAR", "Marche", "Marche", "Marken"),
  r("IT-LAZ", "Lazio", "Lazio", "Latium"),
  r("IT-ABR", "Abruzzo", "Abruzzo", "Abruzzen"),
  r("IT-MOL", "Molise", "Molise", "Molise"),
  r("IT-CAM", "Campania", "Campania", "Kampanien"),
  r("IT-PUG", "Puglia", "Apulia", "Apulien"),
  r("IT-BAS", "Basilicata", "Basilicata", "Basilikata"),
  r("IT-CAL", "Calabria", "Calabria", "Kalabrien"),
  r("IT-SIC", "Sicilia", "Sicily", "Sizilien"),
  r("IT-SAR", "Sardegna", "Sardinia", "Sardinien"),
];

export const ORIGINS: Origin[] = [...COUNTRIES, ...REGIONS];

const BY_KEY = new Map(ORIGINS.map((o) => [o.key, o]));

export function getOrigin(key: string): Origin | undefined {
  return BY_KEY.get(key);
}

export function isOriginKey(key: string): boolean {
  return BY_KEY.has(key);
}

export function originLabel(key: string, locale: Locale): string {
  const o = BY_KEY.get(key);
  return o ? o[locale] : key;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export function matchesOrigin(o: Origin, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const words = [o.it, o.en, o.de, o.key, ...(o.aliases ?? [])].map(normalize);
  return words.some((w) => w.includes(q));
}
