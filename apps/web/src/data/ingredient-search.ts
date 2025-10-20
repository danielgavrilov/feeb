/**
 * Lightweight ingredient search helpers for the menu view.
 *
 * Option 1 from the discovery phase keeps everything client-side. If we need
 * better recall or larger datasets, revisit the API-backed approaches outlined
 * in options 2 and 3 (trigram search + taxonomy expansion).
 */
const RAW_SYNONYM_GROUPS: Array<{ canonical: string; variants: string[] }> = [
  {
    canonical: "mushroom",
    variants: ["shiitake", "portobello", "cremini", "button mushroom", "chanterelle", "porcini"],
  },
  { canonical: "pepper", variants: ["capsicum", "bell pepper", "jalapeno", "jalapeño", "poblano"] },
  { canonical: "chili", variants: ["chilli", "chile", "jalapeno", "jalapeño", "serrano"] },
  { canonical: "prawn", variants: ["shrimp", "langoustine"] },
  { canonical: "coriander", variants: ["cilantro"] },
  { canonical: "aubergine", variants: ["eggplant"] },
  { canonical: "courgette", variants: ["zucchini"] },
  { canonical: "beet", variants: ["beetroot"] },
  { canonical: "garbanzo", variants: ["chickpea", "chickpeas"] },
];

const buildSynonymMap = () => {
  const entries = new Map<string, Set<string>>();
  RAW_SYNONYM_GROUPS.forEach(({ canonical, variants }) => {
    const normalizedCanonical = canonical.toLowerCase();
    const synonyms = new Set<string>([normalizedCanonical, ...variants.map((item) => item.toLowerCase())]);

    synonyms.forEach((term) => {
      const existing = entries.get(term) ?? new Set<string>();
      synonyms.forEach((synonym) => {
        if (synonym !== term) {
          existing.add(synonym);
        }
      });
      entries.set(term, existing);
    });
  });
  return entries;
};

const SYNONYM_MAP = buildSynonymMap();

const tokenize = (value: string) =>
  value
    .split(/[\s,\-/]+/)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0);

const normalizeToken = (token: string) => {
  if (token.endsWith("es") && token.length > 4) {
    return token.slice(0, -2);
  }
  if (token.endsWith("s") && token.length > 3) {
    return token.slice(0, -1);
  }
  return token;
};

export interface ExpandedIngredientQuery {
  phrase: string | null;
  terms: string[];
}

export const expandIngredientSearchTerms = (rawQuery: string): ExpandedIngredientQuery => {
  const trimmed = rawQuery.trim().toLowerCase();

  if (!trimmed) {
    return { phrase: null, terms: [] };
  }

  const tokens = tokenize(trimmed);
  const expandedTerms = new Set<string>();

  tokens.forEach((token) => {
    const normalized = normalizeToken(token);
    if (normalized) {
      expandedTerms.add(normalized);
      const synonyms = SYNONYM_MAP.get(normalized);
      synonyms?.forEach((synonym) => expandedTerms.add(synonym));
    }
  });

  return {
    phrase: trimmed,
    terms: Array.from(expandedTerms),
  };
};

