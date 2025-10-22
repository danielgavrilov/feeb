import { ALLERGEN_FILTERS } from "@/data/allergen-filters";

export type IngredientAllergenLike = {
  code?: string | null;
  name?: string | null;
  certainty?: string | null;
  canonicalCode?: string | null;
  canonicalName?: string | null;
  familyCode?: string | null;
  familyName?: string | null;
  markerType?: string | null;
};

export type IngredientLike = {
  allergens?: IngredientAllergenLike[] | null;
};

export type CanonicalAllergen = {
  code: string;
  name: string;
  familyCode?: string;
  familyName?: string;
};

export type AllergenFamilyGroup = {
  familyCode?: string;
  familyName?: string;
  members: CanonicalAllergen[];
};

export type DishAllergenSummary = {
  canonicalAllergens: CanonicalAllergen[];
  canonicalCodes: Set<string>;
  familyCodes: Set<string>;
  markerTypes: Set<string>;
};

const CODE_FAMILY_MAP = new Map<string, { familyCode: string; familyName: string }>();

ALLERGEN_FILTERS.filter((definition) => definition.category === "allergen").forEach((definition) => {
  definition.codes.forEach((code) => {
    CODE_FAMILY_MAP.set(code.toLowerCase(), {
      familyCode: definition.id.toLowerCase(),
      familyName: definition.name,
    });
  });
});

const NON_VEGAN_CODES = new Set(
  [
    "en:milk",
    "en:lactose",
    "en:eggs",
    "en:egg",
    "en:fish",
    "en:crustaceans",
    "en:molluscs",
    "en:honey",
    "en:gelatin",
    "en:meat",
    "en:meat-derivatives",
    "en:meat-product",
    "en:meat-products",
    "en:animal-product",
    "en:animal-products",
    "en:animal-derivatives",
  ].map((code) => code.toLowerCase()),
);

const NON_VEGETARIAN_CODES = new Set(
  [
    "en:meat",
    "en:meat-derivatives",
    "en:meat-product",
    "en:meat-products",
    "en:animal-product",
    "en:animal-products",
    "en:animal-derivatives",
    "en:gelatin",
    "en:fish",
    "en:crustaceans",
    "en:molluscs",
  ].map((code) => code.toLowerCase()),
);

const NON_VEGETARIAN_FAMILY_CODES = new Set([
  "fish",
  "crustaceans",
  "molluscs",
]);

const normalizeCode = (code?: string | null) => code?.trim().toLowerCase() ?? "";

const normalizeCanonicalCode = (code?: string | null) => {
  const normalized = normalizeCode(code);

  if (!normalized) {
    return "";
  }

  if (normalized.includes(":")) {
    return normalized;
  }

  return `en:${normalized}`;
};

const fallbackNameFromCode = (code: string) => {
  if (!code) {
    return "";
  }

  const [, rawName] = code.split(":");
  if (!rawName) {
    return code;
  }

  return rawName
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
};

export const getCanonicalAllergens = (
  ingredients: IngredientLike[] | undefined | null,
): CanonicalAllergen[] => {
  if (!ingredients || ingredients.length === 0) {
    return [];
  }

  const canonicalMap = new Map<string, CanonicalAllergen>();

  ingredients.forEach((ingredient) => {
    (ingredient.allergens ?? []).forEach((allergen) => {
      const canonicalCode = normalizeCanonicalCode(allergen.canonicalCode ?? allergen.code);
      if (!canonicalCode || canonicalMap.has(canonicalCode)) {
        return;
      }

      const derivedFamily = CODE_FAMILY_MAP.get(canonicalCode);
      const familyCode = normalizeCode(allergen.familyCode ?? derivedFamily?.familyCode);
      const familyName = allergen.familyName ?? derivedFamily?.familyName;
      const canonicalName =
        allergen.canonicalName ??
        allergen.name ??
        fallbackNameFromCode(canonicalCode);

      canonicalMap.set(canonicalCode, {
        code: canonicalCode,
        name: canonicalName,
        familyCode: familyCode || undefined,
        familyName: familyName || undefined,
      });
    });
  });

  return Array.from(canonicalMap.values());
};

export const summarizeDishAllergens = (
  ingredients: IngredientLike[] | undefined | null,
): DishAllergenSummary => {
  const canonicalAllergens = getCanonicalAllergens(ingredients);
  const canonicalCodes = new Set<string>();
  const familyCodes = new Set<string>();
  const markerTypes = new Set<string>();

  ingredients?.forEach((ingredient) => {
    (ingredient.allergens ?? []).forEach((allergen) => {
      const canonicalCode = normalizeCanonicalCode(allergen.canonicalCode ?? allergen.code);
      if (canonicalCode) {
        canonicalCodes.add(canonicalCode);
        const unprefixedCode = canonicalCode.includes(":")
          ? canonicalCode.split(":").slice(1).join(":")
          : "";

        if (unprefixedCode) {
          canonicalCodes.add(unprefixedCode);
        }
      }

      const familyCode = normalizeCode(allergen.familyCode);
      if (familyCode) {
        familyCodes.add(familyCode);
      }

      const markerType = allergen.markerType?.trim().toLowerCase();
      if (markerType) {
        markerTypes.add(markerType);
      }
    });
  });

  canonicalAllergens.forEach((allergen) => {
    canonicalCodes.add(allergen.code);
    const unprefixedCode = allergen.code.includes(":")
      ? allergen.code.split(":").slice(1).join(":")
      : "";

    if (unprefixedCode) {
      canonicalCodes.add(unprefixedCode);
    }
    if (allergen.familyCode) {
      familyCodes.add(allergen.familyCode);
    }
  });

  return {
    canonicalAllergens,
    canonicalCodes,
    familyCodes,
    markerTypes,
  };
};

export const groupAllergensByFamily = (allergens: CanonicalAllergen[]): AllergenFamilyGroup[] => {
  if (allergens.length === 0) {
    return [];
  }

  const grouped = new Map<string, AllergenFamilyGroup>();
  const withoutFamily: CanonicalAllergen[] = [];

  allergens.forEach((allergen) => {
    if (!allergen.familyCode) {
      withoutFamily.push(allergen);
      return;
    }

    const key = allergen.familyCode;
    const existing = grouped.get(key) ?? {
      familyCode: key,
      familyName: allergen.familyName,
      members: [],
    };

    if (!existing.familyName && allergen.familyName) {
      existing.familyName = allergen.familyName;
    }

    existing.members.push(allergen);
    grouped.set(key, existing);
  });

  const sortedGroups = Array.from(grouped.values()).sort((a, b) => {
    return (a.familyName ?? a.familyCode ?? "").localeCompare(b.familyName ?? b.familyCode ?? "");
  });

  if (withoutFamily.length > 0) {
    sortedGroups.push({ members: withoutFamily, familyCode: undefined, familyName: undefined });
  }

  return sortedGroups;
};

const formatSpeciesNames = (members: CanonicalAllergen[]) => {
  const uniqueNames = Array.from(
    new Set(members.map((member) => member.name.trim()).filter(Boolean)),
  );

  return uniqueNames.join(", ");
};

export const formatAllergenList = (allergens: CanonicalAllergen[]): string => {
  if (allergens.length === 0) {
    return "";
  }

  const groups = groupAllergensByFamily(allergens);

  return groups
    .map((group) => {
      const species = formatSpeciesNames(group.members);
      if (group.familyName) {
        return `${species} (${group.familyName.toLowerCase()})`;
      }
      return species;
    })
    .filter(Boolean)
    .join("; ");
};

export const isVeganFriendly = (summary: DishAllergenSummary): boolean => {
  for (const marker of summary.markerTypes) {
    if (marker === "animal" || marker === "animal_product" || marker === "meat") {
      return false;
    }
  }

  for (const code of summary.canonicalCodes) {
    if (NON_VEGAN_CODES.has(code)) {
      return false;
    }
  }

  for (const family of summary.familyCodes) {
    if (NON_VEGETARIAN_FAMILY_CODES.has(family)) {
      return false;
    }
  }

  return true;
};

export const isVegetarianFriendly = (summary: DishAllergenSummary): boolean => {
  for (const marker of summary.markerTypes) {
    if (marker === "animal" || marker === "animal_product" || marker === "meat") {
      return false;
    }
  }

  for (const code of summary.canonicalCodes) {
    if (NON_VEGETARIAN_CODES.has(code)) {
      return false;
    }
  }

  for (const family of summary.familyCodes) {
    if (NON_VEGETARIAN_FAMILY_CODES.has(family)) {
      return false;
    }
  }

  return true;
};

