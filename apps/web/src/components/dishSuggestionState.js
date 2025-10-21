/**
 * @typedef {Object} DishSuggestionState
 * @property {boolean} hasSelectedDish
 * @property {number} suggestionCount
 * @property {boolean} isInputFocused
 * @property {boolean} isPopoverHovered
 */

/**
 * Determine whether the dish suggestion popover should be visible.
 *
 * The popover is shown when there is no confirmed dish selection, there are
 * suggestions available, and either the input is focused or the user is
 * interacting with the popover content via hover.
 *
 * @param {DishSuggestionState} state
 * @returns {boolean}
 */
export function shouldOpenDishSuggestions(state) {
  const { hasSelectedDish, suggestionCount, isInputFocused, isPopoverHovered } = state;

  if (hasSelectedDish) {
    return false;
  }

  if (suggestionCount === 0) {
    return false;
  }

  return isInputFocused || isPopoverHovered;
}
