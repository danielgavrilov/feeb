import test from "node:test";
import assert from "node:assert/strict";

import {
  formatAllergenList,
  summarizeDishAllergens,
  isVeganFriendly,
  isVegetarianFriendly,
} from "../allergen-utils";
import { getDishAllergenDefinitions, type SavedDish } from "../../components/RecipeBook";

test("formatAllergenList groups cereals and nuts", () => {
  const formatted = formatAllergenList([
    {
      code: "en:wheat",
      name: "Wheat",
      familyCode: "cereals_gluten",
      familyName: "Cereals containing gluten",
    },
    {
      code: "en:spelt",
      name: "Spelt",
      familyCode: "cereals_gluten",
      familyName: "Cereals containing gluten",
    },
    {
      code: "en:walnuts",
      name: "Walnuts",
      familyCode: "tree_nuts",
      familyName: "Tree nuts",
    },
  ]);

  assert.equal(
    formatted,
    "Wheat, Spelt (cereals containing gluten); Walnuts (tree nuts)",
  );
});

test("vegan friendliness is false when honey is present", () => {
  const summary = summarizeDishAllergens([
    {
      allergens: [
        {
          code: "en:honey",
          name: "Honey",
          canonicalCode: "en:honey",
          canonicalName: "Honey",
        },
      ],
    },
  ]);

  assert.equal(isVeganFriendly(summary), false);
  assert.equal(isVegetarianFriendly(summary), true);
});

test("vegan badge is omitted when honey markers exist", () => {
  const honeyDish: SavedDish = {
    id: "honey-toast",
    name: "Honey Toast",
    menuSectionId: "",
    description: "",
    servingSize: "1",
    price: "",
    ingredients: [
      {
        name: "Honey",
        quantity: "",
        unit: "",
        allergens: [
          {
            code: "en:honey",
            name: "Honey",
            canonicalCode: "en:honey",
            canonicalName: "Honey",
          },
        ],
      },
    ],
    prepMethod: "",
    compliance: {},
    confirmed: true,
    isOnMenu: false,
  };

  const definitionIds = getDishAllergenDefinitions(honeyDish).map((definition) => definition.id);

  assert.equal(definitionIds.includes("vegan"), false);
  assert.equal(definitionIds.includes("vegetarian"), true);
});

test("vegan and vegetarian badges are omitted when meat markers exist", () => {
  const meatDish: SavedDish = {
    id: "steak",
    name: "Steak",
    menuSectionId: "",
    description: "",
    servingSize: "1",
    price: "",
    ingredients: [
      {
        name: "Beef",
        quantity: "",
        unit: "",
        allergens: [
          {
            code: "en:meat",
            name: "Meat",
            canonicalCode: "en:meat",
            canonicalName: "Meat",
          },
        ],
      },
    ],
    prepMethod: "",
    compliance: {},
    confirmed: true,
    isOnMenu: true,
  };

  const definitionIds = getDishAllergenDefinitions(meatDish).map((definition) => definition.id);

  assert.equal(definitionIds.includes("vegan"), false);
  assert.equal(definitionIds.includes("vegetarian"), false);
  assert.equal(definitionIds.includes("meat"), true);
});

test("menu view badge mapping includes meat definition", () => {
  const meatDish: SavedDish = {
    id: "steak",
    name: "Steak",
    menuSectionId: "",
    description: "",
    servingSize: "1",
    price: "",
    ingredients: [
      {
        name: "Beef",
        quantity: "",
        unit: "",
        allergens: [
          {
            code: "en:meat",
            name: "Meat",
            canonicalCode: "en:meat",
            canonicalName: "Meat",
          },
        ],
      },
    ],
    prepMethod: "",
    compliance: {},
    confirmed: true,
    isOnMenu: true,
  };

  const summary = summarizeDishAllergens(meatDish.ingredients);
  const allergenDefinitions = getDishAllergenDefinitions(meatDish, summary);
  const formatMemberName = (value: string) =>
    value
      .split(/\s+/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
      .join(" ");
  const allergenBadges = allergenDefinitions.map((definition) => {
    const memberNames = summary.canonicalAllergens
      .map((allergen) => allergen.name?.trim())
      .filter((name): name is string => Boolean(name));
    const sortedMembers = [...memberNames].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
    const label =
      definition.category === "allergen" && sortedMembers.length > 0
        ? sortedMembers.map(formatMemberName).join(", ")
        : definition.name;

    return { definition, label };
  });

  const meatBadge = allergenBadges.find((badge) => badge.definition.id === "meat");

  assert.ok(meatBadge, "Meat badge should be present in menu view badge mapping");
  assert.equal(meatBadge?.definition.name, "Meat");
  assert.equal(meatBadge?.label, "Meat");
});

test("menu view allergen badge labels are capitalized without prefix", () => {
  const fishDish: SavedDish = {
    id: "salmon",
    name: "Salmon",
    menuSectionId: "",
    description: "",
    servingSize: "1",
    price: "",
    ingredients: [
      {
        name: "Salmon",
        quantity: "",
        unit: "",
        allergens: [
          {
            code: "en:fish",
            name: "fish",
            canonicalCode: "en:fish",
            canonicalName: "fish",
          },
        ],
      },
    ],
    prepMethod: "",
    compliance: {},
    confirmed: true,
    isOnMenu: true,
  };

  const summary = summarizeDishAllergens(fishDish.ingredients);
  const allergenDefinitions = getDishAllergenDefinitions(fishDish, summary);

  const formatMemberName = (value: string) =>
    value
      .split(/\s+/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
      .join(" ");

  const allergenBadges = allergenDefinitions.map((definition) => {
    const memberNames = summary.canonicalAllergens
      .map((allergen) => allergen.name?.trim())
      .filter((name): name is string => Boolean(name));
    const sortedMembers = [...memberNames].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
    const label =
      definition.category === "allergen" && sortedMembers.length > 0
        ? sortedMembers.map(formatMemberName).join(", ")
        : definition.name;

    return { definition, label };
  });

  const fishBadge = allergenBadges.find((badge) => badge.definition.id === "fish");

  assert.ok(fishBadge, "Fish badge should be present in menu view badge mapping");
  assert.equal(fishBadge?.label, "Fish");
});
