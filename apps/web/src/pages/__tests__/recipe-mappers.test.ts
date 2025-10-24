import test from "node:test";
import assert from "node:assert/strict";

import { mapRecipesToSavedDishes } from "../recipe-mappers";
import type { Recipe } from "../../lib/api";

const deriveMenuSectionKey = () => "2";

const baseRecipe: Recipe = {
  id: 1,
  restaurant_id: 42,
  name: "Heirloom Tomato Salad",
  description: "Fresh tomatoes with basil",
  instructions: "Slice and serve",
  serving_size: "1",
  price: "9.50",
  image: "",
  options: null,
  special_notes: null,
  prominence_score: null,
  confirmed: true,
  is_on_menu: true,
  created_at: "2024-01-01T00:00:00Z",
  sections: [
    {
      menu_id: 1,
      menu_name: "Dinner",
      section_id: 2,
      section_name: "Starters",
      section_position: 1,
      recipe_position: 1,
    },
  ],
  ingredients: [
    {
      ingredient_id: 10,
      ingredient_name: "Tomato",
      quantity: 2,
      unit: "pcs",
      notes: undefined,
      allergens: [],
      confirmed: true,
      substitution: undefined,
    },
    {
      ingredient_id: 11,
      ingredient_name: "Feta",
      quantity: 30,
      unit: "g",
      notes: undefined,
      allergens: [
        {
          code: "milk",
          name: "Milk",
          certainty: "confirmed",
          canonical_code: "milk",
          canonical_name: "Milk",
          family_code: null,
          family_name: null,
          marker_type: null,
        },
      ],
      confirmed: true,
      substitution: undefined,
    },
  ],
};

test("removed ingredient stays removed after reload", () => {
  const initialSaved = mapRecipesToSavedDishes([baseRecipe], deriveMenuSectionKey);
  assert.equal(initialSaved[0].ingredients.length, 2);

  const reloadedRecipe: Recipe = {
    ...baseRecipe,
    ingredients: [baseRecipe.ingredients[0]],
  };

  const afterReload = mapRecipesToSavedDishes([reloadedRecipe], deriveMenuSectionKey);
  assert.equal(afterReload[0].ingredients.length, 1);
  assert.deepEqual(afterReload[0].ingredients.map((ingredient) => ingredient.name), ["Tomato"]);
});
