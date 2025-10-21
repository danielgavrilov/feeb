import test from "node:test";
import assert from "node:assert/strict";
import { shouldOpenDishSuggestions } from "../dishSuggestionState.js";

test("opens when the input is focused and suggestions exist", () => {
  const result = shouldOpenDishSuggestions({
    hasSelectedDish: false,
    suggestionCount: 3,
    isInputFocused: true,
    isPopoverHovered: false,
  });

  assert.equal(result, true);
});

test("opens when the popover is hovered without input focus", () => {
  const result = shouldOpenDishSuggestions({
    hasSelectedDish: false,
    suggestionCount: 2,
    isInputFocused: false,
    isPopoverHovered: true,
  });

  assert.equal(result, true);
});

test("closes when a dish is selected", () => {
  const result = shouldOpenDishSuggestions({
    hasSelectedDish: true,
    suggestionCount: 5,
    isInputFocused: true,
    isPopoverHovered: true,
  });

  assert.equal(result, false);
});

test("closes when there are no suggestions", () => {
  const result = shouldOpenDishSuggestions({
    hasSelectedDish: false,
    suggestionCount: 0,
    isInputFocused: true,
    isPopoverHovered: true,
  });

  assert.equal(result, false);
});

test("closes when neither the input nor popover are active", () => {
  const result = shouldOpenDishSuggestions({
    hasSelectedDish: false,
    suggestionCount: 4,
    isInputFocused: false,
    isPopoverHovered: false,
  });

  assert.equal(result, false);
});
